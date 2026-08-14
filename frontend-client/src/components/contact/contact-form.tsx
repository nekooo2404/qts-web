"use client";

import {
  CheckCircle,
  CircleNotch,
  PaperPlaneTilt,
  WarningCircle,
} from "@phosphor-icons/react";
import { Button, Label, Textarea, TextInput } from "flowbite-react";
import type { FormEvent } from "react";
import { useState } from "react";

type SubmissionState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };

interface CreatedLeadResponse {
  data: {
    id: string;
    status: "NEW";
    createdAt: string;
  };
}

const configuredApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
const apiBaseUrl = (
  configuredApiBaseUrl ||
  (process.env.NODE_ENV === "development" ? "http://localhost:3001" : "")
).replace(/\/+$/u, "");

function isCreatedLeadResponse(value: unknown): value is CreatedLeadResponse {
  if (typeof value !== "object" || value === null || !("data" in value)) {
    return false;
  }

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

function getFailureMessage(status: number): string {
  if (status === 413) {
    return "Nội dung gửi lên vượt quá giới hạn cho phép. Vui lòng rút gọn lời nhắn.";
  }

  if (status === 422) {
    return "Một số thông tin chưa hợp lệ. Vui lòng kiểm tra lại các trường trong biểu mẫu.";
  }

  if (status === 429) {
    return "Có quá nhiều yêu cầu trong thời gian ngắn. Vui lòng chờ một lúc rồi thử lại.";
  }

  if (status >= 500) {
    return "Dịch vụ liên hệ đang tạm thời gián đoạn. Yêu cầu chưa được ghi nhận, vui lòng thử lại sau.";
  }

  return "Không thể gửi yêu cầu ở thời điểm này. Vui lòng kiểm tra thông tin và thử lại.";
}

export function ContactForm() {
  const [submission, setSubmission] = useState<SubmissionState>({ kind: "idle" });
  const isSubmitting = submission.kind === "submitting";
  const isContactAvailable = apiBaseUrl.length > 0;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isContactAvailable) {
      setSubmission({
        kind: "error",
        message:
          "Kênh liên hệ trực tuyến chưa được cấu hình cho môi trường này. Yêu cầu chưa được gửi.",
      });
      return;
    }

    const form = event.currentTarget;
    if (!form.reportValidity() || isSubmitting) {
      return;
    }

    const formData = new FormData(form);
    const payload = {
      customerName: String(formData.get("customerName") ?? "").trim(),
      phone: String(formData.get("phone") ?? "").trim(),
      email: String(formData.get("email") ?? "").trim(),
      message: String(formData.get("message") ?? "").trim(),
    };

    setSubmission({ kind: "submitting" });

    try {
      const response = await fetch(`${apiBaseUrl}/api/contact`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
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
          message:
            "Máy chủ chưa trả về xác nhận hợp lệ. Yêu cầu chưa được xác nhận, vui lòng thử lại sau.",
        });
        return;
      }

      form.reset();
      setSubmission({
        kind: "success",
        message: "Yêu cầu đã được hệ thống tiếp nhận. Cảm ơn bạn đã liên hệ QTS.",
      });
    } catch {
      setSubmission({
        kind: "error",
        message:
          "Không thể kết nối tới dịch vụ liên hệ. Yêu cầu chưa được gửi, vui lòng thử lại khi kết nối ổn định.",
      });
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      aria-busy={isSubmitting}
      className="border border-qts-border bg-qts-surface p-5 shadow-[var(--shadow-raised)] sm:p-8"
    >
      <div className="border-b border-qts-border pb-6">
        <p className="text-xs font-bold uppercase text-qts-primary">Thông tin yêu cầu</p>
        <h2 className="display-wrap mt-3 text-2xl font-bold text-qts-deep sm:text-3xl">
          Chia sẻ bài toán của bạn
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-qts-muted">
          Các trường có dấu <span aria-hidden="true">*</span> là bắt buộc. Thông tin chỉ
          được gửi khi hệ thống xác nhận tiếp nhận thành công.
        </p>
      </div>

      <div className="mt-7 grid gap-6 sm:grid-cols-2">
        <div>
          <div className="mb-2 block">
            <Label htmlFor="customerName">
              Họ và tên <span aria-hidden="true" className="text-[var(--color-error)]">*</span>
            </Label>
          </div>
          <TextInput
            id="customerName"
            name="customerName"
            type="text"
            autoComplete="name"
            minLength={2}
            maxLength={120}
            required
            disabled={isSubmitting}
            placeholder="Nguyễn Minh Anh"
            className="[&_input]:rounded-none [&_input]:border-qts-border [&_input]:bg-white [&_input]:text-qts-ink [&_input]:focus:border-qts-primary [&_input]:focus:ring-qts-primary"
          />
        </div>

        <div>
          <div className="mb-2 block">
            <Label htmlFor="phone">
              Số điện thoại <span aria-hidden="true" className="text-[var(--color-error)]">*</span>
            </Label>
          </div>
          <TextInput
            id="phone"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            pattern="(?:0[0-9 ]{8,20}|[+][1-9][0-9 ]{7,20})"
            title="Dùng số Việt Nam bắt đầu bằng 0 hoặc số quốc tế bắt đầu bằng dấu cộng."
            required
            disabled={isSubmitting}
            placeholder="0901 234 567"
            aria-describedby="phone-help"
            className="[&_input]:rounded-none [&_input]:border-qts-border [&_input]:bg-white [&_input]:text-qts-ink [&_input]:focus:border-qts-primary [&_input]:focus:ring-qts-primary"
          />
          <p id="phone-help" className="mt-2 text-xs leading-5 text-qts-muted">
            Số Việt Nam bắt đầu bằng 0 hoặc số quốc tế bắt đầu bằng +.
          </p>
        </div>

        <div className="sm:col-span-2">
          <div className="mb-2 block">
            <Label htmlFor="email">
              Email <span aria-hidden="true" className="text-[var(--color-error)]">*</span>
            </Label>
          </div>
          <TextInput
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            maxLength={254}
            required
            disabled={isSubmitting}
            placeholder="ban@doanhnghiep.vn"
            className="[&_input]:rounded-none [&_input]:border-qts-border [&_input]:bg-white [&_input]:text-qts-ink [&_input]:focus:border-qts-primary [&_input]:focus:ring-qts-primary"
          />
        </div>

        <div className="sm:col-span-2">
          <div className="mb-2 block">
            <Label htmlFor="message">
              Nội dung cần trao đổi{" "}
              <span aria-hidden="true" className="text-[var(--color-error)]">*</span>
            </Label>
          </div>
          <Textarea
            id="message"
            name="message"
            rows={7}
            minLength={10}
            maxLength={5000}
            required
            disabled={isSubmitting}
            placeholder="Mô tả mục tiêu, hiện trạng hoặc vấn đề bạn muốn QTS cùng phân tích..."
            aria-describedby="message-help"
            className="resize-y rounded-none border-qts-border bg-white text-qts-ink focus:border-qts-primary focus:ring-qts-primary"
          />
          <p id="message-help" className="mt-2 text-xs leading-5 text-qts-muted">
            Từ 10 đến 5.000 ký tự. Không gửi mật khẩu hoặc thông tin bí mật.
          </p>
        </div>
      </div>

      <div className="mt-7 flex flex-col gap-4 border-t border-qts-border pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-md text-xs leading-5 text-qts-muted">
          Khi gửi biểu mẫu, dữ liệu sẽ được chuyển tới API liên hệ của QTS để ghi nhận yêu
          cầu.
        </p>
        <Button
          type="submit"
          disabled={isSubmitting || !isContactAvailable}
          className="hvr-sweep-to-right min-h-12 shrink-0 rounded-none bg-qts-primary px-2 font-bold text-white enabled:hover:bg-qts-deep focus:ring-qts-primary disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? (
            <>
              <CircleNotch size={19} weight="bold" className="mr-2 animate-spin" aria-hidden="true" />
              Đang gửi...
            </>
          ) : isContactAvailable ? (
            <>
              <PaperPlaneTilt size={19} weight="bold" className="mr-2" aria-hidden="true" />
              Gửi yêu cầu
            </>
          ) : (
            <>
              <WarningCircle size={19} weight="bold" className="mr-2" aria-hidden="true" />
              Kênh liên hệ chưa sẵn sàng
            </>
          )}
        </Button>
      </div>

      <div className="mt-5 min-h-16" aria-live="polite" aria-atomic="true">
        {submission.kind === "idle" && !isContactAvailable ? (
          <div
            role="status"
            className="flex gap-3 border border-qts-border bg-qts-soft p-4 text-sm leading-6 text-qts-deep"
          >
            <WarningCircle size={22} weight="fill" className="mt-0.5 shrink-0" aria-hidden="true" />
            <p>
              Kênh liên hệ trực tuyến chưa được cấu hình cho môi trường này. Biểu mẫu
              hiện không gửi dữ liệu.
            </p>
          </div>
        ) : null}

        {submission.kind === "success" ? (
          <div
            role="status"
            className="flex gap-3 border border-[var(--color-success)] bg-qts-success-soft p-4 text-sm leading-6 text-qts-success-ink"
          >
            <CheckCircle size={22} weight="fill" className="mt-0.5 shrink-0" aria-hidden="true" />
            <p>{submission.message}</p>
          </div>
        ) : null}

        {submission.kind === "error" ? (
          <div
            role="alert"
            className="flex gap-3 border border-[var(--color-error)] bg-qts-error-soft p-4 text-sm leading-6 text-qts-error-ink"
          >
            <WarningCircle size={22} weight="fill" className="mt-0.5 shrink-0" aria-hidden="true" />
            <p>{submission.message}</p>
          </div>
        ) : null}
      </div>
    </form>
  );
}
