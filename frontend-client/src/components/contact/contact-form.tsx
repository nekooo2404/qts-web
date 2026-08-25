"use client";

import {
  CheckCircle,
  CircleNotch,
  PaperPlaneTilt,
  WarningCircle,
} from "@phosphor-icons/react";
import Link from "next/link";
import type { FormEvent, FocusEvent } from "react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { PRIVACY_NOTICE_VERSION } from "@/lib/privacy";

type SubmissionState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };

type QualifierFieldName = "problemType" | "systemScale" | "privacyConsent";
type ContactFieldName = "customerName" | "email" | "phone" | "message";
type FieldName = QualifierFieldName | ContactFieldName;
type FieldErrors = Partial<Record<FieldName, string>>;

interface CreatedLeadResponse {
  data: {
    id: string;
    status: "NEW";
    createdAt: string;
  };
}

const contactFallbackMessage =
  "Hiện tại hệ thống đang được nâng cấp. Vui lòng liên hệ support@qts.com.vn hoặc hotline +84 24 7300 0888.";

const problemTypeOptions = [
  { id: "cybersecurity", label: "Cybersecurity" },
  { id: "infrastructure", label: "Infrastructure" },
  { id: "data-platform", label: "Data / Platform" },
  { id: "digital-transformation", label: "Digital Transformation" },
  { id: "other", label: "Other" },
] as const;

const systemScaleOptions = [
  { id: "under-100", label: "<100 users" },
  { id: "100-1000", label: "100–1,000" },
  { id: "1000-10000", label: "1,000–10,000" },
  { id: "enterprise", label: "Enterprise" },
] as const;

const fieldNames: FieldName[] = [
  "problemType",
  "systemScale",
  "customerName",
  "email",
  "phone",
  "message",
  "privacyConsent",
];
const fieldLabels: Record<FieldName, string> = {
  problemType: "Bài toán cần giải quyết",
  systemScale: "Quy mô hệ thống",
  customerName: "Họ và tên",
  email: "Email",
  phone: "Số điện thoại",
  message: "Mô tả",
  privacyConsent: "Đồng ý xử lý dữ liệu",
};
const fieldControlIds: Record<FieldName, string> = {
  problemType: "problemType-cybersecurity",
  systemScale: "systemScale-under-100",
  customerName: "customerName",
  email: "email",
  phone: "phone",
  message: "message",
  privacyConsent: "privacyConsent",
};
const maximumDescriptionLength = 4500;

function isCreatedLeadResponse(value: unknown): value is CreatedLeadResponse {
  if (typeof value !== "object" || value === null || !("data" in value)) return false;
  const data = value.data;
  return (
    typeof data === "object" &&
    data !== null &&
    "id" in data &&
    typeof data.id === "string" &&
    data.id.length > 0 &&
    "status" in data &&
    data.status === "NEW" &&
    "createdAt" in data &&
    typeof data.createdAt === "string" &&
    data.createdAt.length > 0
  );
}

function getFailureMessage(status: number) {
  if (status === 413) return "Nội dung vượt quá giới hạn. Vui lòng rút gọn phần mô tả.";
  if (status === 422) return "Một số thông tin chưa hợp lệ. Vui lòng kiểm tra lại biểu mẫu.";
  if (status === 429) return "Có quá nhiều yêu cầu trong thời gian ngắn. Vui lòng thử lại sau.";
  if (status >= 500) return contactFallbackMessage;
  return "Không thể gửi yêu cầu ở thời điểm này. Vui lòng kiểm tra và thử lại.";
}

