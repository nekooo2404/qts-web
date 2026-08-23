import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

import { ProjectGallery } from "@/components/projects/project-gallery";
import type { PublicProject } from "@/types/public-content";

export function ProjectsSection({ items }: { items?: PublicProject[] }) {
  return (
    <section id="du-an" className="bg-qts-surface py-16 sm:py-20 lg:py-28">
      <div className="page-shell">
        <div className="grid gap-6 border-b border-qts-border pb-8 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <p className="text-sm font-bold uppercase text-qts-primary">Phạm vi dự án</p>
            <h2 className="display-wrap mt-3 text-3xl font-bold leading-tight text-qts-deep sm:text-4xl lg:text-5xl">
              Hồ sơ kỹ thuật ẩn danh, đọc như một bản kiến trúc.
            </h2>
          </div>
          <div className="lg:col-span-4 lg:col-start-9">
            <p className="body-wrap text-sm leading-6 text-qts-muted">
              Số liệu chỉ thể hiện phạm vi kỹ thuật hoặc mục tiêu thiết kế; không đại diện cho kết quả kinh doanh đã nghiệm thu.
            </p>
            <Link
              href="/du-an"
              className="mt-5 inline-flex min-h-11 items-center gap-2 border-b-2 border-qts-primary pb-1 font-bold text-qts-primary"
            >
              Xem toàn bộ hồ sơ
              <ArrowUpRight size={19} weight="bold" aria-hidden="true" />
            </Link>
          </div>
        </div>
        <div className="mt-10">
          <ProjectGallery compact items={items} />
        </div>
      </div>
    </section>
  );
}
