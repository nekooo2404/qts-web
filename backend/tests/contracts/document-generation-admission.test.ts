import { describe, expect, it } from 'vitest';

import { InFlightDocumentGenerationController } from '../../src/modules/contracts/document-generation-admission.js';

describe('InFlightDocumentGenerationController', () => {
  it('bounds concurrent jobs and releases a lease exactly once', () => {
    const controller = new InFlightDocumentGenerationController({
      maxGenerations: 1,
      maxBytes: 100,
    });

    const first = controller.tryAcquire(40);

    expect(first).not.toBeNull();
    expect(controller.tryAcquire(40)).toBeNull();
    first?.release();
    first?.release();
    expect(controller.tryAcquire(40)).not.toBeNull();
  });

  it('rejects a job that would exceed the in-flight byte budget', () => {
    const controller = new InFlightDocumentGenerationController({
      maxGenerations: 3,
      maxBytes: 100,
    });

    expect(controller.tryAcquire(70)).not.toBeNull();
    expect(controller.tryAcquire(31)).toBeNull();
    expect(controller.tryAcquire(30)).not.toBeNull();
  });
});
