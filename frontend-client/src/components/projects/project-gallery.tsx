import type { Icon } from "@phosphor-icons/react";
import {
  ArrowRight,
  ArrowUpRight,
  Clock,
  Cube,
  Database,
  FileText,
  HardDrives,
  LockKey,
  Pulse,
  SealCheck,
  ShieldCheck,
  StackSimple,
  Target,
  UsersThree,
} from "@phosphor-icons/react/dist/ssr";
import Image from "next/image";
import Link from "next/link";

import { projects as projectFallback } from "@/data/site-content";
import type { PublicProject } from "@/types/public-content";

interface ProjectGalleryProps {
  compact?: boolean;
  items?: PublicProject[];
}

const projectMetricIcons: Record<string, readonly Icon[]> = {
  "security-operations-center": [FileText, StackSimple, Target],
  "enterprise-data-center": [Pulse, HardDrives, Clock],
  "smart-city-platform": [Database, StackSimple, Cube],
};

const assuranceItems = [
  {
    title: "Phạm vi có thể kiểm tra",
    description: "Biên hệ thống, lớp công nghệ và đầu ra được nêu rõ.",
    icon: ShieldCheck,
  },
  {
    title: "Vai trò chuyên môn rõ ràng",
    description: "Kiến trúc, dữ liệu và vận hành phối hợp theo trách nhiệm.",
    icon: UsersThree,
  },
  {
    title: "Quy trình có điểm kiểm soát",
    description: "Mỗi giai đoạn có tiêu chí để chuyển sang bước tiếp theo.",
    icon: SealCheck,
  },
  {
    title: "An toàn trong từng lớp",
    description: "Kiểm soát được đặt từ danh tính đến giám sát và ứng cứu.",
    icon: LockKey,
  },
] as const;

export function ProjectGallery({ compact = false, items = projectFallback }: ProjectGalleryProps) {
  return (
    <div>
      <div className={`project-grid${compact ? " project-grid--compact" : ""}`} data-reveal="project-grid">
        {items.map((project, index) => (
          <article
            id={project.id}
            key={project.id}
            className={`project-record${compact ? " project-record--compact" : ""} scroll-mt-24`}
          >
            <header className="project-record__meta">
              <span className="project-record__number">{String(index + 1).padStart(2, "0")}</span>
              <span className="project-record__category">{project.category}</span>
            </header>

            <figure className="project-media">
              <Image
                src={project.imageUrl}
                alt={project.imageAlt}
                fill
                sizes="(min-width: 1280px) 25rem, (min-width: 768px) 50vw, 100vw"
                className="object-cover"
                loading={compact ? "lazy" : "eager"}
                unoptimized
              />
            </figure>

            <div className="project-record__body">
              <h3 className="project-record__title display-wrap">{project.title}</h3>
              <p className="body-wrap project-record__description">{project.description}</p>
              <p className="project-record__disclaimer">
                Minh họa kiến trúc; chỉ số mô tả phạm vi hoặc mục tiêu thiết kế.
              </p>

              <ul className="project-record__technologies" aria-label="Lớp công nghệ">
                {project.technologies.map((item) => <li key={item}>{item}</li>)}
              </ul>

              <dl className="project-metrics">
                {project.metrics.map((metric, metricIndex) => {
                  const MetricIcon = projectMetricIcons[project.id]?.[metricIndex] ?? StackSimple;
                  return (
                    <div key={metric.label} className="project-metric">
                      <MetricIcon className="project-metric__icon" size={19} weight="regular" aria-hidden="true" />
                      <dt>{metric.label}</dt>
                      <dd>{metric.value}</dd>
                    </div>
                  );
                })}
              </dl>

              {compact ? (
                <Link href={`/du-an#${project.id}`} className="project-record__action">
                  Mở hồ sơ kỹ thuật
                  <span className="sr-only">: {project.title}</span>
                  <ArrowUpRight size={19} weight="bold" aria-hidden="true" />
                </Link>
              ) : (
                <details className="project-record__details group">
                  <summary className="project-record__action">
                    Xem phạm vi kỹ thuật
                    <span className="sr-only">: {project.title}</span>
                    <ArrowRight className="project-record__action-icon" size={19} weight="bold" aria-hidden="true" />
                  </summary>
                  <div className="project-record__scope">
                    <div>
                      <p>Hạng mục</p>
                      <ul>
                        {project.scope.map((item) => <li key={item}>— {item}</li>)}
                      </ul>
                    </div>
                    <div>
                      <p>Lớp công nghệ</p>
                      <span>{project.technologies.join(" · ")}</span>
                    </div>
                  </div>
                </details>
              )}
            </div>
          </article>
        ))}
      </div>

      {!compact ? (
        <section className="project-assurance" aria-labelledby="project-assurance-title">
          <div className="project-assurance__heading">
            <h2 id="project-assurance-title">Technical proof before promise.</h2>
            <Link href="/lien-he" className="qts-button project-assurance__cta">
              Tư vấn giải pháp phù hợp
              <ArrowRight size={19} weight="bold" aria-hidden="true" />
            </Link>
          </div>
          <ul className="project-assurance__list">
            {assuranceItems.map((item) => {
              const AssuranceIcon = item.icon;
              return (
                <li key={item.title}>
                  <AssuranceIcon size={23} weight="regular" aria-hidden="true" />
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
