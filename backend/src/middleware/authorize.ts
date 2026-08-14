import type { RequestHandler } from 'express';

import { ApiError } from '../common/api-error.js';
import type { AuthenticationLocals } from './authenticate.js';

export interface PermissionRequirement {
  allOf?: readonly string[];
  anyOf?: readonly string[];
}

const unauthenticated = () =>
  new ApiError(401, 'UNAUTHENTICATED', 'A valid access token is required');

const forbidden = () =>
  new ApiError(
    403,
    'FORBIDDEN',
    'You do not have permission to perform this action',
  );

function uniquePermissions(
  permissions: readonly string[] | undefined,
): readonly string[] {
  return [...new Set(permissions ?? [])];
}

function validateRequirement(
  allOf: readonly string[],
  anyOf: readonly string[],
): void {
  const permissions = [...allOf, ...anyOf];
  if (permissions.length === 0) {
    throw new TypeError('At least one permission is required');
  }
  if (permissions.some((permission) => permission.trim() === '')) {
    throw new TypeError('Permission codes must not be empty');
  }
}

export function authorize(requirement: PermissionRequirement): RequestHandler {
  const allOf = uniquePermissions(requirement.allOf);
  const anyOf = uniquePermissions(requirement.anyOf);
  validateRequirement(allOf, anyOf);

  return (_request, response, next) => {
    const actor = (response.locals as AuthenticationLocals).auth;
    if (!actor) {
      next(unauthenticated());
      return;
    }

    const hasAll = allOf.every((permission) =>
      actor.permissions.has(permission),
    );
    const hasAny =
      anyOf.length === 0 ||
      anyOf.some((permission) => actor.permissions.has(permission));
    if (!hasAll || !hasAny) {
      next(forbidden());
      return;
    }

    next();
  };
}

export function requirePermission(permission: string): RequestHandler {
  return authorize({ allOf: [permission] });
}

export function requireAllPermissions(
  ...permissions: readonly string[]
): RequestHandler {
  return authorize({ allOf: permissions });
}

export function requireAnyPermission(
  ...permissions: readonly string[]
): RequestHandler {
  return authorize({ anyOf: permissions });
}
