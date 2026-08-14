import type { Metadata } from "next";

import { PageIntro } from "@/components/shared/page-intro";
import { SolutionAccordion } from "@/components/solutions/solution-accordion";

export const metadata: Metadata = {
  title: "Giải pháp",
  description: "Các cặp vấn đề và hướng giải pháp công nghệ trong dữ liệu tham chiếu của QTS.",
};

export default function SolutionsPage() {
  return (
    <>
      <PageIntro
        title="Bắt đầu từ vấn đề, không bắt đầu từ sản phẩm."
        description="Mỗi hướng giải pháp được đặt cạnh bài toán vận hành tương ứng để giữ cho quyết định công nghệ có mục tiêu rõ ràng."
        aside={<p>Các mô tả đang ở mức định hướng từ dữ liệu seed; phạm vi, kiến trúc và tiêu chí nghiệm thu cần được xác lập theo từng dự án.</p>}
      />
      <section className="page-shell py-16 sm:py-20 lg:py-24" aria-labelledby="solution-map-title">
        <div className="mb-10 grid gap-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <div>
            <h2 id="solution-map-title" className="text-2xl font-semibold text-qts-deep sm:text-3xl">
              Bản đồ vấn đề → giải pháp
            </h2>
            <p className="mt-3 max-w-2xl leading-7 text-qts-muted">
              Mở từng mục để xem hướng xử lý đang được đề xuất.
            </p>
          </div>
          <p className="text-sm font-semibold text-qts-primary">03 hướng tham chiếu</p>
        </div>
        <SolutionAccordion />
      </section>
    </>
  );
}
