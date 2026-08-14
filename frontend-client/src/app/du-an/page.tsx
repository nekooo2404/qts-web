import type { Metadata } from "next";

import { ProjectGallery } from "@/components/projects/project-gallery";
import { PageIntro } from "@/components/shared/page-intro";

export const metadata: Metadata = {
  title: "Dự án",
  description: "Thư viện mô hình dự án minh họa cho các nhóm giải pháp của QTS.",
};

export default function ProjectsPage() {
  return (
    <>
      <PageIntro
        title="Hệ thống chỉ có giá trị khi đi vào vận hành."
        description="Thư viện dưới đây minh họa cách các nhóm bài toán an ninh, hạ tầng và dữ liệu có thể được chuyển thành những hệ thống cụ thể."
        aside={<p>Đây là dữ liệu seed và hình ảnh minh họa nội bộ, không phải hồ sơ khách hàng hay tuyên bố dự án đã nghiệm thu.</p>}
      />
      <section className="page-shell py-16 sm:py-20 lg:py-24" aria-label="Thư viện dự án minh họa">
        <ProjectGallery />
      </section>
    </>
  );
}
