import { describe, expect, it } from 'vitest';

import { buildContactLeadEmail } from '../../src/modules/outbox/contact-email.js';

describe('buildContactLeadEmail', () => {
  it('keeps headers configuration-owned and excludes visitor PII', () => {
    const email = buildContactLeadEmail(
      {
        id: '0e00e7a5-c3e4-4187-af18-8dc38a8128bf',
        customerName: '<img src=x onerror=alert(1)>',
        phone: '+84901234567',
        email: 'customer@example.com',
        message: '</td><script>alert(1)</script>\nDòng thứ hai',
        createdAt: new Date('2026-08-13T13:00:00.000Z'),
      },
      {
        from: 'QTS Website <no-reply@qts.example>',
        to: 'sales@qts.example',
        publicBaseUrl: 'https://qts.example',
      },
    );

    expect(email.from).toBe('QTS Website <no-reply@qts.example>');
    expect(email.to).toBe('sales@qts.example');
    expect(email.subject).not.toContain('<img');
    expect(email.html).not.toContain('<script>');
    expect(email.text).toContain('0e00e7a5-c3e4-4187-af18-8dc38a8128bf');
    expect(email.html).toContain('/admin/contact-leads/');
    for (const pii of [
      '<img src=x onerror=alert(1)>',
      '+84901234567',
      'customer@example.com',
      '</td><script>alert(1)</script>',
    ]) {
      expect(email.text).not.toContain(pii);
      expect(email.html).not.toContain(pii);
    }
  });
});
