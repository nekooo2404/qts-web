import { decodeProtectedHeader, SignJWT } from 'jose';
import { describe, expect, it } from 'vitest';

import { createAccessTokenService } from '../../src/modules/auth/access-token.service.js';

const tokenOptions = {
  secret: 'test-secret-that-is-at-least-thirty-two-bytes-long',
  issuer: 'qts-internal-api',
  audience: 'qts-internal-portal',
  expiresInSeconds: 900,
};

describe('access token service', () => {
  it('issues and verifies an HS256 token with immutable identity claims', async () => {
    const service = createAccessTokenService(tokenOptions);

    const token = await service.issue({
      userId: '0e00e7a5-c3e4-4187-af18-8dc38a8128bf',
      authVersion: 7,
    });

    expect(decodeProtectedHeader(token).alg).toBe('HS256');
    await expect(service.verify(token)).resolves.toEqual({
      userId: '0e00e7a5-c3e4-4187-af18-8dc38a8128bf',
      authVersion: 7,
    });
  });

  it('rejects a token with the wrong issuer or audience', async () => {
    const service = createAccessTokenService(tokenOptions);
    const secret = new TextEncoder().encode(tokenOptions.secret);
    const forged = await new SignJWT({ authVersion: 7 })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('0e00e7a5-c3e4-4187-af18-8dc38a8128bf')
      .setIssuer('another-service')
      .setAudience(tokenOptions.audience)
      .setIssuedAt()
      .setExpirationTime('15m')
      .sign(secret);

    await expect(service.verify(forged)).rejects.toThrow();
  });

  it('rejects a token without a valid authVersion claim', async () => {
    const service = createAccessTokenService(tokenOptions);
    const secret = new TextEncoder().encode(tokenOptions.secret);
    const malformed = await new SignJWT({ authVersion: -1 })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('0e00e7a5-c3e4-4187-af18-8dc38a8128bf')
      .setIssuer(tokenOptions.issuer)
      .setAudience(tokenOptions.audience)
      .setIssuedAt()
      .setExpirationTime('15m')
      .sign(secret);

    await expect(service.verify(malformed)).rejects.toThrow('invalid token claims');
  });
});
