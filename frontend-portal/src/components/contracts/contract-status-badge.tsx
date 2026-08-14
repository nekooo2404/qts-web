import type { ContractStatus } from "@/lib/contracts/filter-contracts";

const STATUS_META: Record<ContractStatus, { label: string; className: string }> = {
  DRAFT: { label: "Bản nháp", className: "bg-slate-100 text-slate-700" },
  PENDING: { label: "Chờ duyệt", className: "bg-amber-100 text-amber-900" },
  ACTIVE: { label: "Đang hiệu lực", className: "bg-emerald-100 text-emerald-800" },
  EXPIRING: { label: "Sắp hết hạn", className: "bg-portal-warning text-amber-950" },
  EXPIRED: { label: "Hết hiệu lực", className: "bg-red-100 text-red-800" },
};

export function ContractStatusBadge({ status }: { status: ContractStatus }) {
  const meta = STATUS_META[status];
  return (
    <span className={`badge badge-sm h-auto min-h-6 whitespace-nowrap border-0 px-2 font-semibold ${meta.className}`}>
      {meta.label}
    </span>
  );
}
