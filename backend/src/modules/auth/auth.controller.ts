import type { RequestHandler } from 'express';

import { ApiError } from '../../common/api-error.js';
import type { AccessTokenService } from './access-token.service.js';
import type { AuthRepository } from './auth.repository.js';
import { loginInputSchema } from './auth.schema.js';
import { DUMMY_PASSWORD_HASH, verifyPassword } from './password.js';

const invalidCredentials = () =>
  new ApiError(
    401,
    'INVALID_CREDENTIALS',
    'Email or password is incorrect',
  );

export function loginController(
  repository: AuthRepository,
  tokenService: AccessTokenService,
): RequestHandler {
  return async (request, response) => {
    const input = loginInputSchema.parse(request.body);
    const user = await repository.findUserByEmail(input.email);
    const passwordMatches = await verifyPassword(
      input.password,
      user?.passwordHash ?? DUMMY_PASSWORD_HASH,
    );

    if (!user || !passwordMatches || !user.isActive || user.isLoginLocked) {
      if (user?.isActive && !user.isLoginLocked && !passwordMatches) {
        await repository.recordFailedLogin(user.id);
      }
      throw invalidCredentials();
    }

    const loginAccepted = await repository.recordSuccessfulLogin(
      user.id,
      user.authVersion,
    );
    if (!loginAccepted) {
      throw invalidCredentials();
    }

    const accessToken = await tokenService.issue({
      userId: user.id,
      authVersion: user.authVersion,
    });

    (response.locals as { auditActorUserId?: string }).auditActorUserId = user.id;
    response.json({
      data: {
        accessToken,
        tokenType: 'Bearer',
        expiresIn: tokenService.expiresInSeconds,
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
        },
      },
    });
  };
}
