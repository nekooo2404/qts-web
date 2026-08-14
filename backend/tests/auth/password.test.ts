import { describe, expect, it } from 'vitest';

import {
  hashPassword,
  verifyPassword,
} from '../../src/modules/auth/password.js';

describe('password hashing', () => {
  it('uses a versioned scrypt format with a unique random salt', async () => {
    const first = await hashPassword('QTS-Strong-Passphrase-2026!');
    const second = await hashPassword('QTS-Strong-Passphrase-2026!');

    expect(first).toMatch(/^scrypt\$v1\$16384\$8\$1\$[A-Za-z0-9_-]+\$[A-Za-z0-9_-]+$/u);
    expect(second).not.toBe(first);
    await expect(verifyPassword('QTS-Strong-Passphrase-2026!', first)).resolves.toBe(
      true,
    );
  });

  it('rejects an incorrect password', async () => {
    const encoded = await hashPassword('Correct-Horse-Battery-Staple!');

    await expect(verifyPassword('wrong-password', encoded)).resolves.toBe(false);
  });

  it.each([
    'not-a-password-hash',
    'scrypt$v2$16384$8$1$c2FsdA$aGFzaA',
    'scrypt$v1$999999999$8$1$c2FsdA$aGFzaA',
    'scrypt$v1$16384$8$1$***$aGFzaA',
  ])('fails closed for malformed or unsupported hash %s', async (encoded) => {
    await expect(verifyPassword('password', encoded)).resolves.toBe(false);
  });
});
