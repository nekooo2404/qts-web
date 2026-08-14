"use client";

import {
  Check,
  DownloadSimple,
  Eye,
  FileDoc,
  SpinnerGap,
  WarningCircle,
} from "@phosphor-icons/react";
import { useMemo, useState, useTransition } from "react";

import {
  EMPTY_CONTRACT_FORM,
  validateContractForm,
  type ContractFormErrors,
  type ContractFormValues,
} from "@/lib/contracts/contract-form";
import { formatCurrency, formatDate } from "@/lib/contracts/format";

const CONTRACT_TYPE_LABELS: Record<ContractFormValues["contractType"], string> = {
  SERVICE: "Hợp đồng dịch vụ",
  MAINTENANCE: "Hợp đồng bảo trì",
  NDA: "Thỏa thuận bảo mật",
  SUPPLY: "Hợp đồng cung cấp",
};

const CLAUSE_OPTIONS = [
  { value: "CONFIDENTIALITY", label: "Bảo mật thông tin" },
  { value: "DATA_PROTECTION", label: "Bảo vệ dữ liệu" },
  { value: "INTELLECTUAL_PROPERTY", label: "Quyền sở hữu trí tuệ" },
  { value: "FORCE_MAJEURE", label: "Sự kiện bất khả kháng" },
] as const;

const PAYMENT_LABELS: Record<ContractFormValues["paymentTerm"], string> = {
  MILESTONE_3: "03 đợt theo tiến độ",
  MONTHLY: "Đối soát hàng tháng",
  UPFRONT_50: "Tạm ứng 50%, thanh toán 50%",
  ON_ACCEPTANCE: "Thanh toán sau nghiệm thu",
};

interface FieldProps {
  error?: string;
  label: string;
  name: keyof ContractFormValues;
  required?: boolean;
  children: React.ReactNode;
}

function Field({ error, label, name, required = false, children }: FieldProps) {
  const errorId = `${name}-error`;
  return (
    <div className="grid min-w-0 gap-1.5">
      <label className="text-sm font-semibold text-slate-800" htmlFor={name}>
        {label}
        {required ? <span className="ml-1 text-red-700" aria-hidden>*</span> : null}
      </label>
      {children}
      <p className={`min-h-5 text-xs ${error ? "text-red-700" : "text-slate-500"}`} id={errorId}>
        {error ?? " "}
      </p>
    </div>
  );
}

