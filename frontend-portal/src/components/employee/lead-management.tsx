"use client";

import {
  ArrowCounterClockwise,
  Eye,
  MagnifyingGlass,
  PencilSimple,
  Trash,
  X,
} from "@phosphor-icons/react";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";

import {
  LEAD_STATUSES,
  type DemoLead,
  type LeadStatus,
} from "@/lib/demo/employee-data";

const STATUS_PRESENTATION: Record<
  LeadStatus,
  { label: string; badgeClass: string }
> = {
  NEW: {
    label: "Mới",
    badgeClass: "bg-portal-highlight text-[var(--color-highlight-ink)]",
  },
  IN_PROGRESS: {
    label: "Đang xử lý",
    badgeClass: "bg-portal-brand/10 text-portal-brand",
  },
  CONTACTED: {
    label: "Đã liên hệ",
    badgeClass: "bg-[var(--color-success-soft)] text-[var(--color-success)]",
  },
  CLOSED: {
    label: "Đã đóng",
    badgeClass: "bg-[var(--color-paper-muted)] text-[var(--color-ink-muted)]",
  },
  SPAM: {
    label: "Thư rác",
    badgeClass: "bg-[var(--color-danger-soft)] text-[var(--color-danger)]",
  },
};

const ICON_BUTTON_CLASS =
  "hvr-icon-grow inline-grid size-11 shrink-0 place-items-center rounded-md border border-[var(--color-rule)] bg-[var(--color-paper-raised)] text-[var(--color-ink-muted)] transition-colors hover:border-[var(--color-rule-strong)] hover:bg-[var(--color-paper-muted)] hover:text-[var(--color-ink)] disabled:cursor-not-allowed disabled:opacity-50";

const LEAD_DATE_TIME_FORMATTER = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "Asia/Ho_Chi_Minh",
});

function formatDate(value: string): string {
  return LEAD_DATE_TIME_FORMATTER.format(new Date(value));
}

function normalizeSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("vi-VN")
    .trim();
}

function LeadStatusBadge({ status }: { status: LeadStatus }) {
  const presentation = STATUS_PRESENTATION[status];

  return (
    <span
      className={`badge h-7 rounded-md border-0 px-2.5 text-xs font-semibold ${presentation.badgeClass}`}
    >
      {presentation.label}
    </span>
  );
}

interface LeadActionsProps {
  lead: DemoLead;
  isEditing: boolean;
  onDelete: (lead: DemoLead) => void;
  onEdit: (leadId: string) => void;
  onView: (lead: DemoLead) => void;
}

function LeadActions({
  lead,
  isEditing,
  onDelete,
  onEdit,
  onView,
}: LeadActionsProps) {
  return (
    <div className="flex items-center justify-end gap-2">
      <button
        aria-label={`Xem khách hàng ${lead.customerName}`}
        className={ICON_BUTTON_CLASS}
        onClick={() => onView(lead)}
        title="Xem chi tiết"
        type="button"
      >
        <Eye aria-hidden className="hvr-icon" size={19} />
      </button>
      <button
        aria-label={`Chỉnh trạng thái ${lead.customerName}`}
        aria-pressed={isEditing}
        className={ICON_BUTTON_CLASS}
        onClick={() => onEdit(lead.id)}
        title="Chỉnh trạng thái"
        type="button"
      >
        <PencilSimple aria-hidden className="hvr-icon" size={19} />
      </button>
      <button
        aria-label={`Xóa khách hàng ${lead.customerName}`}
        className={`${ICON_BUTTON_CLASS} hover:border-[var(--color-danger)] hover:bg-[var(--color-danger-soft)] hover:text-[var(--color-danger)]`}
        onClick={() => onDelete(lead)}
        title="Xóa khỏi danh sách minh họa"
        type="button"
      >
        <Trash aria-hidden className="hvr-icon" size={19} />
      </button>
    </div>
  );
}

interface LeadManagementProps {
  initialLeads: readonly DemoLead[];
}

