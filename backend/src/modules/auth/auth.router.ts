import { Router, type RequestHandler } from 'express';

import type { AccessTokenService } from './access-token.service.js';
import { loginController } from './auth.controller.js';
import type { AuthRepository } from './auth.repository.js';

export interface AuthRouterDependencies {
  repository: AuthRepository;
  tokenService: AccessTokenService;
  loginMiddleware?: readonly RequestHandler[];
}

export function createAuthRouter(dependencies: AuthRouterDependencies): Router {
  const router = Router();
  router.post(
    '/login',
    ...(dependencies.loginMiddleware ?? []),
    loginController(dependencies.repository, dependencies.tokenService),
  );
  return router;
}
