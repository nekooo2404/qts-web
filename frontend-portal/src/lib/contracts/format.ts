const CURRENCY_FORMATTER = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const DATE_FORMATTER = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC",
});

export function formatCurrency(value: number): string {
  return value === 0 ? "Không áp dụng" : CURRENCY_FORMATTER.format(value);
}

export function formatDate(value: string): string {
  if (!value) return "Chưa thiết lập";
  return DATE_FORMATTER.format(new Date(`${value}T00:00:00.000Z`));
}
