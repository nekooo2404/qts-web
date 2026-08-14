import { z } from 'zod';

import type { ContractDataValue } from './document-generation.types.js';

const FORBIDDEN_KEYS = new Set(['__proto__', 'prototype', 'constructor']);
const MAX_DEPTH = 5;
const MAX_NODES = 1000;
const MAX_OBJECT_KEYS = 100;
const MAX_ARRAY_ITEMS = 100;
const MAX_STRING_LENGTH = 8_000;
const MAX_SERIALIZED_DATA_BYTES = 12 * 1024;

function validateContractData(
  value: unknown,
  context: z.RefinementCtx,
  path: (string | number)[],
  depth: number,
  state: { nodes: number },
): value is ContractDataValue {
  state.nodes += 1;
  if (state.nodes > MAX_NODES) {
    context.addIssue({
      code: 'custom',
      message: 'Contract data is too complex',
      path,
    });
    return false;
  }
  if (depth > MAX_DEPTH) {
    context.addIssue({
      code: 'custom',
      message: 'Contract data is nested too deeply',
      path,
    });
    return false;
  }
  if (value === null || typeof value === 'boolean') return true;
  if (typeof value === 'string') {
    if (value.length <= MAX_STRING_LENGTH) return true;
    context.addIssue({
      code: 'too_big',
      origin: 'string',
      maximum: MAX_STRING_LENGTH,
      inclusive: true,
      message: 'Contract data string is too long',
      path,
    });
    return false;
  }
  if (typeof value === 'number') {
    if (Number.isFinite(value)) return true;
    context.addIssue({
      code: 'custom',
      message: 'Contract data number must be finite',
      path,
    });
    return false;
  }
  if (Array.isArray(value)) {
    if (value.length > MAX_ARRAY_ITEMS) {
      context.addIssue({
        code: 'too_big',
        origin: 'array',
        maximum: MAX_ARRAY_ITEMS,
        inclusive: true,
        message: 'Contract data array has too many items',
        path,
      });
      return false;
    }
    let valid = true;
    value.forEach((item, index) => {
      valid =
        validateContractData(item, context, [...path, index], depth + 1, state) &&
        valid;
    });
    return valid;
  }
  if (typeof value === 'object') {
    const prototype = Reflect.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      context.addIssue({
        code: 'custom',
        message: 'Contract data object is invalid',
        path,
      });
      return false;
    }
    const entries = Object.entries(value);
    if (entries.length > MAX_OBJECT_KEYS) {
      context.addIssue({
        code: 'too_big',
        origin: 'object',
        maximum: MAX_OBJECT_KEYS,
        inclusive: true,
        message: 'Contract data object has too many fields',
        path,
      });
      return false;
    }
    let valid = true;
    for (const [key, child] of entries) {
      if (key.length === 0 || key.length > 100 || FORBIDDEN_KEYS.has(key)) {
        context.addIssue({
          code: 'custom',
          message: 'Contract data field name is invalid',
          path: [...path, key],
        });
        valid = false;
        continue;
      }
      valid =
        validateContractData(child, context, [...path, key], depth + 1, state) &&
        valid;
    }
    return valid;
  }

  context.addIssue({
    code: 'custom',
    message: 'Contract data contains an unsupported value',
    path,
  });
  return false;
}

export const generateContractDocumentSchema = z
  .object({
    templateId: z.string().uuid(),
    data: z.record(z.string(), z.unknown()).superRefine((value, context) => {
      validateContractData(value, context, [], 0, { nodes: 0 });
      if (Buffer.byteLength(JSON.stringify(value), 'utf8') > MAX_SERIALIZED_DATA_BYTES) {
        context.addIssue({
          code: 'custom',
          message: 'Contract data exceeds the request size limit',
        });
      }
    }),
  })
  .strict()
  .transform((value) => ({
    templateId: value.templateId,
    data: value.data as Record<string, ContractDataValue>,
  }));
