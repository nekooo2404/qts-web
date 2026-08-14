import { createHmac } from 'node:crypto';

import type { Request, RequestHandler, Response } from 'express';

import { ApiError } from '../../common/api-error.js';
import type { AuthenticationLocals } from '../../middleware/authenticate.js';
import type { AuditRepository } from './audit.repository.js';
import type { AuditEvent, AuditOutcome } from './audit.types.js';

export interface AuditLogger {
  warn(attributes: Record<string, unknown>, message: string): void;
}

interface AuditMiddlewareDependencies {
  repository: AuditRepository;
  ipHashSecret: string;
  logger?: AuditLogger;
}

function isUuid(value: string | undefined): value is string {
  return Boolean(
    value &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(
        value,
      ),
  );
}

function clientIp(request: Request): string {
  return request.ip ?? request.socket.remoteAddress ?? 'unknown';
}

function ipHash(request: Request, secret: string): string {
  return createHmac('sha256', secret).update(clientIp(request)).digest('hex');
}

function statusOutcome(statusCode: number): AuditOutcome {
  if ([401, 403, 429].includes(statusCode)) return 'DENIED';
  if (statusCode >= 400) return 'FAILURE';
  return 'SUCCESS';
}

function resourceFromPath(path: string): {
  resourceType: string;
  resourceId: string | null;
} {
  const segments = path.split('?')[0]?.split('/').filter(Boolean) ?? [];
  const resourceId = segments.find(isUuid) ?? null;
  const knownResources = [
    ['users', 'USER'],
    ['roles', 'ROLE'],
    ['permissions', 'PERMISSION'],
    ['contracts', 'CONTRACT'],
    ['tasks', 'TASK'],
    ['leads', 'LEAD'],
    ['files', 'FILE'],
    ['projects', 'PROJECT'],
    ['solutions', 'SOLUTION'],
    ['metrics', 'METRIC'],
    ['company-profile', 'COMPANY_PROFILE'],
  ] as const;
  const resourceType =
    knownResources.find(([segment]) => segments.includes(segment))?.[1] ??
    'INTERNAL_API';
  return {
    resourceType,
    resourceId,
  };
}

function canonicalAuditPath(path: string): string {
  return path.startsWith('/api/') ? path.slice('/api'.length) : path;
}

function auditPath(request: Request): string {
  return canonicalAuditPath(request.originalUrl.split('?')[0] ?? request.path);
}

function actionFor(request: Request, resourceType: string): string {
  const path = auditPath(request);
  if (
    request.method === 'GET' &&
    /^\/files\/archives\/[^/]+\/download$/u.test(path)
  ) {
    return 'FILE.DOWNLOAD';
  }
  if (path.endsWith('/generate')) return 'CONTRACT.GENERATE';
  if (path.endsWith('/status')) return `${resourceType}.STATUS_CHANGE`;
  if (path.endsWith('/assignee')) return `${resourceType}.ASSIGN`;
  if (
    request.method === 'PUT' &&
    /^\/admin\/users\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/roles$/iu.test(
      path,
    )
  ) {
    return 'USER.ROLES_REPLACE';
  }
  if (
    request.method === 'PUT' &&
    /^\/admin\/roles\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/permissions$/iu.test(
      path,
    )
  ) {
    return 'ROLE.PERMISSIONS_REPLACE';
  }
  const action =
    request.method === 'POST'
      ? 'CREATE'
      : request.method === 'DELETE'
        ? 'ARCHIVE'
        : 'UPDATE';
  return `${resourceType}.${action}`;
}

function persistAfterResponse(
  request: Request,
  response: Response,
  dependencies: AuditMiddlewareDependencies,
  eventFactory: () => AuditEvent | null,
): void {
  response.once('finish', () => {
    const event = eventFactory();
    if (!event) return;
    void dependencies.repository.record(event).catch((error: unknown) => {
      dependencies.logger?.warn(
        {
          event: 'audit_write_failed',
          errorType: error instanceof Error ? error.name : typeof error,
          requestId: response.locals.requestId as string | undefined,
        },
        'audit log write failed',
      );
    });
  });
}

