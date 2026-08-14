import {
  FileStorageError,
  type FileStorage,
} from '../files/file-storage.js';
import { sanitizeDownloadFilename } from '../files/content-disposition.js';
import type { DocumentGenerationAdmissionController } from './document-generation-admission.js';
import type { ContractTemplateRepository } from './document-generation.repository.js';
import {
  ContractDocumentRenderError,
  type ContractDocumentRenderer,
} from './document-generation-renderer.js';
import { ContractDocumentWorkerError } from './document-generation-worker-runner.js';
import type {
  GenerateContractDocumentInput,
  GeneratedContractDocument,
} from './document-generation.types.js';

export type ContractDocumentGenerationErrorCode =
  | 'TEMPLATE_NOT_AVAILABLE'
  | 'TEMPLATE_TOO_LARGE'
  | 'CONTRACT_FIELDS_NOT_ALLOWED'
  | 'TEMPLATE_INVALID'
  | 'GENERATED_DOCUMENT_TOO_LARGE'
  | 'GENERATION_BUSY'
  | 'GENERATION_TIMEOUT'
  | 'GENERATION_FAILED';

export class ContractDocumentGenerationError extends Error {
  constructor(
    public readonly code: ContractDocumentGenerationErrorCode,
    message: string,
    public readonly details?: unknown,
    public readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = 'ContractDocumentGenerationError';
  }
}

export interface ContractDocumentGenerationLimits {
  maxTemplateBytes: number;
  maxUncompressedTemplateBytes: number;
  maxOutputBytes: number;
  maxTemplateEntries?: number;
  retryAfterSeconds: number;
}

function validatePositiveLimit(value: number, name: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new TypeError(`${name} must be a positive safe integer`);
  }
}

function templateNotAvailable(): ContractDocumentGenerationError {
  return new ContractDocumentGenerationError(
    'TEMPLATE_NOT_AVAILABLE',
    'Contract template is not available',
  );
}

export class ContractDocumentGenerationService {
  constructor(
    private readonly repository: ContractTemplateRepository,
    private readonly storage: FileStorage,
    private readonly limits: ContractDocumentGenerationLimits,
    private readonly renderer: ContractDocumentRenderer,
    private readonly admission: DocumentGenerationAdmissionController,
  ) {
    validatePositiveLimit(limits.maxTemplateBytes, 'maxTemplateBytes');
    validatePositiveLimit(
      limits.maxUncompressedTemplateBytes,
      'maxUncompressedTemplateBytes',
    );
    validatePositiveLimit(limits.maxOutputBytes, 'maxOutputBytes');
    validatePositiveLimit(limits.retryAfterSeconds, 'retryAfterSeconds');
    if (limits.maxTemplateEntries !== undefined) {
      validatePositiveLimit(limits.maxTemplateEntries, 'maxTemplateEntries');
    }
  }

  async generate(
    input: GenerateContractDocumentInput,
  ): Promise<GeneratedContractDocument> {
    const template = await this.repository.findAccessibleById(
      input.actorId,
      input.templateId,
    );
    if (!template) throw templateNotAvailable();

    const allowedFields = new Set(template.allowedFields);
    const rejectedFields = Object.keys(input.data).filter(
      (field) => !allowedFields.has(field),
    );
    if (rejectedFields.length !== 0) {
      throw new ContractDocumentGenerationError(
        'CONTRACT_FIELDS_NOT_ALLOWED',
        'Contract data contains fields that are not allowed by this template',
        { fields: rejectedFields.sort() },
      );
    }

    const reservedBytes =
      2 *
      (this.limits.maxTemplateBytes +
        this.limits.maxUncompressedTemplateBytes +
        this.limits.maxOutputBytes);
    const lease = this.admission.tryAcquire(reservedBytes);
    if (!lease) {
      throw new ContractDocumentGenerationError(
        'GENERATION_BUSY',
        'Contract generation capacity is temporarily exhausted',
        undefined,
        this.limits.retryAfterSeconds,
      );
    }

    try {
      let templateBuffer: Buffer;
      try {
        templateBuffer = await this.storage.readBuffer(
          template.storageKey,
          this.limits.maxTemplateBytes,
        );
      } catch (error) {
        if (!(error instanceof FileStorageError)) throw error;
        if (error.code === 'FILE_TOO_LARGE') {
          throw new ContractDocumentGenerationError(
            'TEMPLATE_TOO_LARGE',
            'Contract template exceeds the configured size limit',
          );
        }
        throw templateNotAvailable();
      }

      let output: Buffer;
      try {
        output = await this.renderer.render({
          templateBuffer,
          data: input.data,
          limits: {
            maxEntries: this.limits.maxTemplateEntries ?? 512,
            maxUncompressedBytes: this.limits.maxUncompressedTemplateBytes,
            maxOutputBytes: this.limits.maxOutputBytes,
          },
        });
      } catch (error) {
        if (error instanceof ContractDocumentRenderError) {
          throw new ContractDocumentGenerationError(error.code, error.message);
        }
        if (error instanceof ContractDocumentWorkerError) {
          throw new ContractDocumentGenerationError(error.code, error.message);
        }
        throw new ContractDocumentGenerationError(
          'GENERATION_FAILED',
          'Contract generation worker failed',
        );
      }

      return {
        buffer: output,
        filename: sanitizeDownloadFilename(
          template.outputFilename,
          'contract.docx',
          '.docx',
        ),
      };
    } finally {
      lease.release();
    }
  }
}