function validateField(name: FieldName, rawValue: string): string | undefined {
  const value = rawValue.trim();

  if (name === "problemType") {
    const isKnownProblem = problemTypeOptions.some((option) => option.label === value);
    if (!isKnownProblem) return "Vui lòng chọn bài toán QTS cần cùng bạn giải quyết.";
  }

  if (name === "systemScale") {
    const isKnownScale = systemScaleOptions.some((option) => option.label === value);
    if (!isKnownScale) return "Vui lòng chọn quy mô hệ thống gần nhất.";
  }

  if (name === "customerName") {
    if (value.length < 2) return "Vui lòng nhập họ và tên, tối thiểu 2 ký tự.";
    if (value.length > 120) return "Họ và tên không được vượt quá 120 ký tự.";
  }

  if (name === "email") {
    if (!value) return "Vui lòng nhập email để QTS phản hồi.";
    if (value.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(value)) {
      return "Email chưa đúng định dạng, ví dụ ban@doanhnghiep.vn.";
    }
  }

  if (name === "phone") {
    if (!value) return "Vui lòng nhập số điện thoại.";
    if (!/^(?:0[0-9 ]{8,20}|\+[1-9][0-9 ]{7,20})$/u.test(value)) {
      return "Dùng số Việt Nam bắt đầu bằng 0 hoặc số quốc tế bắt đầu bằng +.";
    }
  }

  if (name === "message") {
    if (value.length < 10) return "Vui lòng mô tả vấn đề bằng ít nhất 10 ký tự.";
    if (value.length > maximumDescriptionLength) {
      return "Nội dung không được vượt quá 4.500 ký tự.";
    }
  }

  if (name === "privacyConsent" && value !== "accepted") {
    return "Vui lòng xác nhận bạn đã đọc thông báo quyền riêng tư.";
  }

  return undefined;
}

function buildQualifiedMessage(values: Record<FieldName, string>) {
  return [
    "ENGINEERING INTAKE",
    `Bài toán: ${values.problemType}`,
    `Quy mô hệ thống: ${values.systemScale}`,
    "",
    values.message,
  ].join("\n");
}

