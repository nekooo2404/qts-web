import { mkdtemp, mkdir, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { Client } from 'pg';
import PizZip from 'pizzip';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  loadProvisionContractTemplateCommand,
  provisionContractTemplate,
  type ProvisionContractTemplateInput,
} from '../../scripts/provision-contract-template.js';

const actorId = '70f3a0db-616d-43a3-a18d-5707f694f972';
const firstTemplateId = 'f25e1d3e-e4df-475d-a7b2-6a4a35f50dc2';
const secondTemplateId = 'b2f4b8df-bb99-4e4f-ab0c-f3084b4b6270';
const temporaryDirectories: string[] = [];

function createTemplateBuffer(): Buffer {
  const archive = new PizZip();
  archive.file(
    '[Content_Types].xml',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
      '</Types>',
  );
  archive.file(
    '_rels/.rels',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
      '</Relationships>',
  );
  archive.file(
    'word/document.xml',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
      '<w:body><w:p><w:r><w:t>Customer: {customerName}</w:t></w:r></w:p></w:body>' +
      '</w:document>',
  );
  return archive.generate({ type: 'nodebuffer' });
}

async function createInput(
  overrides: Partial<ProvisionContractTemplateInput> = {},
): Promise<{ input: ProvisionContractTemplateInput; templateBuffer: Buffer }> {
  const root = await mkdtemp(join(tmpdir(), 'qts-template-provision-'));
  temporaryDirectories.push(root);
  const sourcePath = join(root, 'source.docx');
  const storageRoot = join(root, 'storage');
  const templateBuffer = createTemplateBuffer();
  await writeFile(sourcePath, templateBuffer);
  await mkdir(storageRoot, { mode: 0o700 });

  return {
    input: {
      actorId,
      allowedFields: ['customerName'],
      description: 'Approved contract template',
      limits: {
        maxEntries: 100,
        maxTemplateBytes: 1024 * 1024,
        maxUncompressedBytes: 5 * 1024 * 1024,
      },
      name: 'QTS standard contract',
      outputFilename: 'QTS-contract.docx',
      sourcePath,
      storageRoot,
      ...overrides,
    },
    templateBuffer,
  };
}

function client(options: {
  actorAllowed?: boolean;
  commitError?: Error;
  insertError?: Error;
} = {}) {
  const query = vi.fn(async (sql: string) => {
    if (sql.includes('FROM public.users')) {
      return { rows: options.actorAllowed === false ? [] : [{ id: actorId }] };
    }
    if (sql.includes('INSERT INTO public.contract_templates') && options.insertError) {
      throw options.insertError;
    }
    if (sql === 'COMMIT' && options.commitError) throw options.commitError;
    return { rows: [], rowCount: 1 };
  });
  return {
    databaseClient: { query } as unknown as Pick<Client, 'query'>,
    query,
  };
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { force: true, recursive: true }),
    ),
  );
});

