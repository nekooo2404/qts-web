export type ContractType = "SERVICE" | "MAINTENANCE" | "NDA" | "SUPPLY";
export type ContractStatus = "DRAFT" | "PENDING" | "ACTIVE" | "EXPIRING" | "EXPIRED";

export interface ContractRecord {
  id: string;
  title: string;
  client: string;
  department: string;
  owner: string;
  type: ContractType;
  status: ContractStatus;
  value: number;
  signedAt: string;
  expiresAt: string;
}

export interface ContractFilters {
  query: string;
  status: ContractStatus | "ALL";
  type: ContractType | "ALL";
  department: string | "ALL";
  fromDate: string;
  toDate: string;
  minValue: string;
  maxValue: string;
  sort: "SIGNED_DESC" | "SIGNED_ASC" | "VALUE_DESC" | "EXPIRY_ASC";
}

export const EMPTY_CONTRACT_FILTERS: ContractFilters = {
  query: "",
  status: "ALL",
  type: "ALL",
  department: "ALL",
  fromDate: "",
  toDate: "",
  minValue: "",
  maxValue: "",
  sort: "SIGNED_DESC",
};

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase("vi-VN");
}

function parseOptionalNumber(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function filterContracts(
  contracts: readonly ContractRecord[],
  filters: ContractFilters,
): ContractRecord[] {
  const query = normalize(filters.query);
  const minValue = parseOptionalNumber(filters.minValue);
  const maxValue = parseOptionalNumber(filters.maxValue);

  const filtered = contracts.filter((contract) => {
    const searchable = normalize(
      [contract.id, contract.title, contract.client, contract.owner].join(" "),
    );

    return (
      (!query || searchable.includes(query)) &&
      (filters.status === "ALL" || contract.status === filters.status) &&
      (filters.type === "ALL" || contract.type === filters.type) &&
      (filters.department === "ALL" || contract.department === filters.department) &&
      (!filters.fromDate || contract.signedAt >= filters.fromDate) &&
      (!filters.toDate || contract.signedAt <= filters.toDate) &&
      (minValue === null || contract.value >= minValue) &&
      (maxValue === null || contract.value <= maxValue)
    );
  });

  return filtered.toSorted((left, right) => {
    switch (filters.sort) {
      case "SIGNED_ASC":
        return left.signedAt.localeCompare(right.signedAt);
      case "VALUE_DESC":
        return right.value - left.value;
      case "EXPIRY_ASC":
        return left.expiresAt.localeCompare(right.expiresAt);
      case "SIGNED_DESC":
      default:
        return right.signedAt.localeCompare(left.signedAt);
    }
  });
}
