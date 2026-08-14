import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

import { companyInfo } from "@/data/site-content";

export function HomeClosing() {
  return (
    <section className="bg-qts-accent py-16 sm:py-20">
      <div
        className="page-shell grid gap-8 lg:grid-cols-12 lg:items-end"
        data-animate="animate__fadeInUp"
      >
        <div className="lg:col-span-8">
          <h2 className="display-wrap text-3xl font-bold leading-tight text-qts-deep sm:text-4xl lg:text-5xl">
            Công nghệ chỉ có ý nghĩa khi tạo ra thay đổi trong vận hành.
          </h2>
          <p className="mt-5 max-w-3xl text-base leading-7 text-qts-muted">
            {companyInfo.mission}
          </p>
        </div>
        <Link
          href="/gioi-thieu"
          className="inline-flex min-h-12 items-center gap-2 self-start border-b-2 border-qts-deep pb-1 font-semibold text-qts-deep lg:col-span-3 lg:col-start-10 lg:self-end lg:justify-self-end"
        >
          Câu chuyện QTS
          <ArrowUpRight size={20} weight="bold" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
