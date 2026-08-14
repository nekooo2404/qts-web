import { Worker } from 'node:worker_threads';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import {
  ContractDocumentRenderError,
  type ContractDocumentRenderer,
  type ContractDocumentRenderErrorCode,
  type ContractDocumentRenderInput,
} from './document-generation-renderer.js';

const RENDER_ERROR_CODES = new Set<ContractDocumentRenderErrorCode>([
  'TEMPLATE_TOO_LARGE',
  'TEMPLATE_INVALID',
  'GENERATED_DOCUMENT_TOO_LARGE',
]);

export type ContractDocumentWorkerErrorCode =
  | 'GENERATION_TIMEOUT'
  | 'GENERATION_FAILED';

export class ContractDocumentWorkerError extends Error {
  constructor(
    public readonly code: ContractDocumentWorkerErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'ContractDocumentWorkerError';
  }
}

interface WorkerThreadRendererOptions {
  timeoutMs: number;
  maxOldGenerationSizeMb: number;
  workerUrl?: URL;
}

interface WorkerSuccessMessage {
  ok: true;
  outputBytes: Uint8Array;
}

interface WorkerFailureMessage {
  ok: false;
  code: ContractDocumentRenderErrorCode;
  message: string;
}

function positiveInteger(value: number, name: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new TypeError(`${name} must be a positive safe integer`);
  }
}

function copyToTransferableBuffer(source: Buffer): ArrayBuffer {
  const bytes = new Uint8Array(source.length);
  bytes.set(source);
  return bytes.buffer;
}

function parseWorkerMessage(
  value: unknown,
): WorkerSuccessMessage | WorkerFailureMessage | null {
  if (typeof value !== 'object' || value === null || !('ok' in value)) {
    return null;
  }
  const candidate = value as Record<string, unknown>;
  if (candidate.ok === true && candidate.outputBytes instanceof Uint8Array) {
    return { ok: true, outputBytes: candidate.outputBytes };
  }
  if (
    candidate.ok === false &&
    typeof candidate.code === 'string' &&
    RENDER_ERROR_CODES.has(candidate.code as ContractDocumentRenderErrorCode) &&
    typeof candidate.message === 'string'
  ) {
    return {
      ok: false,
      code: candidate.code as ContractDocumentRenderErrorCode,
      message: candidate.message,
    };
  }
  return null;
}

export class WorkerThreadContractDocumentRenderer
  implements ContractDocumentRenderer
{
  private readonly workerUrl: URL;
  private readonly workerExecArgv: string[] | undefined;

  constructor(private readonly options: WorkerThreadRendererOptions) {
    positiveInteger(options.timeoutMs, 'timeoutMs');
    positiveInteger(
      options.maxOldGenerationSizeMb,
      'maxOldGenerationSizeMb',
    );
    if (options.workerUrl) {
      this.workerUrl = options.workerUrl;
      this.workerExecArgv = undefined;
      return;
    }

    const compiledWorkerUrl = new URL(
      './document-generation-worker.js',
      import.meta.url,
    );
    if (existsSync(fileURLToPath(compiledWorkerUrl))) {
      this.workerUrl = compiledWorkerUrl;
      this.workerExecArgv = undefined;
      return;
    }

    this.workerUrl = new URL('./document-generation-worker.ts', import.meta.url);
    this.workerExecArgv = ['--import', 'tsx'];
  }

  async render(input: ContractDocumentRenderInput): Promise<Buffer> {
    const templateBytes = copyToTransferableBuffer(input.templateBuffer);
    let worker: Worker;
    try {
      worker = new Worker(this.workerUrl, {
        name: 'qts-contract-document-renderer',
        ...(this.workerExecArgv ? { execArgv: this.workerExecArgv } : {}),
        resourceLimits: {
          maxOldGenerationSizeMb: this.options.maxOldGenerationSizeMb,
          maxYoungGenerationSizeMb: 16,
          stackSizeMb: 4,
        },
        transferList: [templateBytes],
        workerData: {
          data: input.data,
          limits: input.limits,
          templateBytes,
        },
      });
    } catch {
      throw new ContractDocumentWorkerError(
        'GENERATION_FAILED',
        'Contract generation worker could not be started',
      );
    }

    return await new Promise<Buffer>((resolve, reject) => {
      let settled = false;
      const finish = async (
        result: { buffer: Buffer } | { error: Error },
      ): Promise<void> => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        await worker.terminate().catch(() => undefined);
        if ('buffer' in result) resolve(result.buffer);
        else reject(result.error);
      };

      const timer = setTimeout(() => {
        void finish({
          error: new ContractDocumentWorkerError(
            'GENERATION_TIMEOUT',
            'Contract generation exceeded its time limit',
          ),
        });
      }, this.options.timeoutMs);
      timer.unref();

      worker.once('message', (rawMessage: unknown) => {
        const message = parseWorkerMessage(rawMessage);
        if (!message) {
          void finish({
            error: new ContractDocumentWorkerError(
              'GENERATION_FAILED',
              'Contract generation worker returned an invalid response',
            ),
          });
          return;
        }
        if (message.ok) {
          void finish({ buffer: Buffer.from(message.outputBytes) });
          return;
        }
        void finish({
          error: new ContractDocumentRenderError(
            message.code,
            message.message,
          ),
        });
      });
      worker.once('error', () => {
        void finish({
          error: new ContractDocumentWorkerError(
            'GENERATION_FAILED',
            'Contract generation worker failed',
          ),
        });
      });
      worker.once('exit', (code) => {
        if (!settled) {
          void finish({
            error: new ContractDocumentWorkerError(
              'GENERATION_FAILED',
              `Contract generation worker exited before responding (${code})`,
            ),
          });
        }
      });
    });
  }
}
