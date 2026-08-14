import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { z } from 'zod';

function containsForbiddenControl(value: string, allowNewlines: boolean): boolean {
  return [...value].some((character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    if (codePoint === 0x7f) return true;
    if (allowNewlines && (codePoint === 0x09 || codePoint === 0x0a || codePoint === 0x0d)) {
      return false;
    }
    return codePoint <= 0x1f;
  });
}

const normalizedText = (minimum: number, maximum: number) =>
  z
    .string()
    .transform((value) => value.normalize('NFC').trim())
    .pipe(z.string().min(minimum).max(maximum));

const phoneSchema = z.string().trim().transform((rawPhone, context) => {
  const isInternational = rawPhone.startsWith('+');
  if (!isInternational && !rawPhone.startsWith('0')) {
    context.addIssue({
      code: 'custom',
      message: 'Local phone numbers must start with 0',
    });
    return z.NEVER;
  }

  const phone = parsePhoneNumberFromString(rawPhone, isInternational ? undefined : 'VN');
  if (!phone?.isValid()) {
    context.addIssue({ code: 'custom', message: 'Phone number is invalid' });
    return z.NEVER;
  }

  return phone.number;
});

export const contactInputSchema = z
  .object({
    customerName: normalizedText(2, 120).refine(
      (value) => !containsForbiddenControl(value, false),
      'Customer name contains control characters',
    ),
    phone: phoneSchema,
    email: z
      .string()
      .trim()
      .max(254)
      .email()
      .transform((value) => value.toLowerCase()),
    message: z
      .string()
      .transform((value) => value.normalize('NFC').replace(/\r\n?/gu, '\n').trim())
      .pipe(z.string().min(10).max(5000))
      .refine(
        (value) => !containsForbiddenControl(value, true),
        'Message contains control characters',
      ),
  })
  .strict();
