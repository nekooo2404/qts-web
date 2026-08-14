import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

import { ProjectGallery } from "@/components/projects/project-gallery";

export function ProjectsSection() {
  return (
    <section id="du-an" className="bg-qts-surface py-16 sm:py-20 lg:py-28">
      <div className="page-shell" data-animate="animate__fadeInUp">
        <div className="grid gap-6 border-b border-qts-border pb-8 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <p className="text-sm font-bold uppercase text-qts-primary">Thư viện dự án</p>
            <h2 className="display-wrap mt-3 text-3xl font-bold leading-tight text-qts-deep sm:text-4xl lg:text-5xl">
              Ba bối cảnh để nhìn rõ cách hệ thống tạo giá trị.
            </h2>
          </div>
          <div className="lg:col-span-4 lg:col-start-9">
            <p className="text-sm leading-6 text-qts-muted">
              Nội dung hiện dùng dữ liệu seed và hình minh họa nguyên bản. Đây chưa phải
              case study khách hàng đã được xác minh.
            </p>
            <Link
              href="/du-an"
              className="mt-5 inline-flex min-h-11 items-center gap-2 border-b-2 border-qts-primary pb-1 font-semibold text-qts-primary"
            >
              Xem toàn bộ dự án
              <ArrowUpRight size={19} weight="bold" aria-hidden="true" />
            </Link>
          </div>
        </div>

        <div className="mt-10">
          <ProjectGallery compact />
        </div>
      </div>
    </section>
  );
}
