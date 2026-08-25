import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
import Image from "next/image";
import Link from "next/link";

import { projects as projectFallback } from "@/data/site-content";
import { MotionSection, TiltedCard } from "@/components/shared/motion-primitives";
import type { PublicProject } from "@/types/public-content";

const scenarioCopy: Record<string, { challenge: string; solutions: string[]; results: string[] }> = {
  "security-operations-center": {
    challenge: "Phát hiện và phối hợp xử lý sự kiện chậm.",
    solutions: ["SIEM", "SOAR", "IAM"],
    results: ["<15 min response target", "12 integrated sources"],
  },
  "enterprise-data-center": {
    challenge: "Hạ tầng phân mảnh, khó kiểm soát khả năng sẵn sàng.",
    solutions: ["Virtualization", "Backup", "Monitoring"],
    results: ["02 active zones", "≤60 min RTO target"],
  },
  "smart-city-platform": {
    challenge: "Dữ liệu đa nguồn, khác chuẩn và khó phối hợp.",
    solutions: ["Data Lake", "API Gateway", "Streaming"],
    results: ["08 data domains", "04 processing layers"],
  },
};

export function ProjectsSection({ items = projectFallback }: { items?: PublicProject[] }) {
  return (
    <MotionSection id="du-an" className="scenario-section" aria-labelledby="scenario-title">
      <div className="page-shell">
        <header className="scenario-section__head" data-reveal="scenario-intro">
          <div>
            <h2 id="scenario-title">Tình huống doanh nghiệp thực tế.</h2>
          </div>
          <p>
            Từ thách thức vận hành đến mô hình giải pháp và kết quả kỹ thuật có thể kiểm chứng.
          </p>
        </header>

        <div className="scenario-grid" data-reveal="scenario-grid">
          {items.slice(0, 3).map((project, index) => {
            const scenario = scenarioCopy[project.id] ?? {
              challenge: project.description,
              solutions: project.technologies.slice(0, 3),
              results: project.metrics.slice(0, 2).map((metric) => `${metric.value} ${metric.label}`),
            };

            return (
              <TiltedCard key={project.id} strength={2.25} className="scenario-card">
                <figure className="scenario-card__media">
                  <Image
                    src={project.imageUrl}
                    alt={project.imageAlt}
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover"
                  />
                  <figcaption>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <span>{project.category}</span>
                  </figcaption>
                </figure>

                <div className="scenario-card__body">
                  <h3>{project.title}</h3>

                  <dl className="scenario-card__story">
                    <div>
                      <dt>Challenge</dt>
                      <dd>{scenario.challenge}</dd>
                    </div>
                    <div>
                      <dt>Solution</dt>
                      <dd className="scenario-card__tags">
                        {scenario.solutions.map((item) => <span key={item}>{item}</span>)}
                      </dd>
                    </div>
                    <div>
                      <dt>Result</dt>
                      <dd className="scenario-card__results">
                        {scenario.results.map((item) => <span key={item}>{item}</span>)}
                      </dd>
                    </div>
                  </dl>

                  <Link href={`/du-an#${project.id}`} className="scenario-card__link">
                    Xem case study
                    <span className="sr-only">: {project.title}</span>
                    <ArrowUpRight size={18} weight="bold" aria-hidden="true" />
                  </Link>
                </div>
              </TiltedCard>
            );
          })}
        </div>

        <Link href="/du-an" className="scenario-section__all">
          Xem toàn bộ case studies
          <ArrowUpRight size={18} weight="bold" aria-hidden="true" />
        </Link>
      </div>
    </MotionSection>
  );
}
