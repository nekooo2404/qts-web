export interface AccessibleArchive {
  id: string;
  storageKey: string;
  originalFilename: string;
  sizeBytes: number;
  sha256: string;
}

export interface ArchiveRepository {
  /**
   * Performs lookup and actor resource authorization in one query. Missing and
   * inaccessible records both return null to prevent identifier probing.
   */
  findAccessibleById(
    actorId: string,
    archiveId: string,
  ): Promise<AccessibleArchive | null>;
}
