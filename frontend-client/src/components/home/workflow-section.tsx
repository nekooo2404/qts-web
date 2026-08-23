import { ArrowRight } from "@phosphor-icons/react/dist/ssr";

import { workflow } from "@/data/site-content";

export function WorkflowSection() {
  return (
    <section id="phuong-phap" className="workflow-section py-16 sm:py-20 lg:py-28">
      <div className="page-shell" data-reveal="workflow-section">
        <div className="grid gap-6 lg:grid-cols-12 lg:items-end">
          <h2 className="display-wrap text-3xl font-bold leading-tight text-qts-deep sm:text-4xl lg:col-span-7 lg:text-5xl">
            Từ hiện trạng đến vận hành: một chuỗi quyết định có kiểm soát.
          </h2>
          <p className="body-wrap text-base leading-7 text-qts-muted lg:col-span-4 lg:col-start-9">
            Mỗi giai đoạn tạo ra đầu ra có thể kiểm tra trước khi hệ thống chuyển sang bước tiếp theo.
          </p>
        </div>

        <ol className="workflow-journey">
          {workflow.map((step, index) => {
            const Icon = step.icon;
            return (
              <li
                key={step.title}
                className={`workflow-step${index === 0 ? " is-active" : ""}`}
                data-reveal="workflow-step"
                data-story-row="workflow"
              >
                <span className="workflow-step__number">
                  <span className="sr-only">Bước </span>
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="workflow-step__marker" aria-hidden="true" />
                <Icon className="workflow-step__icon" size={32} weight="light" aria-hidden="true" />
                <h3 className="workflow-step__title display-wrap">{step.title}</h3>
                <p className="workflow-step__description body-wrap">{step.description}</p>
                <div className="workflow-step__deliverable">
                  <div className="workflow-step__deliverable-heading">
                    <span className="workflow-step__deliverable-label">Đầu ra</span>
                    <ArrowRight size={16} weight="bold" aria-hidden="true" />
                  </div>
                  <strong>{step.deliverable}</strong>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
