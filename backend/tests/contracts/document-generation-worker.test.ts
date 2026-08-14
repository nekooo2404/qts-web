import PizZip from 'pizzip';
import { describe, expect, it } from 'vitest';

import { WorkerThreadContractDocumentRenderer } from '../../src/modules/contracts/document-generation-worker-runner.js';

describe('WorkerThreadContractDocumentRenderer', () => {
  it('renders a real DOCX through the default worker entrypoint', async () => {
    const zip = new PizZip();
    zip.file(
      '[Content_Types].xml',
      '<?xml version="1.0"?>' +
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
        '<Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
        '</Types>',
    );
    zip.file(
      '_rels/.rels',
      '<?xml version="1.0"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
        '</Relationships>',
    );
    zip.file(
      'word/document.xml',
      '<?xml version="1.0"?>' +
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
        '<w:body><w:p><w:r><w:t>{customerName}</w:t></w:r></w:p></w:body>' +
        '</w:document>',
    );
    const renderer = new WorkerThreadContractDocumentRenderer({
      maxOldGenerationSizeMb: 64,
      timeoutMs: 5_000,
    });

    const output = await renderer.render({
      templateBuffer: zip.generate({ type: 'nodebuffer' }),
      data: { customerName: 'QTS' },
      limits: {
        maxEntries: 20,
        maxOutputBytes: 1024 * 1024,
        maxUncompressedBytes: 1024 * 1024,
      },
    });

    expect(new PizZip(output).file('word/document.xml')?.asText()).toContain(
      'QTS',
    );
  });

  it('terminates a worker that exceeds the generation timeout', async () => {
    const renderer = new WorkerThreadContractDocumentRenderer({
      maxOldGenerationSizeMb: 64,
      timeoutMs: 25,
      workerUrl: new URL(
        'data:text/javascript,setInterval(()%20%3D%3E%20undefined%2C%201000)',
      ),
    });

    await expect(
      renderer.render({
        data: {},
        limits: {
          maxEntries: 10,
          maxOutputBytes: 1_024,
          maxUncompressedBytes: 1_024,
        },
        templateBuffer: Buffer.from('not inspected by hanging worker'),
      }),
    ).rejects.toMatchObject({ code: 'GENERATION_TIMEOUT' });
  });
});
