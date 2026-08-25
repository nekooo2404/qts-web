import { Wrench } from "@phosphor-icons/react/dist/ssr";

import { Card } from "@/components/ui/card";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Hệ thống đang bảo trì",
  description: "QTS đang thực hiện bảo trì có kiểm soát.",
  path: "/maintenance",
});

export default function MaintenancePage() {
  return (
    <main className="recovery-page page-shell">
      <Card className="recovery-page__body">
        <Wrench size={34} weight="duotone" aria-hidden="true" />
        <p>Bảo trì có kiểm soát</p>
        <h1>QTS đang chuẩn bị lại một số dịch vụ.</h1>
        <span>Vui lòng quay lại sau. Yêu cầu khẩn cấp có thể gửi tới support@qts.com.vn.</span>
      </Card>
    </main>
  );
}