describe('contract template provisioner', () => {
  it('validates configuration and gives CLI values precedence', () => {
    const command = loadProvisionContractTemplateCommand(
      {
        DATABASE_URL: 'postgresql://database.example/qts',
        DATABASE_SSL: 'true',
        INTERNAL_FILE_STORAGE_ROOT: './storage',
        CONTRACT_TEMPLATE_SOURCE_PATH: 'environment.docx',
        CONTRACT_TEMPLATE_NAME: 'Environment template',
        CONTRACT_TEMPLATE_ALLOWED_FIELDS: 'environmentField',
        CONTRACT_TEMPLATE_OUTPUT_FILENAME: 'environment.docx',
        CONTRACT_TEMPLATE_ACTOR_ID: actorId,
      },
      [
        '--source',
        'cli.docx',
        '--name=CLI template',
        '--allowed-fields',
        'customerName,contractNumber',
        '--output-filename',
        'cli-output.docx',
        '--actor-id',
        actorId,
      ],
    );

    expect(command.database.ssl).toBe(true);
    expect(command.template).toMatchObject({
      allowedFields: ['customerName', 'contractNumber'],
      name: 'CLI template',
      outputFilename: 'cli-output.docx',
      sourcePath: 'cli.docx',
    });
  });

  it('rejects unsafe or duplicate metadata before accessing a file', () => {
    expect(() =>
      loadProvisionContractTemplateCommand(
        {
          DATABASE_URL: 'postgresql://database.example/qts',
          INTERNAL_FILE_STORAGE_ROOT: './storage',
          CONTRACT_TEMPLATE_SOURCE_PATH: 'source.docx',
          CONTRACT_TEMPLATE_NAME: 'QTS template',
          CONTRACT_TEMPLATE_ALLOWED_FIELDS: 'customerName,customerName',
          CONTRACT_TEMPLATE_OUTPUT_FILENAME: '../unsafe.docx',
          CONTRACT_TEMPLATE_ACTOR_ID: actorId,
        },
        [],
      ),
    ).toThrow();
  });

  it('copies a valid DOCX and records its metadata and audit event atomically', async () => {
    const { input, templateBuffer } = await createInput();
    const { databaseClient, query } = client();

    const result = await provisionContractTemplate(
      databaseClient,
      input,
      () => firstTemplateId,
    );

    expect(result).toEqual({
      id: firstTemplateId,
      storageKey: `contract-templates/${firstTemplateId}.docx`,
    });
    expect(
      await readFile(
        join(input.storageRoot, 'contract-templates', `${firstTemplateId}.docx`),
      ),
    ).toEqual(templateBuffer);
    expect(query.mock.calls[0]?.[0]).toBe('BEGIN ISOLATION LEVEL SERIALIZABLE');
    expect(query.mock.calls[1]?.[0]).toBe(
      'SELECT pg_advisory_xact_lock(1903241087, 1145528769)',
    );
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("permission.code = 'manage:contract'"),
      [actorId],
    );
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO public.contract_templates'),
      [
        firstTemplateId,
        input.name,
        input.description,
        `contract-templates/${firstTemplateId}.docx`,
        input.allowedFields,
        input.outputFilename,
        actorId,
      ],
    );
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('CONTRACT_TEMPLATE.PROVISIONED'),
      [actorId, firstTemplateId],
    );
    expect(query.mock.calls.at(-1)?.[0]).toBe('COMMIT');
    expect(await readdir(join(input.storageRoot, 'contract-templates'))).toEqual([
      `${firstTemplateId}.docx`,
    ]);
  });

  it('reuses an existing storage directory for subsequent templates', async () => {
    const { input } = await createInput();

    await provisionContractTemplate(client().databaseClient, input, () => firstTemplateId);
    await provisionContractTemplate(client().databaseClient, input, () => secondTemplateId);

    expect(
      (await readdir(join(input.storageRoot, 'contract-templates'))).sort(),
    ).toEqual([`${firstTemplateId}.docx`, `${secondTemplateId}.docx`].sort());
  });

  it('does not copy a template for an inactive or unauthorized actor', async () => {
    const { input } = await createInput();
    const { databaseClient, query } = client({ actorAllowed: false });

    await expect(
      provisionContractTemplate(databaseClient, input, () => firstTemplateId),
    ).rejects.toThrow('active and have manage:contract');

    expect(query.mock.calls.map(([sql]) => sql)).toContain('ROLLBACK');
    expect(await readdir(input.storageRoot)).toEqual([]);
  });

  it('rolls back and removes the copied file after a pre-commit database error', async () => {
    const { input } = await createInput();
    const { databaseClient, query } = client({ insertError: new Error('insert failed') });

    await expect(
      provisionContractTemplate(databaseClient, input, () => firstTemplateId),
    ).rejects.toThrow('insert failed');

    expect(query.mock.calls.map(([sql]) => sql)).toContain('ROLLBACK');
    expect(await readdir(join(input.storageRoot, 'contract-templates'))).toEqual([]);
  });

  it('retains the final file when COMMIT has an ambiguous result', async () => {
    const { input, templateBuffer } = await createInput();
    const { databaseClient, query } = client({
      commitError: new Error('connection lost during commit'),
    });

    await expect(
      provisionContractTemplate(databaseClient, input, () => firstTemplateId),
    ).rejects.toThrow('template file was retained for reconciliation');

    expect(query.mock.calls.map(([sql]) => sql)).not.toContain('ROLLBACK');
    expect(
      await readFile(
        join(input.storageRoot, 'contract-templates', `${firstTemplateId}.docx`),
      ),
    ).toEqual(templateBuffer);
  });

  it('rejects oversized and malformed source files before opening a transaction', async () => {
    const oversized = await createInput({
      limits: {
        maxEntries: 100,
        maxTemplateBytes: 10,
        maxUncompressedBytes: 1024,
      },
    });
    const malformed = await createInput();
    await writeFile(malformed.input.sourcePath, Buffer.from('not a DOCX'));
    const oversizedClient = client();
    const malformedClient = client();

    await expect(
      provisionContractTemplate(
        oversizedClient.databaseClient,
        oversized.input,
        () => firstTemplateId,
      ),
    ).rejects.toThrow('size limit');
    await expect(
      provisionContractTemplate(
        malformedClient.databaseClient,
        malformed.input,
        () => firstTemplateId,
      ),
    ).rejects.toThrow();
    expect(oversizedClient.query).not.toHaveBeenCalled();
    expect(malformedClient.query).not.toHaveBeenCalled();
  });

  it('rejects a source file reached through a symbolic link', async () => {
    const { input } = await createInput();
    const linkedDirectory = await mkdtemp(join(tmpdir(), 'qts-template-link-'));
    temporaryDirectories.push(linkedDirectory);
    const linkPath = join(linkedDirectory, 'linked.docx');

    try {
      await symlink(input.sourcePath, linkPath, 'file');
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === 'EPERM' || code === 'EACCES') return;
      throw error;
    }

    const { databaseClient, query } = client();
    await expect(
      provisionContractTemplate(
        databaseClient,
        { ...input, sourcePath: linkPath },
        () => firstTemplateId,
      ),
    ).rejects.toThrow('Symbolic links are not allowed');
    expect(query).not.toHaveBeenCalled();
  });

  it('does not overwrite a colliding generated destination', async () => {
    const { input } = await createInput();
    const destinationDirectory = join(input.storageRoot, 'contract-templates');
    await mkdir(destinationDirectory, { recursive: true });
    const destinationPath = join(destinationDirectory, `${firstTemplateId}.docx`);
    await writeFile(destinationPath, 'existing');
    const { databaseClient, query } = client();

    await expect(
      provisionContractTemplate(databaseClient, input, () => firstTemplateId),
    ).rejects.toMatchObject({ code: 'EEXIST' });

    expect(await readFile(destinationPath, 'utf8')).toBe('existing');
    expect(query.mock.calls.map(([sql]) => sql)).toContain('ROLLBACK');
  });
});
