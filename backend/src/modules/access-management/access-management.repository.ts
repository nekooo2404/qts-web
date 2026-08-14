import type { PaginationResult } from '../../common/pagination.js';
import type {
  CreatePermissionInput,
  CreateRoleInput,
  CreateUserInput,
  ManagedPermission,
  ManagedRole,
  ManagedUser,
  UpdatePermissionInput,
  UpdateRoleInput,
  UpdateUserInput,
  UserListQuery,
} from './access-management.types.js';

export interface AccessManagementRepository {
  listUsers(query: UserListQuery): Promise<PaginationResult<ManagedUser>>;
  findUserById(id: string): Promise<ManagedUser | null>;
  createUser(
    input: CreateUserInput,
    passwordHash: string,
    roleIds: string[],
    actorId: string,
  ): Promise<ManagedUser>;
  updateUser(id: string, input: UpdateUserInput, actorId: string): Promise<ManagedUser | null>;
  deactivateUser(id: string, actorId: string): Promise<boolean>;
  replaceUserRoles(id: string, roleIds: string[], actorId: string): Promise<boolean>;
  listRoles(): Promise<ManagedRole[]>;
  findRoleById(id: string): Promise<ManagedRole | null>;
  createRole(
    input: CreateRoleInput,
    permissionIds: string[],
    actorId: string,
  ): Promise<ManagedRole>;
  updateRole(id: string, input: UpdateRoleInput, actorId: string): Promise<ManagedRole | null>;
  deleteRole(id: string, actorId: string): Promise<boolean>;
  listPermissions(): Promise<ManagedPermission[]>;
  findPermissionById(id: string): Promise<ManagedPermission | null>;
  createPermission(input: CreatePermissionInput, actorId: string): Promise<ManagedPermission>;
  updatePermission(
    id: string,
    input: UpdatePermissionInput,
    actorId: string,
  ): Promise<ManagedPermission | null>;
  deletePermission(id: string, actorId: string): Promise<boolean>;
  replaceRolePermissions(
    id: string,
    permissionIds: string[],
    actorId: string,
  ): Promise<boolean>;
}
