import PizZip from 'pizzip';
import { describe, expect, it, vi } from 'vitest';

import type { FileStorage } from '../../src/modules/files/file-storage.js';
import { InFlightDocumentGenerationController } from '../../src/modules/contracts/document-generation-admission.js';
import { renderContractDocument } from '../../src/modules/contracts/document-generation-renderer.js';
import type { ContractDocumentRenderer } from '../../src/modules/contracts/document-generation-renderer.js';
import { ContractDocumentGenerationService } from '../../src/modules/contracts/document-generation.service.js';
import type { ContractDocumentGenerationError } from '../../src/modules/contracts/document-generation.service.js';
import type { ContractTemplateRepository } from '../../src/modules/contracts/document-generation.repository.js';
import type { AccessibleContractTemplate } from '../../src/modules/contracts/document-generation.repository.js';

const templateId = 'f25e1d3e-e4df-475d-a7b2-6a4a35f50dc2';
const actorId = '70f3a0db-616d-43a3-a18d-5707f694f972';

function createTemplateBuffer() {
  const zip = new PizZip();
  zip.file(
    '[Content_Types].xml',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
      '</Types>',
  );
  zip.file(
    '_rels/.rels',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
      '</Relationships>',
  );
  zip.file(
    'word/document.xml',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
      '<w:body><w:p><w:r><w:t>Customer: {customerName}</w:t></w:r></w:p></w:body>' +
      '</w:document>',
  );
  return zip.generate({ type: 'nodebuffer' });
}

function understateUncompressedSize(buffer: Buffer, filename: string): Buffer {
  const tampered = Buffer.from(buffer);
  const signature = Buffer.from([0x50, 0x4b, 0x01, 0x02]);
  let offset = 0;
  while ((offset = tampered.indexOf(signature, offset)) !== -1) {
    const filenameBytes = tampered.readUInt16LE(offset + 28);
    const storedFilename = tampered
      .subarray(offset + 46, offset + 46 + filenameBytes)
      .toString('utf8');
    if (storedFilename === filename) {
      tampered.writeUInt32LE(1, offset + 24);
      return tampered;
    }
    offset += 4;
  }
  throw new Error(`Central directory entry was not found: ${filename}`);
}

function createDependencies(overrides?: {
  allowedFields?: readonly string[];
  outputFilename?: string;
  maxOutputBytes?: number;
  maxUncompressedTemplateBytes?: number;
  templateBuffer?: Buffer;
  renderer?: ContractDocumentRenderer;
}) {
  const findAccessibleById = vi.fn(
    async (): Promise<AccessibleContractTemplate | null> => ({
      id: templateId,
      storageKey: 'templates/customer-contract.docx',
      allowedFields: overrides?.allowedFields ?? ['customerName'],
      outputFilename: overrides?.outputFilename ?? 'customer-contract.docx',
    }),
  );
  const repository: ContractTemplateRepository = {
    findAccessibleById,
  };
  const readBuffer = vi.fn(
    async () => overrides?.templateBuffer ?? createTemplateBuffer(),
  );
  const storage: FileStorage = {
    readBuffer,
    openReadStream: vi.fn(),
    openVerifiedReadStream: vi.fn(),
  };
  const renderer = overrides?.renderer ?? {
    render: async (input: Parameters<typeof renderContractDocument>[0]) =>
      renderContractDocument(input),
  };
  const service = new ContractDocumentGenerationService(
    repository,
    storage,
    {
      maxTemplateBytes: 1024 * 1024,
      maxOutputBytes: overrides?.maxOutputBytes ?? 1024 * 1024,
      maxUncompressedTemplateBytes:
        overrides?.maxUncompressedTemplateBytes ?? 5 * 1024 * 1024,
      retryAfterSeconds: 5,
    },
    renderer,
    new InFlightDocumentGenerationController({
      maxGenerations: 1,
      maxBytes: 14 * 1024 * 1024,
    }),
  );
  return { findAccessibleById, readBuffer, service };
}

