import type { RequestHandler } from 'express';

import { ApiError } from '../common/api-error.js';
import type { AccessTokenService } from '../modules/auth/access-token.service.js';
import type { AuthRepository } from '../modules/auth/auth.repository.js';

export interface AuthenticatedUser {
  userId: string;
  email: string;
  displayName: string;
  authVersion: number;
  permissions: ReadonlySet<string>;
}

export interface AuthenticationLocals {
  auth?: AuthenticatedUser;
}

export interface AuthenticateDependencies {
  repository: AuthRepository;
  tokenService: AccessTokenService;
}

const unauthenticated = () =>
  new ApiError(
    401,
    'UNAUTHENTICATED',
    'A valid access token is required',
  );

function readBearerToken(authorization: string | undefined): string | null {
  if (authorization === undefined) return null;
  const match = /^Bearer ([^\s]+)$/u.exec(authorization);
  return match?.[1] ?? null;
}

export function authenticate(
  dependencies: AuthenticateDependencies,
): RequestHandler {
  return async (request, response, next) => {
    const token = readBearerToken(request.get('authorization'));
    if (!token) {
      next(unauthenticated());
      return;
    }

    let identity;
    try {
      identity = await dependencies.tokenService.verify(token);
    } catch {
      next(unauthenticated());
      return;
    }

    const user = await dependencies.repository.findUserAuthorizationById(
      identity.userId,
    );
    if (
      !user ||
      !user.isActive ||
      user.authVersion !== identity.authVersion
    ) {
      next(unauthenticated());
      return;
    }

    const auth: AuthenticatedUser = {
      userId: user.id,
      email: user.email,
      displayName: user.displayName,
      authVersion: user.authVersion,
      permissions: new Set(user.permissions),
    };
    (response.locals as AuthenticationLocals).auth = auth;
    next();
  };
}

export function getAuthenticatedUser(
  locals: AuthenticationLocals,
): AuthenticatedUser {
  if (!locals.auth) throw unauthenticated();
  return locals.auth;
}

export {
  authorize,
  requireAllPermissions,
  requireAnyPermission,
  requirePermission,
  type PermissionRequirement,
} from './authorize.js';
