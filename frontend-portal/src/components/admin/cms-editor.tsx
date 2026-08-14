"use client";

import {
  ArrowCounterClockwise,
  Check,
  FloppyDisk,
  ImageSquare,
  UploadSimple,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import { type ChangeEvent, type FormEvent, useEffect, useMemo, useRef, useState } from "react";

import { INITIAL_CMS_DRAFT, type CmsDraft } from "@/lib/demo/admin-data";

type SaveState = "idle" | "saving" | "saved" | "error";

const FIELD_LABEL_CLASS = "mb-1.5 block text-sm font-semibold text-slate-800";

function validateDraft(draft: CmsDraft): string | null {
  if (draft.heroTitle.trim().length < 8) {
    return "Tiêu đề chính cần có ít nhất 8 ký tự.";
  }

  if (!draft.contactEmail.includes("@")) {
    return "Email liên hệ chưa đúng định dạng.";
  }

  if (!draft.primaryActionUrl.startsWith("/") && !draft.primaryActionUrl.startsWith("https://")) {
    return "Đường dẫn nút phải bắt đầu bằng / hoặc https://.";
  }

  return null;
}

export function CmsEditor() {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const imageObjectUrlRef = useRef<string | null>(null);
  const [draft, setDraft] = useState<CmsDraft>(INITIAL_CMS_DRAFT);
  const [savedDraft, setSavedDraft] = useState<CmsDraft>(INITIAL_CMS_DRAFT);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [savedImageFile, setSavedImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [message, setMessage] = useState<string | null>(null);

  const isDirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(savedDraft) || imageFile !== savedImageFile,
    [draft, imageFile, savedDraft, savedImageFile],
  );

  useEffect(() => {
    return () => {
      if (imageObjectUrlRef.current) URL.revokeObjectURL(imageObjectUrlRef.current);
    };
  }, []);

  function replaceImageFile(file: File | null) {
    if (imageObjectUrlRef.current) URL.revokeObjectURL(imageObjectUrlRef.current);

    const nextPreviewUrl = file ? URL.createObjectURL(file) : null;
    imageObjectUrlRef.current = nextPreviewUrl;
    setImagePreviewUrl(nextPreviewUrl);
    setImageFile(file);
  }

  function updateField<K extends keyof CmsDraft>(key: K, value: CmsDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setSaveState("idle");
    setMessage(null);
  }

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setSaveState("error");
      setMessage("Vui lòng chọn tệp ảnh PNG, JPG hoặc WEBP.");
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setSaveState("error");
      setMessage("Ảnh vượt quá giới hạn 5 MB. Hãy chọn tệp nhẹ hơn.");
      event.target.value = "";
      return;
    }

    replaceImageFile(file);
    setSaveState("idle");
    setMessage(null);
  }

  function clearImage() {
    replaceImageFile(null);
    if (imageInputRef.current) imageInputRef.current.value = "";
    setSaveState("idle");
    setMessage(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationError = validateDraft(draft);

    if (validationError) {
      setSaveState("error");
      setMessage(validationError);
      return;
    }

    setSaveState("saving");
    setMessage(null);
    await new Promise((resolve) => window.setTimeout(resolve, 550));
    setSavedDraft(draft);
    setSavedImageFile(imageFile);
    setSaveState("saved");
    setMessage("Đã lưu bản nháp trong phiên làm việc này. Chưa gửi dữ liệu lên máy chủ.");
  }

  function resetDraft() {
    setDraft(savedDraft);
    replaceImageFile(savedImageFile);
    if (imageInputRef.current) imageInputRef.current.value = "";
    setSaveState("idle");
    setMessage(null);
  }

  return (
    <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,0.72fr)] xl:items-start">
      <form className="portal-surface min-w-0 p-4 sm:p-6" onSubmit={handleSubmit}>
        <div className="mb-6 flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-950">Nội dung trang chủ</h2>
            <p className="mt-1 max-w-[65ch] text-sm leading-6 text-slate-600">
              Chỉnh thông điệp chính, nút hành động, thông tin liên hệ và metadata tìm kiếm.
            </p>
          </div>
          <span
            className={`w-fit rounded-md px-2.5 py-1 text-xs font-semibold ${
              isDirty ? "bg-portal-warning text-amber-950" : "bg-emerald-50 text-emerald-800"
            }`}
          >
            {isDirty ? "Có thay đổi chưa lưu" : "Bản nháp đã lưu"}
          </span>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={FIELD_LABEL_CLASS} htmlFor="hero-title">
              Tiêu đề chính
            </label>
            <input
              className="portal-field"
              id="hero-title"
              maxLength={90}
              onChange={(event) => updateField("heroTitle", event.target.value)}
              required
              value={draft.heroTitle}
            />
            <p className="mt-1 text-right text-xs text-slate-500">{draft.heroTitle.length}/90</p>
          </div>

          <div className="sm:col-span-2">
            <label className={FIELD_LABEL_CLASS} htmlFor="hero-summary">
              Mô tả ngắn
            </label>
            <textarea
              className="portal-field min-h-28 resize-y"
              id="hero-summary"
              maxLength={240}
              onChange={(event) => updateField("heroSummary", event.target.value)}
              required
              value={draft.heroSummary}
            />
            <p className="mt-1 text-right text-xs text-slate-500">{draft.heroSummary.length}/240</p>
          </div>

          <div>
            <label className={FIELD_LABEL_CLASS} htmlFor="action-label">
              Nhãn nút chính
            </label>
            <input
              className="portal-field"
              id="action-label"
              maxLength={36}
              onChange={(event) => updateField("primaryActionLabel", event.target.value)}
              required
              value={draft.primaryActionLabel}
            />
          </div>

          <div>
            <label className={FIELD_LABEL_CLASS} htmlFor="action-url">
              Đường dẫn nút
            </label>
            <input
              className="portal-field portal-data"
              id="action-url"
              onChange={(event) => updateField("primaryActionUrl", event.target.value)}
              placeholder="/lien-he"
              required
              value={draft.primaryActionUrl}
            />
          </div>

          <div className="sm:col-span-2">
            <label className={FIELD_LABEL_CLASS} htmlFor="contact-email">
              Email liên hệ công khai
            </label>
            <input
              className="portal-field"
              id="contact-email"
              onChange={(event) => updateField("contactEmail", event.target.value)}
              required
              type="email"
              value={draft.contactEmail}
            />
          </div>
        </div>

        <fieldset className="mt-7 border-t border-slate-200 pt-6">
          <legend className="px-2 text-sm font-bold text-slate-900">Hình ảnh đại diện</legend>
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <div>
              <label
                className="flex min-h-28 cursor-pointer items-center gap-3 rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-700 transition-colors hover:border-portal-brand hover:bg-portal-highlight/40 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-sky-600"
                htmlFor="hero-image"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-md bg-white text-portal-brand">
                  <UploadSimple size={21} weight="bold" />
                </span>
                <span>
                  <span className="block font-semibold">Chọn ảnh từ máy</span>
                  <span className="mt-0.5 block text-xs text-slate-500">PNG, JPG hoặc WEBP, tối đa 5 MB</span>
                </span>
                <input
                  accept="image/png,image/jpeg,image/webp"
                  className="sr-only"
                  id="hero-image"
                  onChange={handleImageChange}
                  ref={imageInputRef}
                  type="file"
                />
              </label>
              {imageFile ? (
                <p className="mt-2 truncate text-xs text-slate-600">Đã chọn: {imageFile.name}</p>
              ) : null}
            </div>
            {imagePreviewUrl ? (
              <button
                aria-label="Gỡ ảnh đã chọn"
                className="portal-btn portal-btn-secondary hvr-icon-grow"
                onClick={clearImage}
                type="button"
              >
                <X className="hvr-icon" size={18} />
                Gỡ ảnh
              </button>
            ) : null}
          </div>
        </fieldset>

        <fieldset className="mt-7 grid gap-5 border-t border-slate-200 pt-6 sm:grid-cols-2">
          <legend className="px-2 text-sm font-bold text-slate-900">Hiển thị trên công cụ tìm kiếm</legend>
          <div className="sm:col-span-2">
            <label className={FIELD_LABEL_CLASS} htmlFor="seo-title">
              Tiêu đề SEO
            </label>
            <input
              className="portal-field"
              id="seo-title"
              maxLength={65}
              onChange={(event) => updateField("seoTitle", event.target.value)}
              value={draft.seoTitle}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={FIELD_LABEL_CLASS} htmlFor="seo-description">
              Mô tả SEO
            </label>
            <textarea
              className="portal-field min-h-24 resize-y"
              id="seo-description"
              maxLength={160}
              onChange={(event) => updateField("seoDescription", event.target.value)}
              value={draft.seoDescription}
            />
          </div>
        </fieldset>

        {message ? (
          <div
            className={`mt-5 flex items-start gap-2 rounded-md px-3 py-2.5 text-sm ${
              saveState === "error"
                ? "bg-red-50 text-red-800"
                : "bg-emerald-50 text-emerald-800"
            }`}
            role={saveState === "error" ? "alert" : "status"}
          >
            {saveState === "error" ? (
              <WarningCircle className="mt-0.5 shrink-0" size={18} weight="fill" />
            ) : (
              <Check className="mt-0.5 shrink-0" size={18} weight="bold" />
            )}
            <span>{message}</span>
          </div>
        ) : null}

        <div className="mt-6 flex flex-col-reverse gap-2 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
          <button
            className="portal-btn portal-btn-secondary hvr-icon-rotate"
            disabled={!isDirty || saveState === "saving"}
            onClick={resetDraft}
            type="button"
          >
            <ArrowCounterClockwise className="hvr-icon" size={18} />
            Hoàn tác thay đổi
          </button>
          <button
            className="portal-btn portal-btn-primary hvr-icon-grow"
            disabled={!isDirty || saveState === "saving"}
            type="submit"
          >
            {saveState === "saving" ? (
              <span className="loading loading-spinner loading-xs" aria-hidden />
            ) : (
              <FloppyDisk className="hvr-icon" size={18} weight="bold" />
            )}
            {saveState === "saving" ? "Đang lưu..." : "Lưu bản nháp"}
          </button>
        </div>
      </form>

      <aside className="min-w-0 xl:sticky xl:top-24">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-950">Xem trước nội dung</h2>
            <p className="mt-1 text-xs text-slate-500">Cập nhật trực tiếp theo biểu mẫu</p>
          </div>
          <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">Bản nháp</span>
        </div>

        <div className="portal-surface overflow-hidden">
          <div className="relative aspect-[16/9] min-h-48 bg-portal-highlight">
            {imagePreviewUrl ? (
              // User-selected object URLs are local preview data and do not benefit from image optimization.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt="Ảnh đại diện trang chủ đang xem trước"
                className="size-full object-cover"
                src={imagePreviewUrl}
              />
            ) : (
              <div className="grid size-full place-items-center px-6 text-center text-portal-brand">
                <div>
                  <ImageSquare className="mx-auto" size={42} weight="duotone" />
                  <p className="mt-3 text-sm font-semibold">Chưa chọn ảnh mới</p>
                  <p className="mt-1 text-xs text-sky-900/75">Ảnh hiện tại trên website sẽ được giữ nguyên.</p>
                </div>
              </div>
            )}
          </div>
          <div className="p-5 sm:p-6">
            <h3 className="break-words text-xl font-bold leading-tight text-portal-brand sm:text-2xl">
              {draft.heroTitle || "Tiêu đề trang chủ"}
            </h3>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              {draft.heroSummary || "Mô tả ngắn sẽ xuất hiện tại đây."}
            </p>
            <span className="mt-5 inline-flex min-h-11 max-w-full items-center rounded-md bg-portal-brand px-4 text-sm font-semibold text-white">
              <span className="truncate">{draft.primaryActionLabel || "Nút hành động"}</span>
            </span>
          </div>
        </div>

        <div className="mt-4 border-t border-slate-200 pt-4">
          <p className="text-xs font-semibold text-slate-500">Kết quả tìm kiếm mẫu</p>
          <p className="mt-2 break-words text-base font-semibold text-portal-brand">
            {draft.seoTitle || "Tiêu đề SEO"}
          </p>
          <p className="mt-1 break-all text-xs text-emerald-700">qts.com.vn{draft.primaryActionUrl}</p>
          <p className="mt-1 line-clamp-3 text-sm leading-5 text-slate-600">
            {draft.seoDescription || "Mô tả SEO sẽ xuất hiện tại đây."}
          </p>
        </div>
      </aside>
    </div>
  );
}
