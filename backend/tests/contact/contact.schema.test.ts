import { describe, expect, it } from 'vitest';

import { contactInputSchema } from '../../src/modules/contact/contact.schema.js';

describe('contactInputSchema', () => {
  const validInput = {
    customerName: '  Nguyễn Minh Anh  ',
    phone: '0901 234 567',
    email: '  Minh.Anh+QTS@Example.com ',
    message: '  Tôi cần tư vấn giải pháp an ninh mạng.  ',
  };

  it('normalizes Vietnamese contact data', () => {
    const result = contactInputSchema.parse(validInput);

    expect(result).toEqual({
      customerName: 'Nguyễn Minh Anh',
      phone: '+84901234567',
      email: 'minh.anh+qts@example.com',
      message: 'Tôi cần tư vấn giải pháp an ninh mạng.',
    });
  });

  it('accepts a valid explicit international phone number', () => {
    const result = contactInputSchema.parse({
      ...validInput,
      phone: '+1 (415) 555-2671',
    });

    expect(result.phone).toBe('+14155552671');
  });

  it.each([
    'not-an-email',
    'Customer <customer@example.com>',
    'customer@example.com\r\nBcc: attacker@example.com',
  ])('rejects unsafe or malformed email %s', (email) => {
    expect(() => contactInputSchema.parse({ ...validInput, email })).toThrow();
  });

  it.each(['12345', '0901ABC567', '84901234567', '+999999999999999']) (
    'rejects invalid phone %s',
    (phone) => {
      expect(() => contactInputSchema.parse({ ...validInput, phone })).toThrow();
    },
  );

  it('rejects mass-assigned and unknown fields', () => {
    expect(() =>
      contactInputSchema.parse({
        ...validInput,
        status: 'CONTACTED',
        createdAt: '2026-08-13T00:00:00.000Z',
      }),
    ).toThrow();
  });

  it('rejects control characters while preserving Vietnamese Unicode', () => {
    expect(() =>
      contactInputSchema.parse({
        ...validInput,
        customerName: 'Nguyễn\u0000 Minh Anh',
      }),
    ).toThrow();
  });
});
