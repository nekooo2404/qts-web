export interface LoginUserRecord {
  id: string;
  email: string;
  displayName: string;
  passwordHash: string;
  authVersion: number;
  isActive: boolean;
  isLoginLocked: boolean;
}

export interface AuthenticatedUserRecord {
  id: string;
  email: string;
  displayName: string;
  authVersion: number;
  isActive: boolean;
  permissions: readonly string[];
}

export interface AuthRepository {
  findUserByEmail(email: string): Promise<LoginUserRecord | null>;
  recordFailedLogin(userId: string): Promise<void>;
  recordSuccessfulLogin(
    userId: string,
    expectedAuthVersion: number,
  ): Promise<boolean>;
  findUserAuthorizationById(
    userId: string,
  ): Promise<AuthenticatedUserRecord | null>;
}
