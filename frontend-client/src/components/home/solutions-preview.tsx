import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

import { solutions } from "@/data/site-content";

export function SolutionsPreview() {
  return (
    <section id="giai-phap" className="bg-qts-deep py-16 text-white sm:py-20 lg:py-28">
      <div className="page-shell" data-animate="animate__fadeIn">
        <div className="grid gap-6 lg:grid-cols-12 lg:items-end">
          <h2 className="display-wrap text-3xl font-bold leading-tight sm:text-4xl lg:col-span-6 lg:text-5xl">
            Bắt đầu bằng vấn đề cần giải quyết.
          </h2>
          <p className="max-w-xl text-base leading-7 text-qts-secondary lg:col-span-5 lg:col-start-8">
            Mỗi hướng giải pháp được đặt trong ngữ cảnh vận hành cụ thể, thay vì bắt đầu
            từ một danh sách công nghệ có sẵn.
          </p>
        </div>

        <div className="mt-12 border-t border-white/25">
          {solutions.map((item, index) => (
            <article
              key={item.id}
              className="grid gap-4 border-b border-white/20 py-7 md:grid-cols-[4rem_minmax(0,0.85fr)_3rem_minmax(0,1fr)] md:items-center"
            >
              <span className="text-sm font-bold text-qts-accent">0{index + 1}</span>
              <p className="display-wrap text-sm leading-6 text-white/65">{item.problem}</p>
              <ArrowRight className="hidden text-qts-accent md:block" size={22} aria-hidden="true" />
              <h3 className="display-wrap text-xl font-semibold leading-snug">{item.solution}</h3>
            </article>
          ))}
        </div>

        <Link
          href="/giai-phap"
          className="hvr-sweep-to-right mt-9 inline-flex min-h-12 items-center gap-2 bg-qts-primary px-5 font-semibold text-white"
        >
          Xem cách QTS tiếp cận
          <ArrowRight size={19} weight="bold" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
