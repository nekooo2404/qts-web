export const CONTACT_LEAD_STATUSES = [
  'NEW',
  'IN_PROGRESS',
  'CONTACTED',
  'CLOSED',
  'SPAM',
] as const;

export type ContactLeadStatus = (typeof CONTACT_LEAD_STATUSES)[number];

export interface ContactInput {
  customerName: string;
  phone: string;
  email: string;
  message: string;
}

export interface CreatedContactLead {
  id: string;
  status: 'NEW';
  createdAt: Date;
}

export interface ContactLeadForEmail extends ContactInput {
  id: string;
  createdAt: Date;
}
