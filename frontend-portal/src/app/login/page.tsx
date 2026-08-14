import { Buildings, UserCircleGear, UsersThree } from "@phosphor-icons/react/dist/ssr";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getHomePath } from "@/lib/auth/rbac";
import { getPortalSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Đăng nhập",
};

interface LoginPageProps {
  searchParams: Promise<{ error?: string; returnTo?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const [session, params] = await Promise.all([getPortalSession(), searchParams]);
  if (session) redirect(getHomePath(session.role));

  return (
    <main className="grid min-h-[100dvh] bg-white lg:grid-cols-[minmax(20rem,0.9fr)_minmax(34rem,1.1fr)]">
      <section className="relative hidden overflow-hidden bg-portal-brand px-10 py-12 text-white lg:flex lg:flex-col lg:justify-between xl:px-16">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-md bg-white text-xl font-black text-portal-brand">Q</span>
          <div>
            <p className="font-bold">QTS Internal Portal</p>
            <p className="text-xs text-white/60">Không gian vận hành nội bộ</p>
          </div>
        </div>

        <div className="max-w-xl">
          <Buildings size={48} weight="duotone" />
          <h1 className="mt-6 text-4xl font-bold leading-tight">Tập trung hồ sơ. Rõ người phụ trách.</h1>
          <p className="mt-4 max-w-[52ch] text-base leading-7 text-white/72">
            Truy cập khách hàng, tài nguyên dự án, hợp đồng và công việc nội bộ theo đúng vai trò của bạn.
          </p>
        </div>

        <p className="text-xs text-white/45">QTS Vietnam · Internal use only</p>
      </section>

      <section className="flex items-center justify-center bg-portal-paper px-4 py-10 sm:px-8">
        <div className="w-full max-w-xl">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="grid size-11 place-items-center rounded-md bg-portal-brand text-xl font-black text-white">Q</span>
            <div>
              <p className="font-bold text-slate-950">QTS Internal Portal</p>
              <p className="text-xs text-slate-500">Không gian vận hành nội bộ</p>
            </div>
          </div>

          <div className="portal-surface p-5 shadow-[0_24px_60px_-42px_rgba(22,38,96,0.65)] sm:p-8">
            <h2 className="text-2xl font-bold text-slate-950">Chọn không gian làm việc</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Đây là bộ chọn vai trò minh họa. Backend đã có API xác thực nội bộ; adapter danh tính và
              phân quyền cho ứng dụng Next.js chưa được kết nối.
            </p>

            {params.error ? (
              <p className="mt-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
                Không thể thiết lập phiên làm việc. Vui lòng chọn lại vai trò.
              </p>
            ) : null}

            <form action="/api/session" className="mt-6 space-y-4" method="post">
              <input name="returnTo" type="hidden" value={params.returnTo ?? ""} />

              <label className="group block cursor-pointer">
                <input className="peer sr-only" defaultChecked name="role" type="radio" value="EMPLOYEE" />
                <span className="flex min-h-24 items-center gap-4 rounded-md border border-slate-200 bg-white p-4 transition-colors group-hover:bg-slate-50 peer-checked:border-portal-brand peer-checked:bg-portal-highlight peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-sky-500">
                  <span className="grid size-12 shrink-0 place-items-center rounded-md bg-white text-portal-brand shadow-sm">
                    <UsersThree size={25} weight="duotone" />
                  </span>
                  <span>
                    <span className="block font-bold text-slate-950">Nhân viên</span>
                    <span className="mt-1 block text-sm text-slate-600">Khách hàng, tài nguyên dự án và tạo hợp đồng.</span>
                  </span>
                </span>
              </label>

              <label className="group block cursor-pointer">
                <input className="peer sr-only" name="role" type="radio" value="ADMIN" />
                <span className="flex min-h-24 items-center gap-4 rounded-md border border-slate-200 bg-white p-4 transition-colors group-hover:bg-slate-50 peer-checked:border-portal-brand peer-checked:bg-portal-highlight peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-sky-500">
                  <span className="grid size-12 shrink-0 place-items-center rounded-md bg-white text-portal-brand shadow-sm">
                    <UserCircleGear size={25} weight="duotone" />
                  </span>
                  <span>
                    <span className="block font-bold text-slate-950">Quản trị viên</span>
                    <span className="mt-1 block text-sm text-slate-600">Nhân sự, CMS, hợp đồng toàn công ty và công việc.</span>
                  </span>
                </span>
              </label>

              <button className="portal-btn portal-btn-primary mt-2 w-full" type="submit">
                Tiếp tục vào portal
              </button>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}
