import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

const FORMAT_NAME = 'scrypt';
const FORMAT_VERSION = 'v1';
const COST = 16_384;
const BLOCK_SIZE = 8;
const PARALLELIZATION = 1;
const SALT_LENGTH = 16;
const KEY_LENGTH = 64;
const MAX_MEMORY = 64 * 1024 * 1024;
const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/u;

interface ParsedPasswordHash {
  salt: Buffer;
  derivedKey: Buffer;
}

function decodeBase64Url(value: string, expectedLength: number): Buffer | null {
  if (!BASE64URL_PATTERN.test(value)) return null;

  const decoded = Buffer.from(value, 'base64url');
  if (
    decoded.length !== expectedLength ||
    decoded.toString('base64url') !== value
  ) {
    return null;
  }

  return decoded;
}

function parsePasswordHash(encoded: string): ParsedPasswordHash | null {
  const parts = encoded.split('$');
  if (parts.length !== 7) return null;

  const [name, version, cost, blockSize, parallelization, saltPart, keyPart] =
    parts;
  if (
    name !== FORMAT_NAME ||
    version !== FORMAT_VERSION ||
    cost !== String(COST) ||
    blockSize !== String(BLOCK_SIZE) ||
    parallelization !== String(PARALLELIZATION) ||
    saltPart === undefined ||
    keyPart === undefined
  ) {
    return null;
  }

  const salt = decodeBase64Url(saltPart, SALT_LENGTH);
  const derivedKey = decodeBase64Url(keyPart, KEY_LENGTH);
  return salt && derivedKey ? { salt, derivedKey } : null;
}

async function deriveKey(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, KEY_LENGTH, {
      N: COST,
      r: BLOCK_SIZE,
      p: PARALLELIZATION,
      maxmem: MAX_MEMORY,
    }, (error, derivedKey) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(derivedKey);
    });
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const derivedKey = await deriveKey(password, salt);

  return [
    FORMAT_NAME,
    FORMAT_VERSION,
    COST,
    BLOCK_SIZE,
    PARALLELIZATION,
    salt.toString('base64url'),
    derivedKey.toString('base64url'),
  ].join('$');
}

export async function verifyPassword(
  password: string,
  encoded: string,
): Promise<boolean> {
  const parsed = parsePasswordHash(encoded);
  if (!parsed) return false;

  const candidateKey = await deriveKey(password, parsed.salt);
  return timingSafeEqual(candidateKey, parsed.derivedKey);
}

export const DUMMY_PASSWORD_HASH = [
  FORMAT_NAME,
  FORMAT_VERSION,
  COST,
  BLOCK_SIZE,
  PARALLELIZATION,
  Buffer.alloc(SALT_LENGTH).toString('base64url'),
  Buffer.alloc(KEY_LENGTH).toString('base64url'),
].join('$');
