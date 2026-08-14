export type ContractDataValue =
  | string
  | number
  | boolean
  | null
  | ContractDataValue[]
  | { [key: string]: ContractDataValue };

export interface GenerateContractDocumentInput {
  actorId: string;
  templateId: string;
  data: Record<string, ContractDataValue>;
}

export interface GeneratedContractDocument {
  buffer: Buffer;
  filename: string;
}
