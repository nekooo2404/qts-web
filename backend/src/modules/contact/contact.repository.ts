import type { ContactInput, ContactLeadForEmail, CreatedContactLead } from './contact.types.js';

export interface ContactLeadRepository {
  createWithNotification(input: ContactInput): Promise<CreatedContactLead>;
  findByIdForEmail?(id: string): Promise<ContactLeadForEmail | null>;
}
