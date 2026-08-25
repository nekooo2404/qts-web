import { Check } from "@phosphor-icons/react/dist/ssr";
import Image from "next/image";

import { PageIntro } from "@/components/shared/page-intro";
import { ContentSourceNotice } from "@/components/shared/content-source-notice";
import { capabilityIcons } from "@/data/site-content";
import { getCapabilities } from "@/lib/public-api";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Năng lực",
  description: "Bốn lớp năng lực của QTS từ kiến trúc, tích hợp, an toàn thông tin đến vận hành hệ thống.",
  path: "/nang-luc",
});

const qualityGates = [
  { code: "G1", title: "Ranh giới", description: "Phạm vi, phụ thuộc và trách nhiệm được xác định." },
  { code: "G2", title: "Kiến trúc", description: "Luồng dữ liệu, kiểm soát và tiêu chí nghiệm thu được thống nhất." },
  { code: "G3", title: "Chuyển đổi", description: "Mỗi thay đổi có kịch bản kiểm thử và phương án quay lui." },
  { code: "G4", title: "Vận hành", description: "Khả năng quan sát và quy trình xử lý được bàn giao cùng hệ thống." },
] as const;

export default async function CapabilitiesPage() {
  const capabilityItems = await getCapabilities();
  return (
    <main className="section-stack">
      <PageIntro
        variant="capabilities"
        title="QTS System. Bốn lớp, một vòng vận hành."
        description="Kiến trúc, tích hợp, an toàn thông tin và vận hành dùng chung một bản đồ hệ thống, cùng chịu các cổng kiểm soát."
      />
      <ContentSourceNotice source={capabilityItems.source} reason={capabilityItems.reason} />

      <section data-scroll-reveal="section" className="capability-stack-section py-16 sm:py-20 lg:py-28" aria-labelledby="capability-stack-title">
        <div className="page-shell">
          <div className="grid gap-6 border-b border-qts-border pb-8 lg:grid-cols-12 lg:items-end" data-reveal>
            <h2 id="capability-stack-title" className="display-wrap text-3xl font-bold leading-tight text-qts-deep sm:text-4xl lg:col-span-7 lg:text-5xl">
              Từ quyết định kiến trúc đến đầu ra bàn giao.
            </h2>
            <p className="body-wrap text-base leading-7 text-qts-muted lg:col-span-4 lg:col-start-9">
              Mỗi lớp có phạm vi riêng nhưng dùng chung một bản đồ hệ thống và cùng chịu các cổng kiểm soát.
            </p>
          </div>

          <figure className="capability-blueprint" data-reveal="capability-blueprint">
            <Image
              src="/images/qts-capability-blueprint.svg"
              alt="Blueprint bốn lớp năng lực QTS từ kiến trúc đến vận hành"
              width={1200}
              height={540}
              sizes="(min-width: 1024px) 1200px, 100vw"
              priority
            />
            <figcaption>
              <span>QTS / CAPABILITY BLUEPRINT</span>
              <span>BOUNDARIES / HANDOFF / OPERATIONS</span>
            </figcaption>
          </figure>

          <ol className="capability-stack">
            {capabilityItems.data.map((capability, index) => {
              const Icon = capabilityIcons[capability.iconKey];
              const titleId = `${capability.id}-title`;
              const scopeId = `${capability.id}-scope`;
              const outputId = `${capability.id}-output`;
              const current = String(index + 1).padStart(2, "0");
              const total = String(capabilityItems.data.length).padStart(2, "0");
              return (
                <li key={capability.id} className="capability-stack__item">
                  <article
                    id={capability.id}
                    aria-labelledby={titleId}
                    className="capability-layer scroll-mt-24"
                    data-reveal="capability-layer"
                  >
                    <div className="capability-layer__identity">
                      <p className="capability-layer__count">
                        <span className="sr-only">Lớp {index + 1} trên {capabilityItems.data.length}</span>
                        <strong aria-hidden="true">{current}</strong>
                        <span aria-hidden="true">/ {total}</span>
                      </p>
                      <span className="capability-layer__icon" aria-hidden="true">
                        <Icon size={27} weight="regular" />
                      </span>
                      <span className="capability-layer__code">{capability.iconKey}</span>
                    </div>

                    <div className="capability-layer__summary">
                      <h3 id={titleId} className="display-wrap">{capability.title}</h3>
                      <p className="body-wrap">{capability.description}</p>
                    </div>

                    <div className="capability-layer__list-group capability-layer__list-group--scope" aria-labelledby={scopeId}>
                      <h4 id={scopeId}>Phạm vi</h4>
                      <ul className="capability-layer__list">
                        {capability.scope.map((item) => (
                          <li key={item}>
                            <Check size={16} weight="bold" aria-hidden="true" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="capability-layer__list-group capability-layer__list-group--output" aria-labelledby={outputId}>
                      <h4 id={outputId}>Đầu ra</h4>
                      <ul className="capability-layer__list">
                        {capability.outputs.map((item) => (
                          <li key={item}>
                            <Check size={16} weight="bold" aria-hidden="true" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </article>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      <section data-scroll-reveal="section" className="qts-dark bg-qts-deep py-16 text-white sm:py-20 lg:py-24">
        <div className="page-shell" data-reveal>
          <div className="grid gap-8 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <p className="text-sm font-bold uppercase text-qts-accent">Cổng kiểm soát</p>
              <h2 className="display-wrap mt-3 text-3xl font-bold leading-tight sm:text-4xl">
                Không chuyển bước chỉ vì công việc “đã xong”.
              </h2>
              <p className="body-wrap mt-5 text-base leading-7 text-qts-secondary">
                Mỗi giai đoạn cần một bằng chứng đủ rõ để đội tiếp theo có thể tiếp tục mà không phải đoán.
              </p>
            </div>
            <ol className="border-y border-white/25 lg:col-span-7 lg:col-start-6">
              {qualityGates.map((gate) => (
                <li key={gate.code} className="grid gap-4 border-b border-white/20 py-6 last:border-b-0 sm:grid-cols-[3rem_minmax(0,1fr)]">
                  <span className="text-sm font-bold text-qts-accent">{gate.code}</span>
                  <div>
                    <h3 className="font-bold text-white">{gate.title}</h3>
                    <p className="body-wrap mt-2 text-sm leading-6 text-white/65">{gate.description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>
    </main>
  );
}
