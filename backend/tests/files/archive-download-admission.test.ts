import { describe, expect, it } from 'vitest';

import { InFlightArchiveDownloadController } from '../../src/modules/files/archive-download-admission.js';

describe('InFlightArchiveDownloadController', () => {
  it('rejects a download when the concurrent count is exhausted', () => {
    const controller = new InFlightArchiveDownloadController({
      maxDownloads: 1,
      maxBytes: 100,
    });

    const first = controller.tryAcquire(25);

    expect(first).not.toBeNull();
    expect(controller.tryAcquire(25)).toBeNull();
    first?.release();
    expect(controller.tryAcquire(25)).not.toBeNull();
  });

  it('rejects a download when the in-flight byte budget is exhausted', () => {
    const controller = new InFlightArchiveDownloadController({
      maxDownloads: 5,
      maxBytes: 100,
    });

    const first = controller.tryAcquire(70);

    expect(first).not.toBeNull();
    expect(controller.tryAcquire(31)).toBeNull();
    expect(controller.tryAcquire(30)).not.toBeNull();
  });

  it('releases each lease exactly once', () => {
    const controller = new InFlightArchiveDownloadController({
      maxDownloads: 1,
      maxBytes: 100,
    });
    const first = controller.tryAcquire(100);

    first?.release();
    first?.release();

    expect(controller.tryAcquire(100)).not.toBeNull();
  });
});
