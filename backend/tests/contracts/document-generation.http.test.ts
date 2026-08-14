import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { requestContext } from '../../src/common/request-context.js';
import { errorHandler } from '../../src/middleware/error-handler.js';
import {
  generateContractDocumentController,
  type ContractDocumentGenerator,
} from '../../src/modules/contracts/document-generation.controller.js';
import { ContractDocumentGenerationError } from '../../src/modules/contracts/document-generation.service.js';

const templateId = 'f25e1d3e-e4df-475d-a7b2-6a4a35f50dc2';

function buildApp(generator: ContractDocumentGenerator) {
  const app = express();
  app.use(requestContext);
  app.use(express.json());
  app.post(
    '/api/contracts/generate',
    generateContractDocumentController({
      generator,
      resolveActor: () => ({ id: 'actor-1' }),
    }),
  );
  app.use(errorHandler);
  return app;
}

describe('POST /api/contracts/generate', () => {
  it('returns a docx attachment with injection-safe headers', async () => {
    const generate = vi.fn(async () => ({
      buffer: Buffer.from('generated docx'),
      filename: 'QTS Contract"\r\nX-Injected: yes.docx',
    }));
    const generator: ContractDocumentGenerator = {
      generate,
    };

    const response = await request(buildApp(generator))
      .post('/api/contracts/generate')
      .send({ templateId, data: { customerName: 'QTS' } });

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toBe(
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );
    expect(response.headers['content-disposition']).toContain('attachment;');
    expect(response.headers['content-disposition']).not.toMatch(/[\r\n]/);
    expect(response.headers['x-injected']).toBeUndefined();
    expect(response.headers['cache-control']).toBe('private, no-store');
    expect(generate).toHaveBeenCalledWith({
      actorId: 'actor-1',
      templateId,
      data: { customerName: 'QTS' },
    });
  });

  it('rejects malformed or excessively nested contract data at the boundary', async () => {
    const generate = vi.fn();
    const generator: ContractDocumentGenerator = { generate };
    const deeplyNested = { value: 'end' };
    let cursor: Record<string, unknown> = deeplyNested;
    for (let index = 0; index < 8; index += 1) {
      const child = { nested: cursor };
      cursor = child;
    }

    const response = await request(buildApp(generator))
      .post('/api/contracts/generate')
      .send({ templateId, data: { customer: cursor } });

    expect(response.status).toBe(422);
    expect(response.text).toContain('"code":"VALIDATION_ERROR"');
    expect(generate).not.toHaveBeenCalled();
  });

  it('returns a retryable service error when generation capacity is exhausted', async () => {
    const generator: ContractDocumentGenerator = {
      generate: vi.fn(async () => {
        throw new ContractDocumentGenerationError(
          'GENERATION_BUSY',
          'Contract generation capacity is temporarily exhausted',
          undefined,
          7,
        );
      }),
    };

    const response = await request(buildApp(generator))
      .post('/api/contracts/generate')
      .send({ templateId, data: { customerName: 'QTS' } });

    expect(response.status).toBe(503);
    expect(response.headers['retry-after']).toBe('7');
    expect(response.body.error.code).toBe('GENERATION_BUSY');
  });
});
