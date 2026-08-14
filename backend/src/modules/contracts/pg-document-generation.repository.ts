import type { DatabasePool } from '../../database/database.types.js';
import type {
  AccessibleContractTemplate,
  ContractTemplateRepository,
} from './document-generation.repository.js';

interface TemplateRow {
  id: string;
  storage_key: string;
  allowed_fields: string[];
  output_filename: string;
}

export class PgContractTemplateRepository implements ContractTemplateRepository {
  constructor(private readonly pool: DatabasePool) {}

  async findAccessibleById(
    _actorId: string,
    templateId: string,
  ): Promise<AccessibleContractTemplate | null> {
    const result = await this.pool.query<TemplateRow>(
      `SELECT id, storage_key, allowed_fields, output_filename
       FROM public.contract_templates
       WHERE id = $1 AND is_active = TRUE`,
      [templateId],
    );
    const row = result.rows[0];
    return row
      ? {
          id: row.id,
          storageKey: row.storage_key,
          allowedFields: row.allowed_fields,
          outputFilename: row.output_filename,
        }
      : null;
  }
}
