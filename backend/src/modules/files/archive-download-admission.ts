export interface ArchiveDownloadLease {
  release(): void;
}

export interface ArchiveDownloadAdmissionController {
  tryAcquire(sizeBytes: number): ArchiveDownloadLease | null;
}

export interface InFlightArchiveDownloadLimits {
  maxDownloads: number;
  maxBytes: number;
}

function requirePositiveSafeInteger(value: number, name: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new TypeError(`${name} must be a positive safe integer`);
  }
}

/**
 * Bounds archive verification snapshots and response streams within one API
 * process. A deployment with multiple replicas should also enforce an
 * aggregate limit at its gateway or orchestrator.
 */
export class InFlightArchiveDownloadController
  implements ArchiveDownloadAdmissionController
{
  private downloads = 0;
  private bytes = 0;

  constructor(private readonly limits: InFlightArchiveDownloadLimits) {
    requirePositiveSafeInteger(limits.maxDownloads, 'maxDownloads');
    requirePositiveSafeInteger(limits.maxBytes, 'maxBytes');
  }

  tryAcquire(sizeBytes: number): ArchiveDownloadLease | null {
    requirePositiveSafeInteger(sizeBytes, 'sizeBytes');

    if (
      this.downloads >= this.limits.maxDownloads ||
      sizeBytes > this.limits.maxBytes - this.bytes
    ) {
      return null;
    }

    this.downloads += 1;
    this.bytes += sizeBytes;
    let released = false;

    return {
      release: () => {
        if (released) return;
        released = true;
        this.downloads -= 1;
        this.bytes -= sizeBytes;
      },
    };
  }
}
