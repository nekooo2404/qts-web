export interface DocumentGenerationLease {
  release(): void;
}

export interface DocumentGenerationAdmissionController {
  tryAcquire(sizeBytes: number): DocumentGenerationLease | null;
}

export interface InFlightDocumentGenerationLimits {
  maxGenerations: number;
  maxBytes: number;
}

function requirePositiveSafeInteger(value: number, name: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new TypeError(`${name} must be a positive safe integer`);
  }
}

export class InFlightDocumentGenerationController
  implements DocumentGenerationAdmissionController
{
  private generations = 0;
  private bytes = 0;

  constructor(private readonly limits: InFlightDocumentGenerationLimits) {
    requirePositiveSafeInteger(limits.maxGenerations, 'maxGenerations');
    requirePositiveSafeInteger(limits.maxBytes, 'maxBytes');
  }

  tryAcquire(sizeBytes: number): DocumentGenerationLease | null {
    requirePositiveSafeInteger(sizeBytes, 'sizeBytes');
    if (
      this.generations >= this.limits.maxGenerations ||
      sizeBytes > this.limits.maxBytes - this.bytes
    ) {
      return null;
    }

    this.generations += 1;
    this.bytes += sizeBytes;
    let released = false;
    return {
      release: () => {
        if (released) return;
        released = true;
        this.generations -= 1;
        this.bytes -= sizeBytes;
      },
    };
  }
}