function metadata(
  request: Request,
  secret: string,
  statusCode?: number,
): AuditEvent['metadata'] {
  return {
    method: request.method,
    ...(statusCode === undefined ? {} : { statusCode }),
    ipHash: ipHash(request, secret),
    ipHashAlgorithm: 'HMAC-SHA256',
  };
}

function requestId(response: Response): string | null {
  return (response.locals.requestId as string | undefined) ?? null;
}

function warnAuditFailure(
  dependencies: AuditMiddlewareDependencies,
  response: Response,
  error: unknown,
  phase: 'attempt' | 'result',
): void {
  dependencies.logger?.warn(
    {
      event:
        phase === 'attempt'
          ? 'audit_attempt_write_failed'
          : 'audit_write_failed',
      errorType: error instanceof Error ? error.name : typeof error,
      requestId: response.locals.requestId as string | undefined,
    },
    phase === 'attempt'
      ? 'audit attempt log write failed'
      : 'audit log write failed',
  );
}

export function createInternalAuditMiddleware(
  dependencies: AuditMiddlewareDependencies,
): RequestHandler {
  return async (request, response, next) => {
    const path = auditPath(request);
    const isArchiveDownload =
      request.method === 'GET' &&
      /^\/files\/archives\/[^/]+\/download$/u.test(path);
    if (
      !isArchiveDownload &&
      !['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)
    ) {
      next();
      return;
    }

    const auth = (response.locals as AuthenticationLocals).auth;
    if (!auth) {
      next();
      return;
    }

    const resource = resourceFromPath(path);
    const action = actionFor(request, resource.resourceType);

    try {
      await dependencies.repository.record({
        actorUserId: auth.userId,
        action,
        resourceType: resource.resourceType,
        resourceId: resource.resourceId,
        outcome: 'ATTEMPT',
        requestId: requestId(response),
        metadata: metadata(request, dependencies.ipHashSecret),
      });
    } catch (error: unknown) {
      warnAuditFailure(dependencies, response, error, 'attempt');
      next(
        new ApiError(
          503,
          'AUDIT_UNAVAILABLE',
          'The security audit service is temporarily unavailable',
        ),
      );
      return;
    }

    persistAfterResponse(request, response, dependencies, () => {
      const outcome = statusOutcome(response.statusCode);
      if (
        outcome === 'SUCCESS' &&
        ['USER', 'ROLE', 'PERMISSION'].includes(resource.resourceType)
      ) {
        return null;
      }
      return {
        actorUserId: auth.userId,
        action,
        resourceType: resource.resourceType,
        resourceId: resource.resourceId,
        outcome,
        requestId: requestId(response),
        metadata: metadata(
          request,
          dependencies.ipHashSecret,
          response.statusCode,
        ),
      };
    });
    next();
  };
}

export function createLoginAuditMiddleware(
  dependencies: AuditMiddlewareDependencies,
): RequestHandler {
  return async (request, response, next) => {
    try {
      await dependencies.repository.record({
        actorUserId: null,
        action: 'AUTH.LOGIN',
        resourceType: 'AUTHENTICATION',
        resourceId: null,
        outcome: 'ATTEMPT',
        requestId: requestId(response),
        metadata: metadata(request, dependencies.ipHashSecret),
      });
    } catch (error: unknown) {
      warnAuditFailure(dependencies, response, error, 'attempt');
      next(
        new ApiError(
          503,
          'AUDIT_UNAVAILABLE',
          'The security audit service is temporarily unavailable',
        ),
      );
      return;
    }

    persistAfterResponse(request, response, dependencies, () => ({
      actorUserId:
        (response.locals as { auditActorUserId?: string }).auditActorUserId ??
        null,
      action: 'AUTH.LOGIN',
      resourceType: 'AUTHENTICATION',
      resourceId: null,
      outcome: statusOutcome(response.statusCode),
      requestId: requestId(response),
      metadata: metadata(
        request,
        dependencies.ipHashSecret,
        response.statusCode,
      ),
    }));
    next();
  };
}
