import { Database } from "@phosphor-icons/react/dist/ssr";

import type { ContentFailureReason, ContentSource } from "@/lib/public-content/contracts";

export function ContentSourceNotice({
  source,
  reason,
}: {
  source: ContentSource;
  reason?: ContentFailureReason;
}) {
  if (source !== "fixture") return null;

  return (
    <aside className="content-source-notice" role="status" aria-live="polite">
      <Database size={17} weight="regular" aria-hidden="true" />
      <span>
        Đang hiển thị nội dung tham chiếu vì CMS chưa khả dụng.
        <small>Mã trạng thái: {reason ?? "unknown"}</small>
      </span>
    </aside>
  );
}
