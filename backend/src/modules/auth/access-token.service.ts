import { jwtVerify, SignJWT } from 'jose';
import { z } from 'zod';

export interface AccessTokenIdentity {
  userId: string;
  authVersion: number;
}

export interface AccessTokenService {
  readonly expiresInSeconds: number;
  issue(identity: AccessTokenIdentity): Promise<string>;
  verify(token: string): Promise<AccessTokenIdentity>;
}

export interface AccessTokenOptions {
  secret: string;
  issuer: string;
  audience: string;
  expiresInSeconds: number;
}

const identitySchema = z.object({
  userId: z.string().uuid(),
  authVersion: z.number().int().nonnegative(),
});

const optionsSchema = z.object({
  secret: z.string().refine(
    (value) => Buffer.byteLength(value, 'utf8') >= 32,
    'JWT secret must be at least 32 bytes',
  ),
  issuer: z.string().trim().min(1),
  audience: z.string().trim().min(1),
  expiresInSeconds: z.number().int().positive().max(86_400),
});

export function createAccessTokenService(
  rawOptions: AccessTokenOptions,
): AccessTokenService {
  const options = optionsSchema.parse(rawOptions);
  const key = new TextEncoder().encode(options.secret);

  return {
    expiresInSeconds: options.expiresInSeconds,

    async issue(rawIdentity) {
      const identity = identitySchema.parse(rawIdentity);

      return new SignJWT({ authVersion: identity.authVersion })
        .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
        .setSubject(identity.userId)
        .setIssuer(options.issuer)
        .setAudience(options.audience)
        .setIssuedAt()
        .setExpirationTime(`${options.expiresInSeconds}s`)
        .sign(key);
    },

    async verify(token) {
      const { payload } = await jwtVerify(token, key, {
        algorithms: ['HS256'],
        issuer: options.issuer,
        audience: options.audience,
        requiredClaims: ['sub', 'iat', 'exp', 'authVersion'],
      });

      const parsed = identitySchema.safeParse({
        userId: payload.sub,
        authVersion: payload.authVersion,
      });
      if (!parsed.success) throw new Error('invalid token claims');

      return parsed.data;
    },
  };
}
