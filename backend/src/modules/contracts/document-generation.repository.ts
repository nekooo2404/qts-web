export interface AccessibleContractTemplate {
  id: string;
  storageKey: string;
  allowedFields: readonly string[];
  outputFilename: string;
}

export interface ContractTemplateRepository {
  /**
   * Returns an active template after the endpoint permission check. The actor
   * parameter keeps the boundary ready for per-template policies or auditing.
   */
  findAccessibleById(
    actorId: string,
    templateId: string,
  ): Promise<AccessibleContractTemplate | null>;
}
