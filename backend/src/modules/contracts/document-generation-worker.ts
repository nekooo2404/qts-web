import { parentPort, workerData } from 'node:worker_threads';

import {
  ContractDocumentRenderError,
  type ContractDocumentRenderInput,
  renderContractDocument,
} from './document-generation-renderer.js';

interface WorkerInput extends Omit<ContractDocumentRenderInput, 'templateBuffer'> {
  templateBytes: ArrayBuffer;
}

if (!parentPort) throw new Error('Document renderer must run in a worker thread');

try {
  const input = workerData as WorkerInput;
  const output = renderContractDocument({
    data: input.data,
    limits: input.limits,
    templateBuffer: Buffer.from(input.templateBytes),
  });
  const outputBytes = Uint8Array.from(output);
  parentPort.postMessage(
    { ok: true, outputBytes },
    [outputBytes.buffer],
  );
} catch (error) {
  const renderError =
    error instanceof ContractDocumentRenderError
      ? error
      : new ContractDocumentRenderError(
          'TEMPLATE_INVALID',
          'Contract template could not be rendered',
        );
  parentPort.postMessage({
    ok: false,
    code: renderError.code,
    message: renderError.message,
  });
}
