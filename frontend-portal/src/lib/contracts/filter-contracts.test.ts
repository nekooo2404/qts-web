import { describe, expect, it } from "vitest";

import {
  filterContracts,
  type ContractRecord,
} from "@/lib/contracts/filter-contracts";

const contracts: ContractRecord[] = [
  {
    id: "HD-2026-0184",
    title: "Triển khai nền tảng dữ liệu",
    client: "Công ty Minh Hải",
    department: "Giải pháp số",
    owner: "Nguyễn Minh Anh",
    type: "SERVICE",
    status: "ACTIVE",
    value: 1280000000,
    signedAt: "2026-07-08",
    expiresAt: "2027-01-08",
  },
  {
    id: "HD-2026-0179",
    title: "Bảo trì hạ tầng mạng",
    client: "Bệnh viện An Phúc",
    department: "Hạ tầng",
    owner: "Trần Quốc Huy",
    type: "MAINTENANCE",
    status: "PENDING",
    value: 460000000,
    signedAt: "2026-06-16",
    expiresAt: "2026-12-16",
  },
];

describe("filterContracts", () => {
  it("combines search, status, department and value filters", () => {
    const result = filterContracts(contracts, {
      query: "minh hải",
      status: "ACTIVE",
      type: "ALL",
      department: "Giải pháp số",
      fromDate: "",
      toDate: "",
      minValue: "1000000000",
      maxValue: "",
      sort: "SIGNED_DESC",
    });

    expect(result.map((contract) => contract.id)).toEqual(["HD-2026-0184"]);
  });

  it("matches Vietnamese text without requiring exact casing", () => {
    const result = filterContracts(contracts, {
      query: "BỆNH VIỆN",
      status: "ALL",
      type: "ALL",
      department: "ALL",
      fromDate: "",
      toDate: "",
      minValue: "",
      maxValue: "",
      sort: "SIGNED_DESC",
    });

    expect(result[0]?.id).toBe("HD-2026-0179");
  });
});
