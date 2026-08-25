import { ArrowLeft, House } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function NotFound() {
  return (
    <main className="recovery-page page-shell">
      <Card className="recovery-page__body">
        <p>404 · Không tìm thấy</p>
        <h1>Đường dẫn này không còn trong bản đồ hệ thống.</h1>
        <span>Kiểm tra lại địa chỉ hoặc quay về một điểm bắt đầu đã xác nhận.</span>
        <div className="recovery-page__actions">
          <Button asChild>
            <Link href="/">
              <House size={18} weight="bold" aria-hidden="true" />
              Về trang chủ
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/lien-he">
              <ArrowLeft size={18} weight="bold" aria-hidden="true" />
              Liên hệ QTS
            </Link>
          </Button>
        </div>
      </Card>
    </main>
  );
}
