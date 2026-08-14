import type { Request, RequestHandler, Response } from 'express';

import { ApiError } from '../../common/api-error.js';
import { omitUndefined } from '../../common/omit-undefined.js';
import { toPaginatedResponse } from '../../common/pagination.js';
import { LastActiveAdministratorError } from './access-management.errors.js';
import type { AccessManagementRepository } from './access-management.repository.js';
import {
  createPermissionSchema,
  createRoleSchema,
  createUserSchema,
  entityIdSchema,
  replaceRolePermissionsSchema,
  replaceUserRolesSchema,
  updatePermissionSchema,
  updateRoleSchema,
  updateUserSchema,
  userListQuerySchema,
} from './access-management.schema.js';

type ActorProvider = (request: Request, response: Response) => string;
type PasswordHasher = (password: string) => Promise<string>;

async function preserveActiveAdministrator<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof LastActiveAdministratorError) {
      throw new ApiError(
        409,
        'LAST_ACTIVE_ADMIN_REQUIRED',
        'At least one active administrator must retain user and role management permissions',
      );
    }
    throw error;
  }
}

function serializeDates<T extends { createdAt: Date; updatedAt: Date }>(entity: T) {
  return {
    ...entity,
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.updatedAt.toISOString(),
  };
}

export function listUsersController(repository: AccessManagementRepository): RequestHandler {
  return async (request, response) => {
    const result = await repository.listUsers(userListQuerySchema.parse(request.query));
    response.json(
      toPaginatedResponse({ ...result, items: result.items.map(serializeDates) }),
    );
  };
}

export function getUserController(repository: AccessManagementRepository): RequestHandler {
  return async (request, response) => {
    const user = await repository.findUserById(entityIdSchema.parse(request.params.id));
    if (!user) throw new ApiError(404, 'USER_NOT_FOUND', 'User was not found');
    response.json({ data: serializeDates(user) });
  };
}

export function createUserController(
  repository: AccessManagementRepository,
  hashPassword: PasswordHasher,
  getActorId: ActorProvider,
): RequestHandler {
  return async (request, response) => {
    const { password, roleIds, ...input } = createUserSchema.parse(request.body);
    const passwordHash = await hashPassword(password);
    const user = await repository.createUser(
      input,
      passwordHash,
      roleIds,
      getActorId(request, response),
    );
    response.status(201).json({ data: serializeDates(user) });
  };
}

export function updateUserController(
  repository: AccessManagementRepository,
  hashPassword: PasswordHasher,
  getActorId: ActorProvider,
): RequestHandler {
  return async (request, response) => {
    const id = entityIdSchema.parse(request.params.id);
    const { password, ...rawInput } = updateUserSchema.parse(request.body);
    const input = omitUndefined(rawInput);
    const currentActorId = getActorId(request, response);
    if (id === currentActorId && input.status && input.status !== 'ACTIVE') {
      throw new ApiError(409, 'SELF_DEACTIVATION_FORBIDDEN', 'You cannot deactivate yourself');
    }
    const passwordHash = password ? await hashPassword(password) : undefined;
    const user = await preserveActiveAdministrator(() =>
      repository.updateUser(
        id,
        { ...input, ...(passwordHash ? { passwordHash } : {}) },
        currentActorId,
      ),
    );
    if (!user) throw new ApiError(404, 'USER_NOT_FOUND', 'User was not found');
    response.json({ data: serializeDates(user) });
  };
}

export function deleteUserController(
  repository: AccessManagementRepository,
  getActorId: ActorProvider,
): RequestHandler {
  return async (request, response) => {
    const id = entityIdSchema.parse(request.params.id);
    if (id === getActorId(request, response)) {
      throw new ApiError(409, 'SELF_DEACTIVATION_FORBIDDEN', 'You cannot deactivate yourself');
    }
    if (
      !(await preserveActiveAdministrator(() =>
        repository.deactivateUser(id, getActorId(request, response)),
      ))
    ) {
      throw new ApiError(404, 'USER_NOT_FOUND', 'User was not found');
    }
    response.status(204).send();
  };
}

export function replaceUserRolesController(
  repository: AccessManagementRepository,
  getActorId: ActorProvider,
): RequestHandler {
  return async (request, response) => {
    const id = entityIdSchema.parse(request.params.id);
    const { roleIds } = replaceUserRolesSchema.parse(request.body);
    const currentActorId = getActorId(request, response);
    if (id === currentActorId) {
      throw new ApiError(409, 'SELF_ROLE_CHANGE_FORBIDDEN', 'You cannot change your own roles');
    }
    if (
      !(await preserveActiveAdministrator(() =>
        repository.replaceUserRoles(id, roleIds, currentActorId),
      ))
    ) {
      throw new ApiError(404, 'USER_NOT_FOUND', 'User was not found');
    }
    response.status(204).send();
  };
}

