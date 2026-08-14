import cors from 'cors';
import express, { type Express, type RequestHandler } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import type { Logger } from 'pino';
import { pinoHttp } from 'pino-http';

import { ApiError } from './common/api-error.js';
import { requestContext } from './common/request-context.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { createAuthRouter } from './modules/auth/auth.router.js';
import { createLoginAuditMiddleware } from './modules/audit/audit.middleware.js';
import { createContactController } from './modules/contact/contact.controller.js';
import type { ContactLeadRepository } from './modules/contact/contact.repository.js';
import {
  createInternalPortalRouter,
  type InternalPortalDependencies,
} from './modules/internal-portal/internal-portal.router.js';
import {
  getProjectController,
  listProjectsController,
} from './modules/projects/project.controller.js';
import type { ProjectRepository } from './modules/projects/project.repository.js';
import {
  getCompanyInfoController,
  listCapabilitiesController,
  listMetricsController,
  listSolutionsController,
} from './modules/public-content/public-content.controller.js';
import type { PublicContentRepository } from './modules/public-content/public-content.repository.js';

export interface AppDependencies {
  contactRepository: ContactLeadRepository;
  projectRepository: ProjectRepository;
  publicContentRepository: PublicContentRepository;
  allowedOrigins?: string[];
  contactRateLimit?: boolean;
  enableRequestLogging?: boolean;
  trustProxy?: number | string;
  logger?: Logger;
  healthCheck?: () => Promise<void>;
  internalPortal?: InternalPortalDependencies & { loginRateLimit?: boolean };
}

const requireJson: RequestHandler = (request, _response, next) => {
  if (!request.is('application/json')) {
    next(
      new ApiError(
        415,
        'UNSUPPORTED_MEDIA_TYPE',
        'Content-Type must be application/json',
      ),
    );
    return;
  }
  next();
};

function recordValue(value: unknown, key: string): unknown {
  return typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)[key]
    : undefined;
}

function serializeRequest(request: unknown) {
  const rawUrl = recordValue(request, 'url');
  return {
    method: recordValue(request, 'method'),
    path: typeof rawUrl === 'string' ? rawUrl.split('?')[0] : undefined,
  };
}

function serializeResponse(response: unknown) {
  return { statusCode: recordValue(response, 'statusCode') };
}

export function createApp(dependencies: AppDependencies): Express {
  const app = express();

  app.disable('x-powered-by');
  if (dependencies.trustProxy !== undefined) {
    app.set('trust proxy', dependencies.trustProxy);
  }
  app.use(requestContext);
  if (dependencies.enableRequestLogging !== false && dependencies.logger) {
    app.use(
      pinoHttp({
        logger: dependencies.logger,
        customProps: (_request, response) => ({
          requestId: response.locals.requestId as string,
        }),
        serializers: {
          req: serializeRequest,
          res: serializeResponse,
        },
      }),
    );
  }
  app.use(helmet());
  app.use(
    cors({
      origin: dependencies.allowedOrigins ?? [],
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Authorization', 'Content-Type', 'X-Request-Id'],
      maxAge: 86400,
    }),
  );
  app.use(express.json({ limit: '16kb', strict: true }));

  app.get(['/health', '/health/live'], (_request, response) => {
    response.json({ status: 'ok' });
  });
  app.get('/health/ready', async (_request, response) => {
    if (dependencies.healthCheck) {
      try {
        await dependencies.healthCheck();
      } catch {
        throw new ApiError(503, 'NOT_READY', 'Service is not ready');
      }
    }
    response.json({ status: 'ready' });
  });

  const contactLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_request, response, _next, options) => {
      response.status(options.statusCode).json({
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many contact requests. Please try again later',
        },
        requestId: response.locals.requestId as string,
      });
    },
  });
  const contactMiddleware =
    dependencies.contactRateLimit === false ? [] : [contactLimiter];

  if (dependencies.internalPortal) {
    const loginLimiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 10,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      handler: (_request, response, _next, options) => {
        response.status(options.statusCode).json({
          error: {
            code: 'RATE_LIMITED',
            message: 'Too many login attempts. Please try again later',
          },
          requestId: response.locals.requestId as string,
        });
      },
    });
    app.use(
      '/api/auth',
      createAuthRouter({
        repository: dependencies.internalPortal.authRepository,
        tokenService: dependencies.internalPortal.tokenService,
        loginMiddleware: [
          ...(dependencies.internalPortal.loginRateLimit === false
            ? []
            : [loginLimiter]),
          ...(dependencies.internalPortal.auditRepository &&
          dependencies.internalPortal.auditIpHashSecret
            ? [
                createLoginAuditMiddleware({
                  repository: dependencies.internalPortal.auditRepository,
                  ipHashSecret: dependencies.internalPortal.auditIpHashSecret,
                  ...(dependencies.logger ? { logger: dependencies.logger } : {}),
                }),
              ]
            : []),
          requireJson,
        ],
      }),
    );
    app.use(
      '/api',
      createInternalPortalRouter({
        ...dependencies.internalPortal,
        ...(dependencies.logger ? { auditLogger: dependencies.logger } : {}),
      }),
    );
  }

  app.post(
    '/api/contact',
    ...contactMiddleware,
    requireJson,
    createContactController(dependencies.contactRepository),
  );
  app.get('/api/projects', listProjectsController(dependencies.projectRepository));
  app.get('/api/projects/:id', getProjectController(dependencies.projectRepository));
  app.get(
    '/api/capabilities',
    listCapabilitiesController(dependencies.publicContentRepository),
  );
  app.get(
    '/api/solutions',
    listSolutionsController(dependencies.publicContentRepository),
  );
  app.get(
    '/api/metrics',
    listMetricsController(dependencies.publicContentRepository),
  );
  app.get(
    '/api/company-info',
    getCompanyInfoController(dependencies.publicContentRepository),
  );

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
