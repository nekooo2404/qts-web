import { ArrowUpRight, MapPin, Phone } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

import { companyInfo, navigation } from "@/data/site-content";

export function SiteFooter() {
  return (
    <footer className="bg-qts-deep text-white">
      <div className="page-shell py-14 md:py-20">
        <div className="grid gap-12 border-b border-white/20 pb-12 md:grid-cols-[minmax(0,1.35fr)_minmax(0,0.65fr)] md:items-end">
          <div>
            <p className="display-wrap max-w-4xl text-3xl font-semibold leading-tight md:text-5xl">
              Một hệ thống tốt bắt đầu từ một bài toán được hiểu đúng.
            </p>
            <Link
              href="/lien-he"
              className="mt-8 inline-flex min-h-12 items-center gap-2 border-b border-qts-accent pb-2 font-semibold text-qts-accent transition-colors duration-200 hover:text-white active:translate-y-px"
            >
              Bắt đầu cuộc trao đổi
              <ArrowUpRight size={20} weight="bold" aria-hidden="true" />
            </Link>
          </div>

          <address className="not-italic text-sm leading-7 text-qts-secondary">
            <p className="flex items-center gap-2">
              <MapPin size={18} aria-hidden="true" />
              {companyInfo.address}
            </p>
            <p className="mt-2 flex items-center gap-2">
              <Phone size={18} aria-hidden="true" />
              {companyInfo.hotline}
            </p>
            <p className="mt-3 text-xs text-white/60">Thông tin mẫu từ dữ liệu seed của API.</p>
          </address>
        </div>

        <div className="flex flex-col gap-8 pt-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-2xl font-extrabold">QTS</p>
            <p className="mt-2 max-w-md text-sm leading-6 text-white/65">
              Tư vấn, tích hợp, bảo vệ và vận hành hệ thống số cho tổ chức Việt Nam.
            </p>
          </div>

          <nav aria-label="Điều hướng chân trang">
            <ul className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-white/75">
              {navigation.slice(1).map((item) => (
                <li key={item.href}>
                  <Link className="hover:text-white" href={item.href}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <p className="mt-10 text-xs text-white/65">
          © {new Date().getFullYear()} QTS. Nội dung dự án hiện là dữ liệu minh họa.
        </p>
      </div>
    </footer>
  );
}