export function listRolesController(repository: AccessManagementRepository): RequestHandler {
  return async (_request, response) => {
    const roles = await repository.listRoles();
    response.json({ data: roles.map(serializeDates) });
  };
}

export function getRoleController(repository: AccessManagementRepository): RequestHandler {
  return async (request, response) => {
    const role = await repository.findRoleById(
      entityIdSchema.parse(request.params.id),
    );
    if (!role) throw new ApiError(404, 'ROLE_NOT_FOUND', 'Role was not found');
    response.json({ data: serializeDates(role) });
  };
}

export function createRoleController(
  repository: AccessManagementRepository,
  getActorId: ActorProvider,
): RequestHandler {
  return async (request, response) => {
    const { permissionIds, ...input } = createRoleSchema.parse(request.body);
    const role = await repository.createRole(
      input,
      permissionIds,
      getActorId(request, response),
    );
    response.status(201).json({ data: serializeDates(role) });
  };
}

export function updateRoleController(
  repository: AccessManagementRepository,
  getActorId: ActorProvider,
): RequestHandler {
  return async (request, response) => {
    const role = await repository.updateRole(
      entityIdSchema.parse(request.params.id),
      omitUndefined(updateRoleSchema.parse(request.body)),
      getActorId(request, response),
    );
    if (!role) {
      throw new ApiError(404, 'ROLE_NOT_FOUND', 'Role was not found or is system-owned');
    }
    response.json({ data: serializeDates(role) });
  };
}

export function deleteRoleController(
  repository: AccessManagementRepository,
  getActorId: ActorProvider,
): RequestHandler {
  return async (request, response) => {
    if (
      !(await preserveActiveAdministrator(() =>
        repository.deleteRole(
          entityIdSchema.parse(request.params.id),
          getActorId(request, response),
        ),
      ))
    ) {
      throw new ApiError(404, 'ROLE_NOT_FOUND', 'Role was not found or is system-owned');
    }
    response.status(204).send();
  };
}

export function replaceRolePermissionsController(
  repository: AccessManagementRepository,
  getActorId: ActorProvider,
): RequestHandler {
  return async (request, response) => {
    const id = entityIdSchema.parse(request.params.id);
    const { permissionIds } = replaceRolePermissionsSchema.parse(request.body);
    if (
      !(await preserveActiveAdministrator(() =>
        repository.replaceRolePermissions(
          id,
          permissionIds,
          getActorId(request, response),
        ),
      ))
    ) {
      throw new ApiError(404, 'ROLE_NOT_FOUND', 'Role was not found or is system-owned');
    }
    response.status(204).send();
  };
}

export function listPermissionsController(
  repository: AccessManagementRepository,
): RequestHandler {
  return async (_request, response) => {
    const permissions = await repository.listPermissions();
    response.json({ data: permissions.map(serializeDates) });
  };
}

export function getPermissionController(
  repository: AccessManagementRepository,
): RequestHandler {
  return async (request, response) => {
    const permission = await repository.findPermissionById(
      entityIdSchema.parse(request.params.id),
    );
    if (!permission) {
      throw new ApiError(404, 'PERMISSION_NOT_FOUND', 'Permission was not found');
    }
    response.json({ data: serializeDates(permission) });
  };
}

export function createPermissionController(
  repository: AccessManagementRepository,
  getActorId: ActorProvider,
): RequestHandler {
  return async (request, response) => {
    const permission = await repository.createPermission(
      createPermissionSchema.parse(request.body),
      getActorId(request, response),
    );
    response.status(201).json({ data: serializeDates(permission) });
  };
}

export function updatePermissionController(
  repository: AccessManagementRepository,
  getActorId: ActorProvider,
): RequestHandler {
  return async (request, response) => {
    const permission = await repository.updatePermission(
      entityIdSchema.parse(request.params.id),
      omitUndefined(updatePermissionSchema.parse(request.body)),
      getActorId(request, response),
    );
    if (!permission) {
      throw new ApiError(
        404,
        'PERMISSION_NOT_FOUND',
        'Permission was not found or is system-owned',
      );
    }
    response.json({ data: serializeDates(permission) });
  };
}

export function deletePermissionController(
  repository: AccessManagementRepository,
  getActorId: ActorProvider,
): RequestHandler {
  return async (request, response) => {
    if (
      !(await repository.deletePermission(
        entityIdSchema.parse(request.params.id),
        getActorId(request, response),
      ))
    ) {
      throw new ApiError(
        404,
        'PERMISSION_NOT_FOUND',
        'Permission was not found or is system-owned',
      );
    }
    response.status(204).send();
  };
}
