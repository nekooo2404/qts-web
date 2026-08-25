import Link from "next/link";

import { DEFAULT_CONTACT_RETENTION_DAYS, PRIVACY_NOTICE_VERSION } from "@/lib/privacy";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Thông báo quyền riêng tư",
  description: "Cách QTS thu thập, sử dụng và bảo vệ dữ liệu trong biểu mẫu liên hệ.",
  path: "/quyen-rieng-tu",
});

function retentionDays() {
  const parsed = Number(process.env.CONTACT_RETENTION_DAYS ?? DEFAULT_CONTACT_RETENTION_DAYS);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : DEFAULT_CONTACT_RETENTION_DAYS;
}

export default function PrivacyPage() {
  return (
    <main className="policy-page page-shell">
      <article>
        <header>
          <p>Phiên bản {PRIVACY_NOTICE_VERSION}</p>
          <h1>Thông báo quyền riêng tư</h1>
          <span>Áp dụng cho biểu mẫu trao đổi trên website QTS.</span>
        </header>
        <section>
          <h2>Dữ liệu được thu thập</h2>
          <p>QTS nhận họ tên, email, số điện thoại, nhóm bài toán, quy mô hệ thống và nội dung bạn chủ động cung cấp.</p>
        </section>
        <section>
          <h2>Mục đích xử lý</h2>
          <p>Dữ liệu được dùng để xác minh yêu cầu, chuẩn bị phạm vi trao đổi kỹ thuật, phản hồi và bảo vệ hệ thống khỏi lạm dụng.</p>
        </section>
        <section>
          <h2>Thời hạn lưu</h2>
          <p>Dữ liệu liên hệ được lưu tối đa {retentionDays()} ngày, trừ khi cần lưu lâu hơn để thực hiện nghĩa vụ áp dụng hoặc giải quyết yêu cầu đang mở.</p>
        </section>
        <section>
          <h2>Chia sẻ và bảo vệ</h2>
          <p>QTS giới hạn quyền truy cập theo trách nhiệm công việc và không bán dữ liệu liên hệ. Nhà cung cấp hạ tầng chỉ được xử lý dữ liệu trong phạm vi vận hành dịch vụ.</p>
        </section>
        <section>
          <h2>Quyền của bạn</h2>
          <p>Bạn có thể yêu cầu truy cập, chỉnh sửa, rút lại đồng ý hoặc xóa dữ liệu bằng cách gửi email tới <a href="mailto:support@qts.com.vn">support@qts.com.vn</a>.</p>
        </section>
        <footer>
          <Link href="/lien-he">Quay lại biểu mẫu liên hệ</Link>
        </footer>
      </article>
    </main>
  );
}
