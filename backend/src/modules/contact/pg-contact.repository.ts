import type { DatabasePool } from '../../database/database.types.js';
import type { ContactLeadRepository } from './contact.repository.js';
import type {
  ContactInput,
  ContactLeadForEmail,
  CreatedContactLead,
} from './contact.types.js';

interface CreatedLeadRow {
  id: string;
  status: 'NEW';
  created_at: Date;
}

interface EmailLeadRow {
  id: string;
  customer_name: string;
  phone: string;
  email: string;
  message: string;
  created_at: Date;
}

export class PgContactLeadRepository implements ContactLeadRepository {
  constructor(private readonly pool: DatabasePool) {}

  async createWithNotification(input: ContactInput): Promise<CreatedContactLead> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const leadResult = await client.query<CreatedLeadRow>(
        `INSERT INTO public.contact_leads
          (customer_name, phone, email, message)
         VALUES ($1, $2, $3, $4)
         RETURNING id, status, created_at`,
        [input.customerName, input.phone, input.email, input.message],
      );
      const lead = leadResult.rows[0];
      if (!lead) {
        throw new Error('Contact lead insert returned no row');
      }

      await client.query(
        `INSERT INTO public.email_outbox
          (event_type, aggregate_id, payload)
         VALUES ('CONTACT_LEAD_CREATED', $1, jsonb_build_object('leadId', $1::text))`,
        [lead.id],
      );
      await client.query('COMMIT');

      return {
        id: lead.id,
        status: lead.status,
        createdAt: lead.created_at,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async findByIdForEmail(id: string): Promise<ContactLeadForEmail | null> {
    const result = await this.pool.query<EmailLeadRow>(
      `SELECT id, customer_name, phone, email, message, created_at
       FROM public.contact_leads
       WHERE id = $1`,
      [id],
    );
    const row = result.rows[0];
    if (!row) {
      return null;
    }

    return {
      id: row.id,
      customerName: row.customer_name,
      phone: row.phone,
      email: row.email,
      message: row.message,
      createdAt: row.created_at,
    };
  }
}
