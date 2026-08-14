import type { ContactLeadForEmail } from '../contact/contact.types.js';

export interface ContactEmailConfig {
  from: string;
  to: string;
  publicBaseUrl: string;
}

export interface ContactEmailMessage {
  from: string;
  to: string;
  subject: string;
  text: string;
  html: string;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function buildContactLeadEmail(
  lead: ContactLeadForEmail,
  config: ContactEmailConfig,
): ContactEmailMessage {
  const adminUrl = new URL(`/admin/contact-leads/${lead.id}`, config.publicBaseUrl);
  const createdAt = lead.createdAt.toISOString();

  return {
    from: config.from,
    to: config.to,
    subject: `QTS website contact lead ${lead.id}`,
    text: [
      'A new QTS website contact lead was received.',
      `Lead ID: ${lead.id}`,
      `Received at: ${createdAt}`,
      '',
      `Admin: ${adminUrl.toString()}`,
    ].join('\n'),
    html: [
      '<h1>New QTS website contact lead</h1>',
      `<p><strong>Lead ID:</strong> ${escapeHtml(lead.id)}</p>`,
      `<p><strong>Received at:</strong> ${escapeHtml(createdAt)}</p>`,
      `<p><a href="${escapeHtml(adminUrl.toString())}">Open lead in admin</a></p>`,
    ].join(''),
  };
}
