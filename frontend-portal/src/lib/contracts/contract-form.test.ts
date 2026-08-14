import { describe, expect, it } from "vitest";

import {
  EMPTY_CONTRACT_FORM,
  validateContractForm,
} from "@/lib/contracts/contract-form";

describe("validateContractForm", () => {
  it("reports field-level errors for an incomplete contract", () => {
    const errors = validateContractForm(EMPTY_CONTRACT_FORM);

    expect(errors.clientName).toContain("Tên khách hàng");
    expect(errors.taxCode).toContain("mã số thuế");
    expect(errors.contractValue).toContain("Giá trị hợp đồng");
    expect(errors.scope).toContain("Phạm vi công việc");
  });

  it("accepts a complete, internally consistent contract", () => {
    const errors = validateContractForm({
      ...EMPTY_CONTRACT_FORM,
      contractType: "SERVICE",
      contractNumber: "HD-2026-0201",
      signedDate: "2026-08-13",
      effectiveDate: "2026-08-15",
      expiryDate: "2027-02-15",
      clientName: "Công ty Cổ phần Đông Nam",
      taxCode: "0314567890",
      representative: "Lê Quang Duy",
      representativeTitle: "Giám đốc",
      clientAddress: "Quận 3, Thành phố Hồ Chí Minh",
      clientEmail: "duy@dongnam.example",
      clientPhone: "0909123456",
      projectName: "Nền tảng quản trị vận hành",
      scope: "Phân tích, triển khai và chuyển giao hệ thống theo phụ lục kỹ thuật.",
      contractValue: "860000000",
      paymentTerm: "MILESTONE_3",
      warrantyMonths: "12",
      clauses: ["CONFIDENTIALITY", "DATA_PROTECTION"],
      notes: "",
    });

    expect(errors).toEqual({});
  });
});
