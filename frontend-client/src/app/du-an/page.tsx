import type { Metadata } from "next";

import { ProjectGallery } from "@/components/projects/project-gallery";
import { PageIntro } from "@/components/shared/page-intro";
import { getProjects } from "@/lib/public-api";

export const metadata: Metadata = {
  title: "Dự án",
  description: "Các hồ sơ kỹ thuật ẩn danh của QTS theo phạm vi hệ thống và mục tiêu thiết kế.",
};

export default async function ProjectsPage() {
  const projects = await getProjects();
  return (
    <main>
      <PageIntro
        variant="projects"
        title="Hồ sơ dự án, đọc như một system topology."
        description="Các dự án được ẩn danh và chỉ mô tả kiến trúc, lớp công nghệ cùng một số chỉ số đặc trưng của phạm vi hoặc mục tiêu thiết kế."
      />

      <section className="bg-qts-soft py-12 sm:py-16 lg:py-20" aria-labelledby="project-records-title">
        <div className="page-shell">
          <h2 id="project-records-title" className="sr-only">Hồ sơ kỹ thuật dự án</h2>
          <ProjectGallery items={projects} />
        </div>
      </section>

      <section className="border-y border-qts-border bg-qts-accent py-14 sm:py-16">
        <div className="page-shell grid gap-8 lg:grid-cols-12" data-reveal>
          <h2 className="display-wrap text-2xl font-bold leading-tight text-qts-deep sm:text-3xl lg:col-span-5">
            Cách đọc các con số trong hồ sơ.
          </h2>
          <dl className="grid border-y border-qts-deep/25 sm:grid-cols-2 lg:col-span-6 lg:col-start-7">
            <div className="border-b border-qts-deep/25 py-5 sm:border-b-0 sm:border-r sm:pr-6">
              <dt className="text-xs font-bold uppercase text-qts-primary">Phạm vi kỹ thuật</dt>
              <dd className="body-wrap mt-2 text-sm leading-6 text-qts-muted">Số lượng nguồn, lớp hoặc môi trường nằm trong biên thiết kế.</dd>
            </div>
            <div className="py-5 sm:pl-6">
              <dt className="text-xs font-bold uppercase text-qts-primary">Mục tiêu thiết kế</dt>
              <dd className="body-wrap mt-2 text-sm leading-6 text-qts-muted">Ngưỡng được đặt cho kiến trúc; không phải kết quả đã được xác nhận.</dd>
            </div>
          </dl>
        </div>
      </section>
    </main>
  );
}
