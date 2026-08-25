"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="vi" dir="ltr">
      <body>
        <main style={{ maxWidth: 720, margin: "0 auto", padding: "15vh 24px", fontFamily: "sans-serif" }}>
          <h1>QTS tạm thời không thể hiển thị trang này.</h1>
          <p>Vui lòng thử lại. Nếu sự cố tiếp tục, liên hệ support@qts.com.vn.</p>
          <button type="button" onClick={reset} style={{ minHeight: 44, padding: "10px 16px" }}>
            Thử lại
          </button>
        </main>
      </body>
    </html>
  );
}