export function ContractBuilder() {
  const [values, setValues] = useState<ContractFormValues>(EMPTY_CONTRACT_FORM);
  const [errors, setErrors] = useState<ContractFormErrors>({});
  const [touched, setTouched] = useState<Set<keyof ContractFormValues>>(() => new Set());
  const [successMessage, setSuccessMessage] = useState("");
  const [downloadError, setDownloadError] = useState("");
  const [isGenerating, startGenerating] = useTransition();

  const numericValue = Number(values.contractValue);
  const formattedValue = Number.isFinite(numericValue) && numericValue > 0
    ? formatCurrency(numericValue)
    : "Chưa nhập giá trị";

  const selectedClauseLabels = useMemo(() => {
    const selectedClauses = new Set(values.clauses);
    return CLAUSE_OPTIONS.filter((clause) => selectedClauses.has(clause.value)).map(
      (clause) => clause.label,
    );
  }, [values.clauses]);

  function updateField<K extends keyof ContractFormValues>(field: K, value: ContractFormValues[K]) {
    const nextValues = { ...values, [field]: value };
    setValues(nextValues);
    setSuccessMessage("");
    setDownloadError("");
    if (touched.has(field)) setErrors(validateContractForm(nextValues));
  }

  function markTouched(field: keyof ContractFormValues) {
    setTouched((current) => new Set(current).add(field));
    setErrors(validateContractForm(values));
  }

  function inputProps(field: keyof ContractFormValues, required = false) {
    return {
      "aria-describedby": `${field}-error`,
      "aria-invalid": Boolean(touched.has(field) && errors[field]),
      "aria-required": required || undefined,
      id: field,
      name: field,
      onBlur: () => markTouched(field),
      required,
    } as const;
  }

  function visibleError(field: keyof ContractFormValues): string | undefined {
    return touched.has(field) ? errors[field] : undefined;
  }

  function toggleClause(clause: string) {
    const clauses = values.clauses.includes(clause)
      ? values.clauses.filter((value) => value !== clause)
      : [...values.clauses, clause];
    updateField("clauses", clauses);
  }

  async function downloadDocument() {
    const nextErrors = validateContractForm(values);
    setErrors(nextErrors);
    setTouched(new Set(Object.keys(values) as Array<keyof ContractFormValues>));
    setDownloadError("");
    setSuccessMessage("");

    const firstError = Object.keys(nextErrors)[0] as keyof ContractFormValues | undefined;
    if (firstError) {
      document.getElementById(firstError)?.focus();
      return;
    }

    startGenerating(async () => {
      try {
        const { Document, HeadingLevel, Packer, Paragraph, TextRun } = await import("docx");
        const documentFile = new Document({
          sections: [
            {
              children: [
                new Paragraph({ text: "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM", alignment: "center" }),
                new Paragraph({ text: "Độc lập - Tự do - Hạnh phúc", alignment: "center" }),
                new Paragraph({ text: CONTRACT_TYPE_LABELS[values.contractType].toLocaleUpperCase("vi-VN"), heading: HeadingLevel.TITLE, alignment: "center", spacing: { before: 480 } }),
                new Paragraph({ text: `Số: ${values.contractNumber}`, alignment: "center" }),
                new Paragraph({ heading: HeadingLevel.HEADING_1, text: "1. Thông tin các bên", spacing: { before: 360 } }),
                new Paragraph({ children: [new TextRun({ bold: true, text: "Bên sử dụng dịch vụ: " }), new TextRun(values.clientName)] }),
                new Paragraph(`Mã số thuế: ${values.taxCode}`),
                new Paragraph(`Đại diện: ${values.representative} - ${values.representativeTitle}`),
                new Paragraph(`Địa chỉ: ${values.clientAddress}`),
                new Paragraph({ heading: HeadingLevel.HEADING_1, text: "2. Nội dung hợp đồng", spacing: { before: 300 } }),
                new Paragraph(`Dự án: ${values.projectName}`),
                new Paragraph(`Phạm vi: ${values.scope}`),
                new Paragraph(`Giá trị: ${formattedValue}`),
                new Paragraph(`Thanh toán: ${PAYMENT_LABELS[values.paymentTerm]}`),
                new Paragraph(`Thời hạn: ${formatDate(values.effectiveDate)} - ${formatDate(values.expiryDate)}`),
                new Paragraph(`Bảo hành: ${values.warrantyMonths} tháng`),
                new Paragraph({ heading: HeadingLevel.HEADING_1, text: "3. Điều khoản áp dụng", spacing: { before: 300 } }),
                ...selectedClauseLabels.map((label) => new Paragraph({ text: label, bullet: { level: 0 } })),
                ...(values.notes.trim() ? [new Paragraph({ heading: HeadingLevel.HEADING_1, text: "4. Ghi chú" }), new Paragraph(values.notes)] : []),
              ],
            },
          ],
        });

        const blob = await Packer.toBlob(documentFile);
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `${values.contractNumber.replaceAll("/", "-")}.docx`;
        anchor.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 0);
        setSuccessMessage("Hợp đồng .docx đã được tạo và tải xuống.");
      } catch {
        setDownloadError("Không thể tạo tệp .docx lúc này. Vui lòng thử lại.");
      }
    });
  }

  return (
    <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(20rem,0.75fr)]">
      <form className="min-w-0 space-y-5" onSubmit={(event) => event.preventDefault()}>
        <section className="portal-surface p-4 sm:p-6" aria-labelledby="contract-general-title">
          <div className="mb-5 flex items-center gap-3 border-b border-slate-200 pb-4">
            <span className="grid size-10 place-items-center rounded-md bg-portal-highlight text-portal-brand"><FileDoc size={21} weight="duotone" /></span>
            <div>
              <h2 className="font-bold text-slate-950" id="contract-general-title">Thông tin hợp đồng</h2>
              <p className="text-xs text-slate-500">Loại văn bản, số hiệu và thời hạn áp dụng.</p>
            </div>
          </div>
          <div className="grid gap-x-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Loại hợp đồng" name="contractType" required>
              <select className="portal-field select" {...inputProps("contractType", true)} value={values.contractType} onChange={(event) => updateField("contractType", event.target.value as ContractFormValues["contractType"])}>
                {Object.entries(CONTRACT_TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </Field>
            <Field error={visibleError("contractNumber")} label="Số hợp đồng" name="contractNumber" required>
              <input className="portal-field input" {...inputProps("contractNumber", true)} placeholder="HD-2026-0201" value={values.contractNumber} onChange={(event) => updateField("contractNumber", event.target.value)} />
            </Field>
            <Field error={visibleError("signedDate")} label="Ngày ký" name="signedDate" required>
              <input className="portal-field input" {...inputProps("signedDate", true)} type="date" value={values.signedDate} onChange={(event) => updateField("signedDate", event.target.value)} />
            </Field>
            <Field error={visibleError("effectiveDate")} label="Ngày hiệu lực" name="effectiveDate" required>
              <input className="portal-field input" {...inputProps("effectiveDate", true)} type="date" value={values.effectiveDate} onChange={(event) => updateField("effectiveDate", event.target.value)} />
            </Field>
            <Field error={visibleError("expiryDate")} label="Ngày hết hạn" name="expiryDate" required>
              <input className="portal-field input" {...inputProps("expiryDate", true)} type="date" value={values.expiryDate} onChange={(event) => updateField("expiryDate", event.target.value)} />
            </Field>
          </div>
        </section>

        <section className="portal-surface p-4 sm:p-6" aria-labelledby="client-title">
          <h2 className="mb-5 border-b border-slate-200 pb-4 font-bold text-slate-950" id="client-title">Thông tin khách hàng</h2>
          <div className="grid gap-x-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field error={visibleError("clientName")} label="Tên khách hàng" name="clientName" required>
              <input className="portal-field input" {...inputProps("clientName", true)} placeholder="Tên pháp lý đầy đủ" value={values.clientName} onChange={(event) => updateField("clientName", event.target.value)} />
            </Field>
            <Field error={visibleError("taxCode")} label="Mã số thuế" name="taxCode" required>
              <input className="portal-field input portal-data" {...inputProps("taxCode", true)} inputMode="numeric" placeholder="0314567890" value={values.taxCode} onChange={(event) => updateField("taxCode", event.target.value)} />
            </Field>
            <Field error={visibleError("representative")} label="Người đại diện" name="representative" required>
              <input className="portal-field input" {...inputProps("representative", true)} value={values.representative} onChange={(event) => updateField("representative", event.target.value)} />
            </Field>
            <Field error={visibleError("representativeTitle")} label="Chức danh" name="representativeTitle" required>
              <input className="portal-field input" {...inputProps("representativeTitle", true)} value={values.representativeTitle} onChange={(event) => updateField("representativeTitle", event.target.value)} />
            </Field>
            <Field error={visibleError("clientEmail")} label="Email liên hệ" name="clientEmail" required>
              <input className="portal-field input" {...inputProps("clientEmail", true)} type="email" value={values.clientEmail} onChange={(event) => updateField("clientEmail", event.target.value)} />
            </Field>
            <Field error={visibleError("clientPhone")} label="Điện thoại" name="clientPhone" required>
              <input className="portal-field input portal-data" {...inputProps("clientPhone", true)} inputMode="tel" placeholder="0909123456" value={values.clientPhone} onChange={(event) => updateField("clientPhone", event.target.value)} />
            </Field>
            <div className="sm:col-span-2 lg:col-span-3">
              <Field error={visibleError("clientAddress")} label="Địa chỉ" name="clientAddress" required>
                <input className="portal-field input" {...inputProps("clientAddress", true)} value={values.clientAddress} onChange={(event) => updateField("clientAddress", event.target.value)} />
              </Field>
            </div>
          </div>
        </section>

        <section className="portal-surface p-4 sm:p-6" aria-labelledby="scope-title">
          <h2 className="mb-5 border-b border-slate-200 pb-4 font-bold text-slate-950" id="scope-title">Phạm vi và thương mại</h2>
          <div className="grid gap-x-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="sm:col-span-2 lg:col-span-3">
              <Field error={visibleError("projectName")} label="Tên dự án" name="projectName" required>
                <input className="portal-field input" {...inputProps("projectName", true)} value={values.projectName} onChange={(event) => updateField("projectName", event.target.value)} />
              </Field>
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <Field error={visibleError("scope")} label="Phạm vi công việc" name="scope" required>
                <textarea className="portal-field textarea min-h-28 resize-y" {...inputProps("scope", true)} placeholder="Mô tả đầu ra, phạm vi triển khai và trách nhiệm bàn giao..." value={values.scope} onChange={(event) => updateField("scope", event.target.value)} />
              </Field>
            </div>
            <Field error={visibleError("contractValue")} label="Giá trị hợp đồng (VND)" name="contractValue" required>
              <input className="portal-field input portal-data" {...inputProps("contractValue", true)} inputMode="numeric" min="0" type="number" value={values.contractValue} onChange={(event) => updateField("contractValue", event.target.value)} />
            </Field>
            <Field label="Điều kiện thanh toán" name="paymentTerm" required>
              <select className="portal-field select" {...inputProps("paymentTerm", true)} value={values.paymentTerm} onChange={(event) => updateField("paymentTerm", event.target.value as ContractFormValues["paymentTerm"])}>
                {Object.entries(PAYMENT_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </Field>
            <Field error={visibleError("warrantyMonths")} label="Bảo hành (tháng)" name="warrantyMonths">
              <input className="portal-field input portal-data" {...inputProps("warrantyMonths")} max="120" min="0" type="number" value={values.warrantyMonths} onChange={(event) => updateField("warrantyMonths", event.target.value)} />
            </Field>
          </div>
        </section>

        <section className="portal-surface p-4 sm:p-6" aria-labelledby="clauses-title">
          <h2 className="font-bold text-slate-950" id="clauses-title">Điều khoản bổ sung</h2>
          <p className="mt-1 text-xs text-slate-500">Chọn các điều khoản sẽ xuất hiện trong tài liệu.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {CLAUSE_OPTIONS.map((clause) => (
              <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md border border-slate-200 px-3 py-2 hover:bg-slate-50" key={clause.value}>
                <input checked={values.clauses.includes(clause.value)} className="checkbox checkbox-sm border-slate-400 [--chkbg:var(--color-brand)] [--chkfg:var(--color-brand-ink)]" onChange={() => toggleClause(clause.value)} type="checkbox" />
                <span className="text-sm font-medium text-slate-700">{clause.label}</span>
              </label>
            ))}
          </div>
          <div className="mt-5">
            <Field label="Ghi chú nội bộ" name="notes">
              <textarea className="portal-field textarea min-h-24 resize-y" {...inputProps("notes")} value={values.notes} onChange={(event) => updateField("notes", event.target.value)} />
            </Field>
          </div>
        </section>
      </form>

      <aside className="min-w-0 xl:sticky xl:top-24 xl:self-start">
        <div className="portal-surface overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
            <div className="flex items-center gap-2 font-semibold text-slate-800"><Eye size={18} /> Xem trước</div>
            <span className="badge badge-sm border-0 bg-portal-highlight text-portal-brand">Tự động cập nhật</span>
          </div>
          <div className="m-4 min-h-[34rem] border border-slate-200 bg-white px-5 py-7 shadow-[0_18px_35px_-30px_rgba(22,38,96,0.5)] sm:px-7">
            <p className="text-center text-[11px] font-bold text-slate-700">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
            <p className="mt-1 text-center text-[10px] text-slate-600">Độc lập - Tự do - Hạnh phúc</p>
            <div className="mx-auto mt-2 h-px w-20 bg-slate-400" />
            <h3 className="mt-8 text-center text-base font-bold text-slate-950">{CONTRACT_TYPE_LABELS[values.contractType].toLocaleUpperCase("vi-VN")}</h3>
            <p className="mt-1 text-center text-xs text-slate-500">Số: {values.contractNumber || "Chưa cấp số"}</p>
            <dl className="mt-8 space-y-3 text-xs leading-5">
              <div><dt className="font-semibold text-slate-900">Khách hàng</dt><dd className="text-slate-600">{values.clientName || "Chưa nhập khách hàng"}</dd></div>
              <div><dt className="font-semibold text-slate-900">Dự án</dt><dd className="text-slate-600">{values.projectName || "Chưa nhập dự án"}</dd></div>
              <div><dt className="font-semibold text-slate-900">Thời hạn</dt><dd className="text-slate-600">{formatDate(values.effectiveDate)} - {formatDate(values.expiryDate)}</dd></div>
              <div><dt className="font-semibold text-slate-900">Giá trị</dt><dd className="portal-data text-slate-600">{formattedValue}</dd></div>
              <div><dt className="font-semibold text-slate-900">Thanh toán</dt><dd className="text-slate-600">{PAYMENT_LABELS[values.paymentTerm]}</dd></div>
            </dl>
            <div className="mt-6 border-t border-slate-200 pt-5">
              <p className="text-xs font-semibold text-slate-900">Phạm vi công việc</p>
              <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-slate-600">{values.scope || "Nội dung phạm vi sẽ hiển thị tại đây."}</p>
            </div>
          </div>
          <div className="border-t border-slate-200 p-4">
            {Object.keys(errors).length > 0 ? (
              <div className="mb-3 flex items-start gap-2 rounded-md bg-red-50 p-3 text-xs text-red-800" role="alert">
                <WarningCircle className="mt-0.5 shrink-0" size={17} weight="fill" />
                <span>Còn {Object.keys(errors).length} trường cần kiểm tra trước khi xuất hợp đồng.</span>
              </div>
            ) : null}
            {successMessage ? (
              <div className="mb-3 flex items-start gap-2 rounded-md bg-emerald-50 p-3 text-xs text-emerald-800" role="status">
                <Check className="mt-0.5 shrink-0" size={17} weight="bold" />
                <span>{successMessage}</span>
              </div>
            ) : null}
            {downloadError ? (
              <div className="mb-3 flex items-start gap-2 rounded-md bg-red-50 p-3 text-xs text-red-800" role="alert">
                <WarningCircle className="mt-0.5 shrink-0" size={17} weight="fill" />
                <span>{downloadError}</span>
              </div>
            ) : null}
            <button className="portal-btn portal-btn-primary hvr-icon-drop w-full" disabled={isGenerating} onClick={downloadDocument} type="button">
              {isGenerating ? <SpinnerGap className="animate-spin" size={19} /> : <DownloadSimple className="hvr-icon" size={19} weight="bold" />}
              {isGenerating ? "Đang tạo tài liệu..." : "Tải hợp đồng (.docx)"}
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
