import { workflow } from "@/data/site-content";

export function WorkflowSection() {
  return (
    <section id="phuong-phap" className="bg-qts-paper py-14 sm:py-16 lg:py-20">
      <div className="page-shell" data-animate="animate__fadeInUp">
        <div className="grid gap-6 lg:grid-cols-12 lg:items-end">
          <h2 className="display-wrap text-3xl font-bold leading-tight text-qts-deep sm:text-4xl lg:col-span-6 lg:text-5xl">
            Một lộ trình xuyên suốt, từ hiện trạng đến vận hành.
          </h2>
          <p className="max-w-xl text-base leading-7 text-qts-muted lg:col-span-5 lg:col-start-8">
            QTS tiếp cận hệ thống theo chuỗi quyết định có thể kiểm tra, để kiến trúc và
            triển khai cùng hướng về mục tiêu vận hành.
          </p>
        </div>

        <ol className="mt-12 grid border-t border-qts-border md:grid-cols-2 lg:grid-cols-4">
          {workflow.map((step, index) => {
            const Icon = step.icon;

            return (
              <li
                key={step.title}
                className="border-b border-qts-border py-8 md:px-6 md:odd:border-r lg:border-b-0 lg:border-r lg:px-7 lg:first:pl-0 lg:last:border-r-0 lg:last:pr-0"
              >
                <div className="flex items-center justify-between text-qts-primary">
                  <span className="text-sm font-bold">0{index + 1}</span>
                  <Icon size={28} weight="duotone" aria-hidden="true" />
                </div>
                <h3 className="display-wrap mt-8 text-xl font-bold text-qts-deep">{step.title}</h3>
                <p className="mt-3 text-sm leading-6 text-qts-muted">{step.description}</p>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