export function ContactForm() {
  const [submission, setSubmission] = useState<SubmissionState>({ kind: "idle" });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [showErrorSummary, setShowErrorSummary] = useState(false);
  const errorSummaryRef = useRef<HTMLDivElement>(null);
  const isSubmitting = submission.kind === "submitting";

  function handleBlur(event: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const name = event.currentTarget.name as FieldName;
    const error = validateField(name, event.currentTarget.value);
    setErrors((current) => ({ ...current, [name]: error }));
  }

  function clearFieldError(name: FieldName) {
    if (!errors[name]) return;
    setErrors((current) => ({ ...current, [name]: undefined }));
  }

  function handleInput(event: FormEvent<HTMLInputElement | HTMLTextAreaElement>) {
    clearFieldError(event.currentTarget.name as FieldName);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    const form = event.currentTarget;
    const formData = new FormData(form);
    const values = Object.fromEntries(
      fieldNames.map((name) => [name, String(formData.get(name) ?? "").trim()]),
    ) as Record<FieldName, string>;
    const nextErrors: FieldErrors = Object.fromEntries(
      fieldNames
        .map((name) => [name, validateField(name, values[name])] as const)
        .filter((entry): entry is readonly [FieldName, string] => Boolean(entry[1])),
    );

    setErrors(nextErrors);
    const firstInvalid = fieldNames.find((name) => nextErrors[name]);
    if (firstInvalid) {
      setShowErrorSummary(true);
      requestAnimationFrame(() => errorSummaryRef.current?.focus());
      return;
    }

    setShowErrorSummary(false);
    setSubmission({ kind: "submitting" });

    try {
      const payload = {
        customerName: values.customerName,
        email: values.email,
        phone: values.phone,
        message: buildQualifiedMessage(values),
        privacyConsent: true,
        privacyNoticeVersion: PRIVACY_NOTICE_VERSION,
      };
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        setSubmission({ kind: "error", message: getFailureMessage(response.status) });
        return;
      }

      const responseBody: unknown = await response.json().catch(() => null);
      if (!isCreatedLeadResponse(responseBody)) {
        setSubmission({
          kind: "error",
          message: "Máy chủ chưa trả về xác nhận hợp lệ. Yêu cầu chưa được xác nhận.",
        });
        return;
      }

      form.reset();
      setErrors({});
      setShowErrorSummary(false);
      setSubmission({
        kind: "success",
        message: "Yêu cầu đã được hệ thống tiếp nhận. Cảm ơn bạn đã liên hệ QTS.",
      });
    } catch {
      setSubmission({
        kind: "error",
        message: "Không thể gửi yêu cầu trực tuyến lúc này. Vui lòng liên hệ support@qts.com.vn hoặc hotline +84 24 7300 0888.",
      });
    }
  }

  const fieldProps = (name: FieldName) => ({
    "aria-invalid": Boolean(errors[name]),
    "aria-describedby": errors[name] ? `${name}-error` : undefined,
    onBlur: handleBlur,
    onInput: handleInput,
    disabled: isSubmitting,
  });

  const errorEntries = fieldNames.flatMap((name) => {
    const message = errors[name];
    return message ? [{ name, message }] : [];
  });

  return (
    <form
      noValidate
      onSubmit={handleSubmit}
      aria-busy={isSubmitting}
      className="contact-form"
    >
      <div className="contact-form__header">
        <p className="contact-eyebrow">Engineering intake</p>
        <h2 className="contact-form__title display-wrap">
          Xác định phạm vi hệ thống
        </h2>
        <p className="contact-form__intro body-wrap">
          Thông tin đầu vào giúp đội ngũ kỹ thuật chuẩn bị đúng phạm vi cho cuộc trao đổi đầu tiên.
        </p>
      </div>

      {showErrorSummary && errorEntries.length > 0 ? (
        <div
          ref={errorSummaryRef}
          className="intake-error-summary"
          role="alert"
          tabIndex={-1}
          aria-labelledby="intake-error-summary-title"
        >
          <h3 id="intake-error-summary-title" className="intake-error-summary__title">
            Cần kiểm tra {errorEntries.length} mục trước khi gửi
          </h3>
          <ul className="intake-error-summary__list">
            {errorEntries.map(({ name, message }) => (
              <li key={name}>
                <a
                  href={`#${fieldControlIds[name]}`}
                  onClick={(event) => {
                    event.preventDefault();
                    document.getElementById(fieldControlIds[name])?.focus();
                  }}
                >
                  {fieldLabels[name]}: {message}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <fieldset className="contact-step intake-step">
        <legend className="contact-step__legend">
          <span className="contact-step__number">01</span>
          <span>Bạn đang giải quyết bài toán gì?</span>
        </legend>
        <div className="intake-options intake-options--problem">
          {problemTypeOptions.map((option) => (
            <label
              key={option.id}
              className="intake-option"
              htmlFor={`problemType-${option.id}`}
            >
              <input
                id={`problemType-${option.id}`}
                className="intake-option__control"
                type="radio"
                name="problemType"
                value={option.label}
                required
                disabled={isSubmitting}
                aria-describedby={errors.problemType ? "problemType-error" : undefined}
                onChange={() => clearFieldError("problemType")}
              />
              <span className="intake-option__label">{option.label}</span>
              <span className="intake-option__marker" aria-hidden="true" />
            </label>
          ))}
        </div>
        <p
          id="problemType-error"
          role={errors.problemType ? "alert" : undefined}
          className="contact-field__message text-qts-error"
        >
          {errors.problemType ?? ""}
        </p>
      </fieldset>

      <fieldset className="contact-step intake-step">
        <legend className="contact-step__legend">
          <span className="contact-step__number">02</span>
          <span>Quy mô hệ thống</span>
        </legend>
        <div className="intake-options intake-options--scale">
          {systemScaleOptions.map((option) => (
            <label
              key={option.id}
              className="intake-option"
              htmlFor={`systemScale-${option.id}`}
            >
              <input
                id={`systemScale-${option.id}`}
                className="intake-option__control"
                type="radio"
                name="systemScale"
                value={option.label}
                required
                disabled={isSubmitting}
                aria-describedby={errors.systemScale ? "systemScale-error" : undefined}
                onChange={() => clearFieldError("systemScale")}
              />
              <span className="intake-option__label">{option.label}</span>
              <span className="intake-option__marker" aria-hidden="true" />
            </label>
          ))}
        </div>
        <p
          id="systemScale-error"
          role={errors.systemScale ? "alert" : undefined}
          className="contact-field__message text-qts-error"
        >
          {errors.systemScale ?? ""}
        </p>
      </fieldset>

      <fieldset className="contact-step">
        <legend className="contact-step__legend">
          <span className="contact-step__number">03</span>
          <span>Người liên hệ</span>
        </legend>
        <div className="contact-field">
          <input
            id="customerName"
            name="customerName"
            type="text"
            minLength={2}
            maxLength={120}
            autoComplete="name"
            aria-required="true"
            required
            placeholder=" "
            className="form-control"
            {...fieldProps("customerName")}
          />
          <label htmlFor="customerName">Họ và tên</label>
        </div>
        <p id="customerName-error" role={errors.customerName ? "alert" : undefined} className="contact-field__message text-qts-error">
          {errors.customerName ?? ""}
        </p>
      </fieldset>

      <fieldset className="contact-step">
        <legend className="contact-step__legend">
          <span className="contact-step__number">04</span>
          <span>Kênh phản hồi</span>
        </legend>
        <div className="contact-fields-grid">
          <div className="contact-field-group">
            <div className="contact-field">
            <input
              id="email"
              name="email"
              type="email"
              inputMode="email"
              maxLength={254}
              autoComplete="email"
              aria-required="true"
              required
              placeholder=" "
              className="form-control"
              {...fieldProps("email")}
            />
            <label htmlFor="email">Email</label>
            </div>
            <p id="email-error" role={errors.email ? "alert" : undefined} className="contact-field__message text-qts-error">
              {errors.email ?? ""}
            </p>
          </div>
          <div className="contact-field-group">
            <div className="contact-field">
            <input
              id="phone"
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              aria-required="true"
              required
              placeholder=" "
              className="form-control"
              {...fieldProps("phone")}
            />
            <label htmlFor="phone">Số điện thoại</label>
            </div>
            <p id="phone-error" role={errors.phone ? "alert" : undefined} className="contact-field__message text-qts-error">
              {errors.phone ?? ""}
            </p>
          </div>
        </div>
      </fieldset>

      <fieldset className="contact-step contact-step--last">
        <legend className="contact-step__legend">
          <span className="contact-step__number">05</span>
          <span>Mô tả</span>
        </legend>
        <div className="contact-field">
        <textarea
          id="message"
          name="message"
          minLength={10}
          maxLength={maximumDescriptionLength}
          aria-required="true"
          required
          placeholder=" "
          className="form-control"
          {...fieldProps("message")}
        />
        <label htmlFor="message">Hiện trạng, mục tiêu hoặc điểm nghẽn</label>
        </div>
        <p
          id="message-error"
          role={errors.message ? "alert" : undefined}
          className={`contact-field__message ${errors.message ? "text-qts-error" : "text-qts-muted"}`}
        >
          {errors.message ?? "Từ 10 đến 4.500 ký tự."}
        </p>
      </fieldset>

      <div className="contact-consent">
        <label htmlFor="privacyConsent">
          <input
            id="privacyConsent"
            name="privacyConsent"
            type="checkbox"
            value="accepted"
            required
            disabled={isSubmitting}
            aria-invalid={Boolean(errors.privacyConsent)}
            aria-describedby="contact-form-privacy privacyConsent-error"
            onChange={() => clearFieldError("privacyConsent")}
          />
          <span>
            Tôi đã đọc <Link href="/quyen-rieng-tu" target="_blank" rel="noopener noreferrer">Thông báo quyền riêng tư</Link> và đồng ý để QTS xử lý thông tin nhằm phản hồi yêu cầu này.
          </span>
        </label>
        <p id="privacyConsent-error" role={errors.privacyConsent ? "alert" : undefined} className="contact-field__message text-qts-error">
          {errors.privacyConsent ?? ""}
        </p>
      </div>

      <div className="contact-form__footer">
        <p id="contact-form-privacy" className="contact-form__legal body-wrap">
          QTS chỉ dùng thông tin để xử lý yêu cầu và phối hợp phản hồi. Bạn có thể yêu cầu truy cập, chỉnh sửa hoặc xóa dữ liệu qua support@qts.com.vn.
        </p>
        <Button
          type="submit"
          disabled={isSubmitting}
          size="lg"
          className="contact-form__submit"
          aria-label={isSubmitting ? "Đang gửi yêu cầu tư vấn" : "Gửi yêu cầu tư vấn đến QTS"}
          aria-describedby="contact-form-privacy"
        >
          {isSubmitting ? (
          <>
            <CircleNotch size={19} weight="bold" className="animate-spin" aria-hidden="true" />
            Đang gửi
          </>
          ) : (
          <>
            <PaperPlaneTilt size={19} weight="bold" aria-hidden="true" />
            Gửi yêu cầu tư vấn
          </>
          )}
        </Button>
      </div>

      <div className="contact-form__status" aria-live="polite" aria-atomic="true">
        {submission.kind === "success" ? (
          <div role="status" className="contact-status contact-status--success">
            <CheckCircle size={22} weight="fill" className="mt-0.5 shrink-0" aria-hidden="true" />
            <p>{submission.message}</p>
          </div>
        ) : null}
        {submission.kind === "error" ? (
          <div role="alert" className="contact-status contact-status--error">
            <WarningCircle size={22} weight="fill" className="mt-0.5 shrink-0" aria-hidden="true" />
            <p>{submission.message}</p>
          </div>
        ) : null}
      </div>
    </form>
  );
}