describe('ContractDocumentGenerationService', () => {
  it('renders an accessible template with only allowlisted contract data', async () => {
    const { findAccessibleById, readBuffer, service } = createDependencies();

    const result = await service.generate({
      actorId,
      templateId,
      data: { customerName: 'QTS & Partners' },
    });

    const outputZip = new PizZip(result.buffer);
    const documentXml = outputZip.file('word/document.xml')?.asText();
    expect(documentXml).toContain('Customer: QTS &amp; Partners');
    expect(result.filename).toBe('customer-contract.docx');
    expect(findAccessibleById).toHaveBeenCalledWith(actorId, templateId);
    expect(readBuffer).toHaveBeenCalledWith(
      'templates/customer-contract.docx',
      1024 * 1024,
    );
  });

  it('rejects fields that are not allowlisted before opening the template', async () => {
    const { readBuffer, service } = createDependencies();

    await expect(
      service.generate({
        actorId,
        templateId,
        data: { customerName: 'QTS', internalApproval: true },
      }),
    ).rejects.toMatchObject({
      code: 'CONTRACT_FIELDS_NOT_ALLOWED',
    } satisfies Partial<ContractDocumentGenerationError>);
    expect(readBuffer).not.toHaveBeenCalled();
  });

  it('does not reveal whether a template exists when it is inaccessible', async () => {
    const { findAccessibleById, service } = createDependencies();
    findAccessibleById.mockResolvedValue(null);

    await expect(
      service.generate({ actorId, templateId, data: {} }),
    ).rejects.toMatchObject({ code: 'TEMPLATE_NOT_AVAILABLE' });
  });

  it('rejects generated documents over the configured output limit', async () => {
    const { service } = createDependencies({ maxOutputBytes: 32 });

    await expect(
      service.generate({
        actorId,
        templateId,
        data: { customerName: 'QTS' },
      }),
    ).rejects.toMatchObject({ code: 'GENERATED_DOCUMENT_TOO_LARGE' });
  });

  it('rejects a compressed template whose expanded content exceeds the limit', async () => {
    const zip = new PizZip(createTemplateBuffer());
    zip.file('word/large.xml', 'A'.repeat(100_000));
    const templateBuffer = zip.generate({
      type: 'nodebuffer',
      compression: 'DEFLATE',
    });
    const { service } = createDependencies({
      templateBuffer,
      maxUncompressedTemplateBytes: 10_000,
    });

    await expect(
      service.generate({
        actorId,
        templateId,
        data: { customerName: 'QTS' },
      }),
    ).rejects.toMatchObject({ code: 'TEMPLATE_TOO_LARGE' });
  });

  it('rejects a template that understates expanded size in ZIP metadata', async () => {
    const zip = new PizZip(createTemplateBuffer());
    zip.file('word/large.xml', 'A'.repeat(100_000));
    const generated = zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
    const templateBuffer = understateUncompressedSize(
      generated,
      'word/large.xml',
    );
    const { service } = createDependencies({
      templateBuffer,
      maxUncompressedTemplateBytes: 10_000,
    });

    await expect(
      service.generate({
        actorId,
        templateId,
        data: { customerName: 'QTS' },
      }),
    ).rejects.toMatchObject({ code: 'TEMPLATE_INVALID' });
  });

  it('rejects excess concurrent generations and releases capacity afterwards', async () => {
    let finishFirst: ((value: Buffer) => void) | undefined;
    const firstRender = new Promise<Buffer>((resolve) => {
      finishFirst = resolve;
    });
    const render = vi
      .fn()
      .mockImplementationOnce(async () => firstRender)
      .mockImplementation(async (input) => renderContractDocument(input));
    const { service } = createDependencies({ renderer: { render } });
    const input = {
      actorId,
      templateId,
      data: { customerName: 'QTS' },
    };

    const first = service.generate(input);
    await vi.waitFor(() => expect(render).toHaveBeenCalledOnce());

    await expect(service.generate(input)).rejects.toMatchObject({
      code: 'GENERATION_BUSY',
    });
    finishFirst?.(createTemplateBuffer());
    await expect(first).resolves.toMatchObject({
      filename: 'customer-contract.docx',
    });
    await expect(service.generate(input)).resolves.toMatchObject({
      filename: 'customer-contract.docx',
    });
  });
});
