export type ContractFormType = "SERVICE" | "MAINTENANCE" | "NDA" | "SUPPLY";
export type PaymentTerm = "MILESTONE_3" | "MONTHLY" | "UPFRONT_50" | "ON_ACCEPTANCE";

export interface ContractFormValues {
  contractType: ContractFormType;
  contractNumber: string;
  signedDate: string;
  effectiveDate: string;
  expiryDate: string;
  clientName: string;
  taxCode: string;
  representative: string;
  representativeTitle: string;
  clientAddress: string;
  clientEmail: string;
  clientPhone: string;
  projectName: string;
  scope: string;
  contractValue: string;
  paymentTerm: PaymentTerm;
  warrantyMonths: string;
  clauses: string[];
  notes: string;
}

export type ContractFormErrors = Partial<Record<keyof ContractFormValues, string>>;

export const EMPTY_CONTRACT_FORM: ContractFormValues = {
  contractType: "SERVICE",
  contractNumber: "",
  signedDate: "",
  effectiveDate: "",
  expiryDate: "",
  clientName: "",
  taxCode: "",
  representative: "",
  representativeTitle: "",
  clientAddress: "",
  clientEmail: "",
  clientPhone: "",
  projectName: "",
  scope: "",
  contractValue: "",
  paymentTerm: "MILESTONE_3",
  warrantyMonths: "12",
  clauses: ["CONFIDENTIALITY", "DATA_PROTECTION"],
  notes: "",
};

const TAX_CODE_PATTERN = /^\d{10}(?:-\d{3})?$/;
const PHONE_PATTERN = /^(?:\+84|0)\d{9}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateContractForm(values: ContractFormValues): ContractFormErrors {
  const errors: ContractFormErrors = {};

  if (!values.contractNumber.trim()) errors.contractNumber = "Số hợp đồng là bắt buộc.";
  if (!values.signedDate) errors.signedDate = "Chọn ngày ký hợp đồng.";
  if (!values.effectiveDate) errors.effectiveDate = "Chọn ngày hiệu lực.";
  if (!values.expiryDate) errors.expiryDate = "Chọn ngày hết hạn.";
  if (
    values.effectiveDate &&
    values.expiryDate &&
    values.expiryDate < values.effectiveDate
  ) {
    errors.expiryDate = "Ngày hết hạn phải sau ngày hiệu lực.";
  }

  if (!values.clientName.trim()) errors.clientName = "Tên khách hàng là bắt buộc.";
  if (!TAX_CODE_PATTERN.test(values.taxCode.trim())) {
    errors.taxCode = "Nhập mã số thuế gồm 10 chữ số, có thể kèm mã chi nhánh.";
  }
  if (!values.representative.trim()) errors.representative = "Nhập người đại diện khách hàng.";
  if (!values.representativeTitle.trim()) {
    errors.representativeTitle = "Nhập chức danh người đại diện.";
  }
  if (!values.clientAddress.trim()) errors.clientAddress = "Nhập địa chỉ khách hàng.";
  if (!EMAIL_PATTERN.test(values.clientEmail.trim())) {
    errors.clientEmail = "Nhập email liên hệ hợp lệ.";
  }
  if (!PHONE_PATTERN.test(values.clientPhone.replaceAll(" ", ""))) {
    errors.clientPhone = "Nhập số điện thoại Việt Nam hợp lệ.";
  }
  if (!values.projectName.trim()) errors.projectName = "Tên dự án là bắt buộc.";
  if (values.scope.trim().length < 30) {
    errors.scope = "Phạm vi công việc cần ít nhất 30 ký tự để đủ rõ ràng.";
  }

  const contractValue = Number(values.contractValue);
  if (!Number.isFinite(contractValue) || contractValue <= 0) {
    errors.contractValue = "Giá trị hợp đồng phải lớn hơn 0.";
  }

  const warrantyMonths = Number(values.warrantyMonths);
  if (!Number.isInteger(warrantyMonths) || warrantyMonths < 0 || warrantyMonths > 120) {
    errors.warrantyMonths = "Thời hạn bảo hành phải từ 0 đến 120 tháng.";
  }

  return errors;
}
