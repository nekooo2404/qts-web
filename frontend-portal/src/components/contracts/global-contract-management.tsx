"use client";

import {
  ArrowCounterClockwise,
  DownloadSimple,
  Eye,
  Funnel,
  MagnifyingGlass,
  SlidersHorizontal,
  SpinnerGap,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import { useDeferredValue, useMemo, useRef, useState, useTransition } from "react";

import { ContractStatusBadge } from "@/components/contracts/contract-status-badge";
import { formatCurrency, formatDate } from "@/lib/contracts/format";
import {
  EMPTY_CONTRACT_FILTERS,
  filterContracts,
  type ContractFilters,
  type ContractRecord,
  type ContractStatus,
  type ContractType,
} from "@/lib/contracts/filter-contracts";

const STATUS_LABELS: Record<ContractStatus, string> = {
  DRAFT: "Bản nháp",
  PENDING: "Chờ duyệt",
  ACTIVE: "Đang hiệu lực",
  EXPIRING: "Sắp hết hạn",
  EXPIRED: "Hết hiệu lực",
};

const TYPE_LABELS: Record<ContractType, string> = {
  SERVICE: "Dịch vụ",
  MAINTENANCE: "Bảo trì",
  NDA: "Bảo mật",
  SUPPLY: "Cung cấp",
};

interface GlobalContractManagementProps {
  contracts: readonly ContractRecord[];
  departments: readonly string[];
}

export function GlobalContractManagement({ contracts, departments }: GlobalContractManagementProps) {
  const [filters, setFilters] = useState<ContractFilters>(EMPTY_CONTRACT_FILTERS);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<ContractRecord | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [isDownloading, startDownload] = useTransition();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const deferredQuery = useDeferredValue(filters.query);

  const filteredContracts = useMemo(
    () => filterContracts(contracts, { ...filters, query: deferredQuery }),
    [contracts, deferredQuery, filters],
  );

  const summary = useMemo(() => ({
    active: contracts.filter((contract) => contract.status === "ACTIVE").length,
    attention: contracts.filter((contract) => contract.status === "PENDING" || contract.status === "EXPIRING").length,
    totalValue: contracts.reduce((total, contract) => total + contract.value, 0),
  }), [contracts]);

  const hasFilters = JSON.stringify(filters) !== JSON.stringify(EMPTY_CONTRACT_FILTERS);

  function updateFilter<K extends keyof ContractFilters>(key: K, value: ContractFilters[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function resetFilters() {
    setFilters(EMPTY_CONTRACT_FILTERS);
    setAdvancedOpen(false);
  }

  function openDetail(contract: ContractRecord) {
    setSelectedContract(contract);
    dialogRef.current?.showModal();
  }

  function closeDetail() {
    dialogRef.current?.close();
    setSelectedContract(null);
  }

  function downloadContract(contract: ContractRecord) {
    setDownloadError(null);
    startDownload(async () => {
      try {
        const { Document, HeadingLevel, Packer, Paragraph, TextRun } = await import("docx");
        const documentFile = new Document({
          sections: [{
            children: [
              new Paragraph({ heading: HeadingLevel.TITLE, text: contract.title }),
              new Paragraph({ children: [new TextRun({ bold: true, text: "Số hợp đồng: " }), new TextRun(contract.id)] }),
              new Paragraph(`Khách hàng: ${contract.client}`),
              new Paragraph(`Đơn vị phụ trách: ${contract.department}`),
              new Paragraph(`Người phụ trách: ${contract.owner}`),
              new Paragraph(`Trạng thái: ${STATUS_LABELS[contract.status]}`),
              new Paragraph(`Giá trị: ${formatCurrency(contract.value)}`),
              new Paragraph(`Ngày ký: ${formatDate(contract.signedAt)}`),
              new Paragraph(`Ngày hết hạn: ${formatDate(contract.expiresAt)}`),
              new Paragraph({
                spacing: { before: 360 },
                text: "Tài liệu minh họa được xuất từ QTS Internal Portal. Chưa phải bản hợp đồng pháp lý đã ký.",
              }),
            ],
          }],
        });
        const blob = await Packer.toBlob(documentFile);
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `${contract.id}.docx`;
        anchor.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 0);
      } catch {
        setDownloadError("Không thể tạo bản hợp đồng minh họa. Vui lòng thử lại.");
      }
    });
  }

  return (
    <>
      <section className="grid gap-px overflow-hidden rounded-md border border-slate-200 bg-slate-200 sm:grid-cols-3" aria-label="Tổng quan hợp đồng minh họa">
        <div className="bg-white px-4 py-4 sm:px-5">
          <p className="text-xs font-medium text-slate-500">Đang hiệu lực</p>
          <p className="portal-data mt-1 text-2xl font-bold text-slate-950">{summary.active}</p>
        </div>
        <div className="bg-white px-4 py-4 sm:px-5">
          <p className="text-xs font-medium text-slate-500">Cần theo dõi</p>
          <p className="portal-data mt-1 text-2xl font-bold text-amber-800">{summary.attention}</p>
        </div>
        <div className="bg-white px-4 py-4 sm:px-5">
          <p className="text-xs font-medium text-slate-500">Tổng giá trị hồ sơ demo</p>
          <p className="portal-data mt-1 text-lg font-bold text-slate-950 sm:text-xl">{formatCurrency(summary.totalValue)}</p>
        </div>
      </section>

      {downloadError ? (
        <div className="mt-5 flex items-start gap-3 rounded-md bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          <WarningCircle className="mt-0.5 shrink-0" size={19} weight="fill" />
          <span className="min-w-0 flex-1">{downloadError}</span>
          <button aria-label="Đóng thông báo lỗi" className="grid size-8 shrink-0 place-items-center rounded-md hover:bg-red-100" onClick={() => setDownloadError(null)} type="button">
            <X size={16} />
          </button>
        </div>
      ) : null}

      <section className="portal-surface mt-5 p-4 sm:p-5" aria-labelledby="contract-filter-title">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <div className="min-w-0 flex-1">
            <label className="text-sm font-semibold text-slate-800" htmlFor="contract-search" id="contract-filter-title">Tìm kiếm hợp đồng</label>
            <div className="relative mt-1.5">
              <MagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={19} />
              <input
                className="portal-field input pl-10"
                id="contract-search"
                onChange={(event) => updateFilter("query", event.target.value)}
                placeholder="Số hợp đồng, khách hàng, tiêu đề, người phụ trách"
                type="search"
                value={filters.query}
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:w-[27rem]">
            <label className="grid gap-1.5 text-sm font-semibold text-slate-800" htmlFor="contract-status">
              Trạng thái
              <select className="portal-field select font-normal" id="contract-status" onChange={(event) => updateFilter("status", event.target.value as ContractFilters["status"])} value={filters.status}>
                <option value="ALL">Tất cả trạng thái</option>
                {Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-slate-800" htmlFor="contract-department">
              Đơn vị
              <select className="portal-field select font-normal" id="contract-department" onChange={(event) => updateFilter("department", event.target.value)} value={filters.department}>
                <option value="ALL">Tất cả đơn vị</option>
                {departments.map((department) => <option key={department} value={department}>{department}</option>)}
              </select>
            </label>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-200 pt-4">
          <button aria-expanded={advancedOpen} className="portal-btn portal-btn-secondary" onClick={() => setAdvancedOpen((current) => !current)} type="button">
            <SlidersHorizontal size={18} /> Bộ lọc nâng cao
          </button>
          {hasFilters ? (
            <button className="portal-btn portal-btn-secondary" onClick={resetFilters} type="button">
              <ArrowCounterClockwise size={18} /> Đặt lại
            </button>
          ) : null}
          <p className="ml-auto text-xs text-slate-500" role="status">
            Hiển thị <span className="portal-data font-semibold text-slate-800">{filteredContracts.length}</span> / {contracts.length} hồ sơ
          </p>
        </div>

        {advancedOpen ? (
          <div className="animate__animated animate__fadeIn mt-4 grid gap-4 rounded-md bg-slate-50 p-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
            <label className="grid gap-1.5 text-xs font-semibold text-slate-700" htmlFor="contract-type">
              Loại hợp đồng
              <select className="portal-field select text-sm font-normal" id="contract-type" onChange={(event) => updateFilter("type", event.target.value as ContractFilters["type"])} value={filters.type}>
                <option value="ALL">Tất cả loại</option>
                {Object.entries(TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label className="grid gap-1.5 text-xs font-semibold text-slate-700" htmlFor="contract-from-date">
              Ký từ ngày
              <input className="portal-field input text-sm font-normal" id="contract-from-date" onChange={(event) => updateFilter("fromDate", event.target.value)} type="date" value={filters.fromDate} />
            </label>
            <label className="grid gap-1.5 text-xs font-semibold text-slate-700" htmlFor="contract-to-date">
              Đến ngày
              <input className="portal-field input text-sm font-normal" id="contract-to-date" onChange={(event) => updateFilter("toDate", event.target.value)} type="date" value={filters.toDate} />
            </label>
            <label className="grid gap-1.5 text-xs font-semibold text-slate-700" htmlFor="contract-min-value">
              Giá trị tối thiểu
              <input className="portal-field input portal-data text-sm font-normal" id="contract-min-value" inputMode="numeric" min="0" onChange={(event) => updateFilter("minValue", event.target.value)} placeholder="0" type="number" value={filters.minValue} />
            </label>
            <label className="grid gap-1.5 text-xs font-semibold text-slate-700" htmlFor="contract-max-value">
              Giá trị tối đa
              <input className="portal-field input portal-data text-sm font-normal" id="contract-max-value" inputMode="numeric" min="0" onChange={(event) => updateFilter("maxValue", event.target.value)} placeholder="Không giới hạn" type="number" value={filters.maxValue} />
            </label>
            <label className="grid gap-1.5 text-xs font-semibold text-slate-700" htmlFor="contract-sort">
              Sắp xếp
              <select className="portal-field select text-sm font-normal" id="contract-sort" onChange={(event) => updateFilter("sort", event.target.value as ContractFilters["sort"])} value={filters.sort}>
                <option value="SIGNED_DESC">Ngày ký mới nhất</option>
                <option value="SIGNED_ASC">Ngày ký cũ nhất</option>
                <option value="VALUE_DESC">Giá trị cao nhất</option>
                <option value="EXPIRY_ASC">Hết hạn sớm nhất</option>
              </select>
            </label>
          </div>
        ) : null}
      </section>

      <section className="portal-surface mt-5 overflow-hidden" aria-label="Danh sách hợp đồng toàn công ty">
        {filteredContracts.length === 0 ? (
          <div className="grid min-h-72 place-items-center p-6 text-center">
            <div>
              <span className="mx-auto grid size-12 place-items-center rounded-md bg-slate-100 text-slate-500"><Funnel size={24} /></span>
              <h2 className="mt-4 font-bold text-slate-900">Không có hợp đồng phù hợp</h2>
              <p className="mt-1 text-sm text-slate-600">Thử thay đổi từ khóa, trạng thái hoặc khoảng giá trị.</p>
              <button className="portal-btn portal-btn-secondary mt-4" onClick={resetFilters} type="button">Xóa bộ lọc</button>
            </div>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="portal-table table w-full text-sm">
                <thead className="bg-slate-50 text-xs text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Hợp đồng</th>
                    <th className="px-4 py-3 font-semibold">Khách hàng</th>
                    <th className="px-4 py-3 font-semibold">Đơn vị / phụ trách</th>
                    <th className="px-4 py-3 font-semibold">Trạng thái</th>
                    <th className="px-4 py-3 text-right font-semibold">Giá trị</th>
                    <th className="px-4 py-3 font-semibold">Thời hạn</th>
                    <th className="px-4 py-3 text-right font-semibold"><span className="sr-only">Thao tác</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredContracts.map((contract) => (
                    <tr key={contract.id}>
                      <td className="max-w-72 px-4 py-4 align-top">
                        <p className="portal-data text-xs font-semibold text-portal-brand">{contract.id}</p>
                        <p className="mt-1 font-semibold text-slate-900">{contract.title}</p>
                        <p className="mt-1 text-xs text-slate-500">{TYPE_LABELS[contract.type]}</p>
                      </td>
                      <td className="max-w-56 px-4 py-4 align-top text-slate-700">{contract.client}</td>
                      <td className="px-4 py-4 align-top">
                        <p className="font-medium text-slate-800">{contract.department}</p>
                        <p className="mt-1 text-xs text-slate-500">{contract.owner}</p>
                      </td>
                      <td className="px-4 py-4 align-top"><ContractStatusBadge status={contract.status} /></td>
                      <td className="portal-data whitespace-nowrap px-4 py-4 text-right align-top font-semibold text-slate-800">{formatCurrency(contract.value)}</td>
                      <td className="whitespace-nowrap px-4 py-4 align-top text-xs text-slate-600">
                        <p>Ký: {formatDate(contract.signedAt)}</p>
                        <p className="mt-1">Hết hạn: {formatDate(contract.expiresAt)}</p>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <div className="flex justify-end gap-1">
                          <button aria-label={`Xem ${contract.id}`} className="hvr-grow grid size-11 place-items-center rounded-md text-slate-600 hover:bg-portal-highlight hover:text-portal-brand" onClick={() => openDetail(contract)} title="Xem chi tiết" type="button"><Eye size={19} /></button>
                          <button aria-label={`Tải ${contract.id}`} className="hvr-icon-drop grid size-11 place-items-center rounded-md text-slate-600 hover:bg-portal-highlight hover:text-portal-brand" disabled={isDownloading} onClick={() => downloadContract(contract)} title="Tải bản minh họa" type="button"><DownloadSimple className="hvr-icon" size={19} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="divide-y divide-slate-200 lg:hidden">
              {filteredContracts.map((contract) => (
                <li className="p-4" key={contract.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="portal-data text-xs font-semibold text-portal-brand">{contract.id}</p>
                      <h2 className="mt-1 font-semibold text-slate-950">{contract.title}</h2>
                    </div>
                    <ContractStatusBadge status={contract.status} />
                  </div>
                  <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-2">
                    <div><dt className="text-slate-500">Khách hàng</dt><dd className="mt-1 font-medium text-slate-800">{contract.client}</dd></div>
                    <div><dt className="text-slate-500">Đơn vị</dt><dd className="mt-1 font-medium text-slate-800">{contract.department}</dd></div>
                    <div><dt className="text-slate-500">Giá trị</dt><dd className="portal-data mt-1 font-semibold text-slate-800">{formatCurrency(contract.value)}</dd></div>
                    <div><dt className="text-slate-500">Hết hạn</dt><dd className="mt-1 font-medium text-slate-800">{formatDate(contract.expiresAt)}</dd></div>
                  </dl>
                  <div className="mt-4 flex gap-2">
                    <button className="portal-btn portal-btn-secondary flex-1" onClick={() => openDetail(contract)} type="button"><Eye size={18} /> Xem</button>
                    <button className="portal-btn portal-btn-secondary hvr-icon-drop flex-1" disabled={isDownloading} onClick={() => downloadContract(contract)} type="button"><DownloadSimple className="hvr-icon" size={18} /> Tải</button>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <dialog
        aria-labelledby="contract-detail-title"
        className="animate__animated animate__zoomIn m-auto max-h-[calc(100dvh-2rem)] w-[min(42rem,calc(100%-2rem))] overflow-y-auto rounded-lg bg-white p-0 text-slate-900 shadow-[0_28px_90px_-35px_rgba(22,38,96,0.75)]"
        onClose={() => setSelectedContract(null)}
        ref={dialogRef}
      >
        {selectedContract ? (
          <div>
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
              <div className="min-w-0">
                <p className="portal-data text-xs font-semibold text-portal-brand">{selectedContract.id}</p>
                <h2 className="mt-1 text-xl font-bold text-slate-950" id="contract-detail-title">
                  {selectedContract.title}
                </h2>
              </div>
              <button aria-label="Đóng chi tiết hợp đồng" className="grid size-11 shrink-0 place-items-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900" onClick={closeDetail} type="button"><X size={20} /></button>
            </div>
            <div className="p-5 sm:p-6">
              <div className="flex flex-wrap items-center gap-2"><ContractStatusBadge status={selectedContract.status} /><span className="badge border-slate-200 bg-white text-slate-700">{TYPE_LABELS[selectedContract.type]}</span></div>
              <dl className="mt-6 grid gap-x-6 gap-y-5 sm:grid-cols-2">
                <div><dt className="text-xs font-medium text-slate-500">Khách hàng</dt><dd className="mt-1 font-semibold text-slate-900">{selectedContract.client}</dd></div>
                <div><dt className="text-xs font-medium text-slate-500">Giá trị</dt><dd className="portal-data mt-1 font-semibold text-slate-900">{formatCurrency(selectedContract.value)}</dd></div>
                <div><dt className="text-xs font-medium text-slate-500">Đơn vị phụ trách</dt><dd className="mt-1 font-semibold text-slate-900">{selectedContract.department}</dd></div>
                <div><dt className="text-xs font-medium text-slate-500">Chuyên viên</dt><dd className="mt-1 font-semibold text-slate-900">{selectedContract.owner}</dd></div>
                <div><dt className="text-xs font-medium text-slate-500">Ngày ký</dt><dd className="mt-1 font-semibold text-slate-900">{formatDate(selectedContract.signedAt)}</dd></div>
                <div><dt className="text-xs font-medium text-slate-500">Ngày hết hạn</dt><dd className="mt-1 font-semibold text-slate-900">{formatDate(selectedContract.expiresAt)}</dd></div>
              </dl>
              <div className="mt-6 rounded-md bg-portal-highlight p-4 text-sm text-sky-950">
                Hồ sơ minh họa này chưa nối nội dung điều khoản, lịch sử duyệt hoặc tệp đã ký từ backend.
              </div>
            </div>
            <div className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
              <button className="portal-btn portal-btn-secondary" onClick={closeDetail} type="button">Đóng</button>
              <button autoFocus className="portal-btn portal-btn-primary hvr-icon-drop" disabled={isDownloading} onClick={() => downloadContract(selectedContract)} type="button">
                {isDownloading ? <SpinnerGap className="animate-spin" size={18} /> : <DownloadSimple className="hvr-icon" size={18} />}
                {isDownloading ? "Đang tạo..." : "Tải bản minh họa"}
              </button>
            </div>
          </div>
        ) : null}
      </dialog>
    </>
  );
}
