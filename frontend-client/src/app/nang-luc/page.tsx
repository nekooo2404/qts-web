import type { Metadata } from "next";

import { PageIntro } from "@/components/shared/page-intro";
import { capabilities, capabilityIcons, workflow } from "@/data/site-content";

export const metadata: Metadata = {
  title: "Năng lực",
  description: "Các nhóm năng lực công nghệ và mạch triển khai tham chiếu của QTS.",
};

export default function CapabilitiesPage() {
  return (
    <>
      <PageIntro
        title="Năng lực kết nối từ kiến trúc đến vận hành."
        description="Bốn nhóm chuyên môn được tổ chức quanh một mục tiêu chung: biến nhu cầu vận hành thành hệ thống có cấu trúc, có thể triển khai và tiếp tục cải tiến."
        aside={<p>Nội dung hiện được lấy từ dữ liệu seed của API và cần được QTS xác nhận trước khi công bố chính thức.</p>}
      />

      <section className="page-shell py-16 sm:py-20 lg:py-24" aria-labelledby="capability-list-title">
        <h2 id="capability-list-title" className="sr-only">
          Các nhóm năng lực
        </h2>
        <div className="grid gap-5 md:grid-cols-2">
          {capabilities.map((capability, index) => {
            const Icon = capabilityIcons[capability.iconKey];

            return (
              <article
                key={capability.id}
                className={`hvr-float min-w-0 border border-qts-border p-6 sm:p-8 ${
                  index === 0 ? "bg-qts-primary text-white md:row-span-2 md:flex md:flex-col md:justify-between" : "bg-white"
                }`}
              >
                <div className="flex items-start justify-between gap-6">
                  <span className={`text-sm font-semibold ${index === 0 ? "text-qts-secondary" : "text-qts-primary"}`}>
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <Icon size={32} weight="duotone" aria-hidden="true" />
                </div>
                <div className={index === 0 ? "mt-16 md:mt-32" : "mt-12"}>
                  <h3 className={`display-wrap text-xl font-semibold leading-tight sm:text-2xl ${index === 0 ? "text-white" : "text-qts-deep"}`}>
                    {capability.title}
                  </h3>
                  <p className={`mt-4 text-sm leading-6 sm:text-base sm:leading-7 ${index === 0 ? "text-qts-secondary" : "text-qts-muted"}`}>
                    {capability.description}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="border-y border-qts-border bg-qts-soft" aria-labelledby="delivery-flow-title">
        <div className="page-shell py-16 sm:py-20">
          <div className="max-w-2xl">
            <h2 id="delivery-flow-title" className="text-2xl font-semibold text-qts-deep sm:text-3xl">
              Mạch triển khai tham chiếu
            </h2>
            <p className="mt-4 leading-7 text-qts-muted">
              Một trình tự làm việc dự kiến để các nhóm năng lực không vận hành tách rời nhau.
            </p>
          </div>
          <ol className="mt-10 grid gap-0 border-t border-qts-border md:grid-cols-4">
            {workflow.map((step, index) => (
              <li key={step.title} className="border-b border-qts-border py-7 md:border-b-0 md:border-r md:px-6 md:first:pl-0 md:last:border-r-0">
                <span className="text-xs font-semibold text-qts-primary">0{index + 1}</span>
                <h3 className="mt-4 font-semibold text-qts-deep">{step.title}</h3>
                <p className="mt-3 text-sm leading-6 text-qts-muted">{step.description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}