export function LeadManagement({ initialLeads }: LeadManagementProps) {
  const [leads, setLeads] = useState<DemoLead[]>(() => [...initialLeads]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<LeadStatus | "ALL">("ALL");
  const [editingLeadId, setEditingLeadId] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<DemoLead | null>(null);
  const [deletedLead, setDeletedLead] = useState<DemoLead | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const deferredQuery = useDeferredValue(query);

  const filteredLeads = useMemo(() => {
    const normalizedQuery = normalizeSearch(deferredQuery);

    return leads.filter((lead) => {
      const matchesStatus = status === "ALL" || lead.status === status;
      const searchableText = normalizeSearch(
        [lead.customerName, lead.email, lead.phone, lead.message, lead.id].join(" "),
      );
      return matchesStatus && (!normalizedQuery || searchableText.includes(normalizedQuery));
    });
  }, [deferredQuery, leads, status]);

  useEffect(() => {
    if (!selectedLead) return;

    returnFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedLead(null);
        return;
      }

      if (event.key !== "Tab") return;
      const focusableElements = dialogRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusableElements?.length) return;

      const first = focusableElements[0];
      const last = focusableElements[focusableElements.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      returnFocusRef.current?.focus();
      returnFocusRef.current = null;
    };
  }, [selectedLead]);

  function updateStatus(leadId: string, nextStatus: LeadStatus) {
    const lead = leads.find((item) => item.id === leadId);
    setLeads((current) =>
      current.map((item) =>
        item.id === leadId ? { ...item, status: nextStatus } : item,
      ),
    );
    setEditingLeadId(null);
    setAnnouncement(
      `Đã đổi trạng thái ${lead?.customerName ?? "khách hàng"} thành ${STATUS_PRESENTATION[nextStatus].label}.`,
    );
  }

  function deleteLead(lead: DemoLead) {
    setLeads((current) => current.filter((item) => item.id !== lead.id));
    setDeletedLead(lead);
    setEditingLeadId(null);
    setAnnouncement(`Đã xóa ${lead.customerName} khỏi danh sách minh họa.`);
  }

  function undoDelete() {
    if (!deletedLead) return;
    setLeads((current) => [deletedLead, ...current]);
    setAnnouncement(`Đã khôi phục ${deletedLead.customerName}.`);
    setDeletedLead(null);
  }

  function resetFilters() {
    setQuery("");
    setStatus("ALL");
  }

  const hasFilters = query.length > 0 || status !== "ALL";

  return (
    <section aria-labelledby="lead-list-heading">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <label className="mb-1.5 block text-sm font-semibold text-[var(--color-ink)]" htmlFor="lead-search">
            Tìm khách hàng
          </label>
          <div className="relative">
            <MagnifyingGlass
              aria-hidden
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-muted)]"
              size={19}
            />
            <input
              className="portal-field pl-10"
              id="lead-search"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tên, email, số điện thoại..."
              type="search"
              value={query}
            />
          </div>
        </div>

        <div className="sm:w-56">
          <label className="mb-1.5 block text-sm font-semibold text-[var(--color-ink)]" htmlFor="lead-status-filter">
            Trạng thái
          </label>
          <select
            className="select portal-field"
            id="lead-status-filter"
            onChange={(event) => setStatus(event.target.value as LeadStatus | "ALL")}
            value={status}
          >
            <option value="ALL">Tất cả trạng thái</option>
            {LEAD_STATUSES.map((item) => (
              <option key={item} value={item}>
                {STATUS_PRESENTATION[item].label}
              </option>
            ))}
          </select>
        </div>

        <button
          className="portal-btn portal-btn-secondary hvr-icon-spin"
          disabled={!hasFilters}
          onClick={resetFilters}
          type="button"
        >
          <ArrowCounterClockwise aria-hidden className="hvr-icon" size={18} />
          Đặt lại
        </button>
      </div>

      <div className="mb-3 flex min-h-8 flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-bold text-[var(--color-ink)]" id="lead-list-heading">
          Khách hàng được phân công
        </h2>
        <output
          aria-live="polite"
          className="portal-data text-xs text-[var(--color-ink-muted)]"
        >
          {filteredLeads.length} / {leads.length} bản ghi minh họa
        </output>
      </div>

      {deletedLead ? (
        <div
          className="mb-4 flex flex-col gap-3 rounded-md bg-[var(--color-warning-soft)] px-4 py-3 text-sm text-[var(--color-warning-soft-ink)] sm:flex-row sm:items-center sm:justify-between"
          role="status"
        >
          <span>
            Đã xóa <strong>{deletedLead.customerName}</strong> khỏi phiên minh họa.
          </span>
          <button
            className="portal-btn hvr-icon-back self-start border border-[var(--color-warning-soft-ink)]/30 bg-[var(--color-paper-raised)] text-[var(--color-warning-soft-ink)] sm:self-auto"
            onClick={undoDelete}
            type="button"
          >
            <ArrowCounterClockwise aria-hidden className="hvr-icon" size={18} />
            Hoàn tác
          </button>
        </div>
      ) : null}

      {filteredLeads.length === 0 ? (
        <div className="portal-surface flex min-h-64 flex-col items-center justify-center px-5 py-10 text-center">
          <MagnifyingGlass aria-hidden className="text-[var(--color-ink-muted)]" size={30} />
          <h3 className="mt-3 text-base font-bold text-[var(--color-ink)]">Không tìm thấy khách hàng</h3>
          <p className="mt-1 max-w-[48ch] text-sm leading-6 text-[var(--color-ink-muted)]">
            Thử từ khóa khác hoặc đặt lại bộ lọc để xem toàn bộ dữ liệu minh họa.
          </p>
          <button className="portal-btn portal-btn-secondary mt-4" onClick={resetFilters} type="button">
            Đặt lại bộ lọc
          </button>
        </div>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-md border border-[var(--color-rule)] bg-[var(--color-paper-raised)] md:block">
            <table className="table portal-table w-full">
              <caption className="sr-only">
                Danh sách khách hàng minh họa được phân công cho nhân viên
              </caption>
              <thead className="bg-[var(--color-paper-muted)] text-xs text-[var(--color-ink-muted)]">
                <tr>
                  <th className="px-4 py-3 font-semibold" scope="col">Khách hàng</th>
                  <th className="px-4 py-3 font-semibold" scope="col">Liên hệ</th>
                  <th className="px-4 py-3 font-semibold" scope="col">Trạng thái</th>
                  <th className="px-4 py-3 font-semibold" scope="col">Tiếp nhận</th>
                  <th className="px-4 py-3 text-right font-semibold" scope="col">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map((lead) => (
                  <tr className="border-t border-[var(--color-rule)]" key={lead.id}>
                    <td className="max-w-72 px-4 py-3 align-top">
                      <p className="font-semibold text-[var(--color-ink)]">{lead.customerName}</p>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--color-ink-muted)]">
                        {lead.message}
                      </p>
                    </td>
                    <td className="px-4 py-3 align-top text-sm">
                      <a className="block text-portal-brand hover:underline" href={`mailto:${lead.email}`}>
                        {lead.email}
                      </a>
                      <a className="portal-data mt-1 block text-xs text-[var(--color-ink-muted)] hover:text-portal-brand" href={`tel:${lead.phone.replaceAll(" ", "")}`}>
                        {lead.phone}
                      </a>
                    </td>
                    <td className="px-4 py-3 align-top">
                      {editingLeadId === lead.id ? (
                        <label className="block min-w-40">
                          <span className="sr-only">Trạng thái của {lead.customerName}</span>
                          <select
                            autoFocus
                            className="select portal-field min-h-10 py-1 text-sm"
                            onBlur={() => setEditingLeadId(null)}
                            onChange={(event) => updateStatus(lead.id, event.target.value as LeadStatus)}
                            value={lead.status}
                          >
                            {LEAD_STATUSES.map((item) => (
                              <option key={item} value={item}>{STATUS_PRESENTATION[item].label}</option>
                            ))}
                          </select>
                        </label>
                      ) : (
                        <LeadStatusBadge status={lead.status} />
                      )}
                    </td>
                    <td className="portal-data whitespace-nowrap px-4 py-3 align-top text-xs text-[var(--color-ink-muted)]">
                      {formatDate(lead.assignedAt)}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <LeadActions
                        isEditing={editingLeadId === lead.id}
                        lead={lead}
                        onDelete={deleteLead}
                        onEdit={(leadId) => setEditingLeadId((current) => current === leadId ? null : leadId)}
                        onView={setSelectedLead}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="space-y-3 md:hidden">
            {filteredLeads.map((lead) => (
              <li className="portal-surface p-4" key={lead.id}>
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-words font-semibold text-[var(--color-ink)]">{lead.customerName}</p>
                    <p className="portal-data mt-1 text-xs text-[var(--color-ink-muted)]">{formatDate(lead.assignedAt)}</p>
                  </div>
                  <LeadStatusBadge status={lead.status} />
                </div>
                <p className="mt-3 line-clamp-3 text-sm leading-6 text-[var(--color-ink-muted)]">{lead.message}</p>
                <div className="mt-3 border-t border-[var(--color-rule)] pt-3 text-sm">
                  <a className="block break-all text-portal-brand hover:underline" href={`mailto:${lead.email}`}>{lead.email}</a>
                  <a className="portal-data mt-1 block text-xs text-[var(--color-ink-muted)]" href={`tel:${lead.phone.replaceAll(" ", "")}`}>{lead.phone}</a>
                </div>
                {editingLeadId === lead.id ? (
                  <label className="mt-3 block">
                    <span className="mb-1.5 block text-sm font-semibold text-[var(--color-ink)]">Cập nhật trạng thái</span>
                    <select
                      autoFocus
                      className="select portal-field"
                      onChange={(event) => updateStatus(lead.id, event.target.value as LeadStatus)}
                      value={lead.status}
                    >
                      {LEAD_STATUSES.map((item) => (
                        <option key={item} value={item}>{STATUS_PRESENTATION[item].label}</option>
                      ))}
                    </select>
                  </label>
                ) : null}
                <div className="mt-3 flex justify-end border-t border-[var(--color-rule)] pt-3">
                  <LeadActions
                    isEditing={editingLeadId === lead.id}
                    lead={lead}
                    onDelete={deleteLead}
                    onEdit={(leadId) => setEditingLeadId((current) => current === leadId ? null : leadId)}
                    onView={setSelectedLead}
                  />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      <p aria-live="polite" className="sr-only">{announcement}</p>

      {selectedLead ? (
        <div
          aria-labelledby="lead-detail-title"
          aria-modal="true"
          className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-portal-brand/55 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelectedLead(null);
          }}
          role="dialog"
        >
          <div
            className="animate__animated animate__zoomIn animate__faster my-auto w-full max-w-xl rounded-md bg-[var(--color-paper-raised)] p-5 shadow-xl sm:p-6"
            ref={dialogRef}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="break-words text-xl font-bold text-[var(--color-ink)]" id="lead-detail-title">
                  {selectedLead.customerName}
                </h2>
                <p className="portal-data mt-1 text-xs text-[var(--color-ink-muted)]">{selectedLead.id}</p>
              </div>
              <button
                aria-label="Đóng chi tiết khách hàng"
                className={ICON_BUTTON_CLASS}
                onClick={() => setSelectedLead(null)}
                ref={closeButtonRef}
                type="button"
              >
                <X aria-hidden className="hvr-icon" size={20} />
              </button>
            </div>

            <dl className="mt-5 grid gap-4 border-y border-[var(--color-rule)] py-5 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold text-[var(--color-ink-muted)]">Trạng thái</dt>
                <dd className="mt-1.5"><LeadStatusBadge status={selectedLead.status} /></dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-[var(--color-ink-muted)]">Ngày tiếp nhận</dt>
                <dd className="portal-data mt-1.5 text-sm text-[var(--color-ink)]">{formatDate(selectedLead.assignedAt)}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-[var(--color-ink-muted)]">Email</dt>
                <dd className="mt-1.5 break-all text-sm"><a className="text-portal-brand hover:underline" href={`mailto:${selectedLead.email}`}>{selectedLead.email}</a></dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-[var(--color-ink-muted)]">Điện thoại</dt>
                <dd className="portal-data mt-1.5 text-sm"><a className="text-portal-brand hover:underline" href={`tel:${selectedLead.phone.replaceAll(" ", "")}`}>{selectedLead.phone}</a></dd>
              </div>
            </dl>
            <div className="mt-5">
              <h3 className="text-sm font-semibold text-[var(--color-ink)]">Nội dung yêu cầu</h3>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--color-ink-muted)]">{selectedLead.message}</p>
            </div>
            <div className="mt-6 flex justify-end">
              <button className="portal-btn portal-btn-primary" onClick={() => setSelectedLead(null)} type="button">Đóng</button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
