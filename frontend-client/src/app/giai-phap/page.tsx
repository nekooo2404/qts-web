import type { Metadata } from "next";

import { PageIntro } from "@/components/shared/page-intro";
import { ProblemExplorer } from "@/components/solutions/solution-accordion";
import { getSolutions } from "@/lib/public-api";

export const metadata: Metadata = {
  title: "Giải pháp",
  description: "Các hướng kiến trúc của QTS cho an toàn thông tin, hạ tầng số và nền tảng dữ liệu.",
};

const deliveryPath = [
  ["01", "Bài toán", "Xác định điểm nghẽn, ràng buộc và trạng thái cần đạt."],
  ["02", "Kiến trúc", "Sắp xếp các lớp hệ thống, luồng dữ liệu và điểm kiểm soát."],
  ["03", "Kế hoạch", "Chia phạm vi thành các mốc có tiêu chí nghiệm thu rõ ràng."],
  ["04", "Vận hành", "Đưa khả năng quan sát và xử lý sự cố vào ngay từ thiết kế."],
] as const;

export default async function SolutionsPage() {
  const solutions = await getSolutions();
  return (
    <main>
      <PageIntro
        variant="solutions"
        title="Từ điểm nghẽn đến kiến trúc có thể vận hành."
        description="QTS không bắt đầu bằng danh mục công nghệ. Mỗi hướng giải pháp bắt đầu từ vấn đề, đi qua kiến trúc và kết thúc ở trạng thái cần đạt."
      />

      <section className="bg-qts-paper py-16 sm:py-20 lg:py-28">
        <div className="page-shell" data-reveal>
          <div className="grid gap-6 pb-10 lg:grid-cols-12 lg:items-end">
            <h2 className="display-wrap text-3xl font-bold leading-tight text-qts-deep sm:text-4xl lg:col-span-7 lg:text-5xl">
              Ba cấu trúc cho ba nhóm điểm nghẽn thường gặp.
            </h2>
            <p className="body-wrap text-base leading-7 text-qts-muted lg:col-span-4 lg:col-start-9">
              Mở từng hồ sơ để xem luồng kiến trúc và trạng thái vận hành mà thiết kế hướng đến.
            </p>
          </div>
          <ProblemExplorer items={solutions} />
        </div>
      </section>

      <section className="border-y border-qts-border bg-qts-soft py-16 sm:py-20">
        <div className="page-shell" data-reveal>
          <div className="grid gap-8 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <p className="text-sm font-bold uppercase text-qts-primary">Đường triển khai</p>
              <h2 className="display-wrap mt-3 text-3xl font-bold leading-tight text-qts-deep sm:text-4xl">
                Một giải pháp chỉ hoàn chỉnh khi có đường đi vào vận hành.
              </h2>
            </div>
            <ol className="border-y border-qts-border lg:col-span-7 lg:col-start-6">
              {deliveryPath.map(([code, title, description]) => (
                <li key={code} className="grid gap-4 border-b border-qts-border py-6 last:border-b-0 sm:grid-cols-[3rem_9rem_minmax(0,1fr)]">
                  <span className="text-sm font-bold text-qts-primary">{code}</span>
                  <h3 className="font-bold text-qts-deep">{title}</h3>
                  <p className="body-wrap text-sm leading-6 text-qts-muted">{description}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>
    </main>
  );
}
