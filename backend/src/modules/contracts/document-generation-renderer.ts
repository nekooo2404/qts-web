import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';

import {
  assertSafeDocxArchive,
  DocxArchiveLimitError,
} from './docx-archive-inspection.js';
import type { ContractDataValue } from './document-generation.types.js';

export type ContractDocumentRenderErrorCode =
  | 'TEMPLATE_TOO_LARGE'
  | 'TEMPLATE_INVALID'
  | 'GENERATED_DOCUMENT_TOO_LARGE';

export class ContractDocumentRenderError extends Error {
  constructor(
    public readonly code: ContractDocumentRenderErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'ContractDocumentRenderError';
  }
}

export interface ContractDocumentRenderInput {
  templateBuffer: Buffer;
  data: Record<string, ContractDataValue>;
  limits: {
    maxEntries: number;
    maxUncompressedBytes: number;
    maxOutputBytes: number;
  };
}

export interface ContractDocumentRenderer {
  render(input: ContractDocumentRenderInput): Promise<Buffer>;
}

function cloneAsTemplateData(value: ContractDataValue): ContractDataValue {
  if (Array.isArray(value)) return value.map(cloneAsTemplateData);
  if (value !== null && typeof value === 'object') {
    const result = Object.create(null) as Record<string, ContractDataValue>;
    for (const [key, child] of Object.entries(value)) {
      result[key] = cloneAsTemplateData(child);
    }
    return result;
  }
  return value;
}

export function renderContractDocument(
  input: ContractDocumentRenderInput,
): Buffer {
  let output: Buffer;
  try {
    assertSafeDocxArchive(input.templateBuffer, {
      maxEntries: input.limits.maxEntries,
      maxUncompressedBytes: input.limits.maxUncompressedBytes,
    });
    const zip = new PizZip(input.templateBuffer, { checkCRC32: true });
    const document = new Docxtemplater(zip, {
      errorLogging: false,
      linebreaks: true,
      paragraphLoop: true,
      stripInvalidXMLChars: true,
      nullGetter: () => '',
    });
    document.render(cloneAsTemplateData(input.data));
    output = document.getZip().generate({
      type: 'nodebuffer',
      compression: 'DEFLATE',
    });
  } catch (error) {
    if (error instanceof ContractDocumentRenderError) throw error;
    if (error instanceof DocxArchiveLimitError) {
      throw new ContractDocumentRenderError(
        'TEMPLATE_TOO_LARGE',
        'Contract template exceeds the configured expansion limit',
      );
    }
    throw new ContractDocumentRenderError(
      'TEMPLATE_INVALID',
      'Contract template could not be rendered',
    );
  }

  if (output.length > input.limits.maxOutputBytes) {
    throw new ContractDocumentRenderError(
      'GENERATED_DOCUMENT_TOO_LARGE',
      'Generated contract exceeds the configured size limit',
    );
  }
  return output;
}
