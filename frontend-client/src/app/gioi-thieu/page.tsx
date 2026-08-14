import type { Metadata } from "next";

import { PageIntro } from "@/components/shared/page-intro";
import { capabilities, companyInfo } from "@/data/site-content";

export const metadata: Metadata = {
  title: "Giới thiệu",
  description: "Định hướng, sứ mệnh và mô hình tổ chức tham chiếu của QTS.",
};

export default function AboutPage() {
  return (
    <>
      <PageIntro
        title="QTS đặt tính thực tiễn vào trung tâm của công nghệ."
        description="Hồ sơ hiện tại mô tả QTS như một đối tác kết nối tư vấn, tích hợp, an toàn thông tin và vận hành trong cùng một mạch triển khai."
        aside={<p>Thông tin giới thiệu đang dựa trên dữ liệu seed. Lịch sử thành lập, pháp nhân và đội ngũ chưa có nguồn xác nhận trong repository.</p>}
      />

      <section className="page-shell grid gap-12 py-16 sm:py-20 lg:grid-cols-12 lg:gap-8 lg:py-24" aria-labelledby="company-story-title">
        <div className="lg:col-span-5">
          <h2 id="company-story-title" className="text-2xl font-semibold text-qts-deep sm:text-3xl">
            Câu chuyện được định hình bởi cách làm
          </h2>
        </div>
        <div className="space-y-5 text-base leading-8 text-qts-muted lg:col-span-7 lg:text-lg">
          <p>
            Thay vì tách công nghệ khỏi bối cảnh sử dụng, định hướng nội dung của QTS bắt đầu bằng việc hiểu mục tiêu và ràng buộc vận hành, sau đó mới xác lập kiến trúc và lộ trình phù hợp.
          </p>
          <p>
            Sợi chỉ xuyên suốt là các giải pháp an toàn, thực tiễn và có cơ sở để đánh giá giá trị tạo ra. Đây là định hướng biên tập từ sứ mệnh hiện có, không thay thế hồ sơ doanh nghiệp đã được phê duyệt.
          </p>
        </div>
      </section>

      <section className="border-y border-qts-border bg-qts-primary text-white" aria-label="Tầm nhìn và sứ mệnh">
        <div className="page-shell grid lg:grid-cols-2">
          <article className="border-b border-white/25 py-12 lg:border-b-0 lg:border-r lg:py-16 lg:pr-12">
            <p className="text-xs font-semibold uppercase text-qts-secondary">Tầm nhìn</p>
            <h2 className="mt-6 text-xl font-semibold leading-8 sm:text-2xl">{companyInfo.vision}</h2>
          </article>
          <article className="py-12 lg:py-16 lg:pl-12">
            <p className="text-xs font-semibold uppercase text-qts-secondary">Sứ mệnh</p>
            <h2 className="mt-6 text-xl font-semibold leading-8 sm:text-2xl">{companyInfo.mission}</h2>
          </article>
        </div>
      </section>

      <section className="page-shell py-16 sm:py-20 lg:py-24" aria-labelledby="organization-title">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.6fr)] lg:items-end">
          <div>
            <h2 id="organization-title" className="text-2xl font-semibold text-qts-deep sm:text-3xl">
              Sơ đồ tổ chức tham chiếu
            </h2>
            <p className="mt-4 max-w-3xl leading-7 text-qts-muted">
              Mô hình dưới đây chỉ chuyển các nhóm năng lực seed thành cấu trúc chức năng để định hướng giao diện. Cơ cấu tổ chức thực tế đang chờ QTS xác nhận.
            </p>
          </div>
          <p className="border-l-2 border-qts-primary pl-5 text-sm font-semibold leading-6 text-qts-primary">
            MINH HỌA · CHƯA PHẢI SƠ ĐỒ PHÁP LÝ
          </p>
        </div>

        <div className="mt-12" role="img" aria-label="Sơ đồ minh họa gồm QTS điều phối bốn khối chức năng">
          <div className="mx-auto w-full max-w-sm border-2 border-qts-primary bg-qts-soft p-6 text-center">
            <p className="text-2xl font-semibold text-qts-deep">QTS</p>
            <p className="mt-2 text-sm text-qts-muted">Điều phối và quản trị</p>
          </div>
          <div className="mx-auto h-10 w-px bg-qts-border" aria-hidden="true" />
          <ol className="grid border-t border-qts-border sm:grid-cols-2 lg:grid-cols-4">
            {capabilities.map((capability, index) => (
              <li key={capability.id} className="relative border-b border-qts-border px-4 py-7 text-center sm:border-r lg:border-b-0 lg:last:border-r-0">
                <span className="absolute left-1/2 top-0 h-4 w-px -translate-x-1/2 bg-qts-border" aria-hidden="true" />
                <p className="text-xs font-semibold text-qts-primary">KHỐI {String(index + 1).padStart(2, "0")}</p>
                <h3 className="display-wrap mt-3 font-semibold leading-6 text-qts-deep">{capability.title}</h3>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}
