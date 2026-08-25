"use client";

import { ArrowClockwise, House } from "@phosphor-icons/react";
import Link from "next/link";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(JSON.stringify({ event: "route_render_failed", digest: error.digest, message: error.message }));
  }, [error]);

  return (
    <main className="recovery-page page-shell">
      <Card className="recovery-page__body">
        <p>Không thể tải nội dung</p>
        <h1>Hệ thống chưa phản hồi như mong đợi.</h1>
        <span>Dữ liệu của bạn chưa bị thay đổi. Hãy thử tải lại hoặc quay về trang chủ.</span>
        <div className="recovery-page__actions">
          <Button type="button" onClick={reset}>
            <ArrowClockwise size={18} weight="bold" aria-hidden="true" />
            Thử lại
          </Button>
          <Button asChild variant="outline">
            <Link href="/">
              <House size={18} weight="bold" aria-hidden="true" />
              Về trang chủ
            </Link>
          </Button>
        </div>
        {error.digest ? <small>Mã sự cố: {error.digest}</small> : null}
      </Card>
    </main>
  );
}
