import type { Request, RequestHandler, Response } from 'express';

import { ApiError } from '../../common/api-error.js';
import {
  attachmentContentDisposition,
  sanitizeDownloadFilename,
} from '../files/content-disposition.js';
import { generateContractDocumentSchema } from './document-generation.schema.js';
import { ContractDocumentGenerationError } from './document-generation.service.js';
import type {
  GenerateContractDocumentInput,
  GeneratedContractDocument,
} from './document-generation.types.js';

export interface ContractDocumentGenerator {
  generate(
    input: GenerateContractDocumentInput,
  ): Promise<GeneratedContractDocument>;
}

export interface ContractGenerationActor {
  id: string;
}

export type ContractGenerationActorResolver = (
  request: Request,
  response: Response,
) => ContractGenerationActor;

export interface GenerateContractDocumentControllerDependencies {
  generator: ContractDocumentGenerator;
  resolveActor: ContractGenerationActorResolver;
}

function mapGenerationError(
  error: ContractDocumentGenerationError,
  response: Response,
): ApiError {
  switch (error.code) {
    case 'TEMPLATE_NOT_AVAILABLE':
      return new ApiError(404, error.code, error.message);
    case 'CONTRACT_FIELDS_NOT_ALLOWED':
      return new ApiError(422, error.code, error.message, error.details);
    case 'TEMPLATE_TOO_LARGE':
    case 'GENERATED_DOCUMENT_TOO_LARGE':
      return new ApiError(413, error.code, error.message);
    case 'TEMPLATE_INVALID':
      return new ApiError(422, error.code, error.message);
    case 'GENERATION_BUSY':
      if (error.retryAfterSeconds !== undefined) {
        response.setHeader('Retry-After', String(error.retryAfterSeconds));
      }
      return new ApiError(503, error.code, error.message);
    case 'GENERATION_TIMEOUT':
    case 'GENERATION_FAILED':
      return new ApiError(503, error.code, error.message);
  }
}

export function generateContractDocumentController(
  dependencies: GenerateContractDocumentControllerDependencies,
): RequestHandler {
  return async (request, response, next) => {
    try {
      const input = generateContractDocumentSchema.parse(request.body);
      const actor = dependencies.resolveActor(request, response);
      let generated: GeneratedContractDocument;
      try {
        generated = await dependencies.generator.generate({
          actorId: actor.id,
          templateId: input.templateId,
          data: input.data,
        });
      } catch (error) {
        if (error instanceof ContractDocumentGenerationError) {
          throw mapGenerationError(error, response);
        }
        throw error;
      }

      const filename = sanitizeDownloadFilename(
        generated.filename,
        'contract.docx',
        '.docx',
      );
      response.status(200);
      response.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      );
      response.setHeader('Content-Length', String(generated.buffer.length));
      response.setHeader('Cache-Control', 'private, no-store');
      response.setHeader('X-Content-Type-Options', 'nosniff');
      response.setHeader(
        'Content-Disposition',
        attachmentContentDisposition(filename),
      );
      response.end(generated.buffer);
    } catch (error) {
      next(error);
    }
  };
}
