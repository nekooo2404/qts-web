export const userStatuses = ['ACTIVE', 'SUSPENDED', 'DISABLED'] as const;
export type UserStatus = (typeof userStatuses)[number];

export interface ManagedUser {
  id: string;
  email: string;
  fullName: string;
  employeeCode: string;
  department: string | null;
  jobTitle: string | null;
  status: UserStatus;
  authVersion: number;
  roles: Array<{ id: string; code: string; name: string }>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ManagedRole {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissions: Array<{ id: string; code: string; name: string }>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ManagedPermission {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserListQuery {
  page: number;
  pageSize: number;
  status?: UserStatus | undefined;
  search?: string | undefined;
}

export interface CreateUserInput {
  email: string;
  fullName: string;
  employeeCode: string;
  department?: string | null | undefined;
  jobTitle?: string | null | undefined;
  status?: UserStatus | undefined;
}

export interface UpdateUserInput {
  email?: string | undefined;
  fullName?: string | undefined;
  employeeCode?: string | undefined;
  department?: string | null | undefined;
  jobTitle?: string | null | undefined;
  status?: UserStatus | undefined;
  passwordHash?: string | undefined;
}

export interface CreateRoleInput {
  code: string;
  name: string;
  description?: string | null | undefined;
}

export interface UpdateRoleInput {
  name?: string | undefined;
  description?: string | null | undefined;
}

export interface CreatePermissionInput {
  code: string;
  name: string;
  description?: string | null | undefined;
}

export interface UpdatePermissionInput {
  name?: string | undefined;
  description?: string | null | undefined;
}
