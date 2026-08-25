"use client";

import { ArrowRight, Check, Pulse } from "@phosphor-icons/react";
import Image from "next/image";
import { useMemo, useState } from "react";

import { solutions } from "@/data/site-content";
import type { PublicSolution } from "@/types/public-content";

const solutionLabels: Record<string, string> = {
  cybersecurity: "Cybersecurity",
  infrastructure: "Fragmented infrastructure",
  "data-platform": "Underutilized data",
};

const solutionImages: Record<string, { src: string; alt: string; caption: string }> = {
  cybersecurity: {
    src: "/images/qts-solution-cybersecurity.svg",
    alt: "Sơ đồ luồng an toàn thông tin từ sự kiện qua IAM, SOAR, SIEM đến vận hành",
    caption: "EVENTS / IDENTITY / ANALYZE / RESPOND",
  },
  infrastructure: {
    src: "/images/qts-solution-infrastructure.svg",
    alt: "Sơ đồ sẵn sàng hạ tầng từ workload qua platform, automation đến observability",
    caption: "WORKLOADS / STANDARDIZE / AUTOMATE / OBSERVE",
  },
  "data-platform": {
    src: "/images/qts-solution-data-platform.svg",
    alt: "Sơ đồ nền tảng dữ liệu từ nguồn dữ liệu qua data lake và API đến quyết định vận hành",
    caption: "SOURCES / GOVERN / SERVE / DECISIONS",
  },
};

const stageNotes = [
  "Xác lập biên và nguồn đầu vào.",
  "Chuẩn hóa giao tiếp giữa các lớp.",
  "Đặt logic xử lý và điểm kiểm soát.",
  "Bàn giao tín hiệu cho vận hành.",
] as const;

export function ProblemExplorer({ items = solutions }: { items?: PublicSolution[] }) {
  const [activeId, setActiveId] = useState(items[0]?.id ?? "");
  const [activeStage, setActiveStage] = useState(0);
  const activeItem = useMemo(
    () => items.find((item) => item.id === activeId) ?? items[0],
    [activeId, items],
  );

  if (!activeItem) return null;

  const activeVisual = solutionImages[activeItem.id] ?? solutionImages.cybersecurity;

  function activateItem(index: number) {
    const nextItem = items[index];
    if (!nextItem) return;

    setActiveId(nextItem.id);
    setActiveStage(0);
    requestAnimationFrame(() => document.getElementById(`problem-tab-${nextItem.id}`)?.focus());
  }

  return (
    <div className="problem-explorer">
      <div className="problem-explorer__selector" role="tablist" aria-label="Chọn nhóm vấn đề vận hành">
        <div className="problem-explorer__selector-head">
          <span>Problem explorer</span>
          <span>{String(items.length).padStart(2, "0")} records</span>
        </div>
        {items.map((item, index) => {
          const selected = item.id === activeItem.id;
          return (
            <button
              key={item.id}
              id={`problem-tab-${item.id}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`problem-panel-${item.id}`}
              tabIndex={selected ? 0 : -1}
              className="problem-explorer__tab"
              onClick={() => {
                setActiveId(item.id);
                setActiveStage(0);
              }}
              onKeyDown={(event) => {
                const lastIndex = items.length - 1;
                let nextIndex: number | undefined;

                if (event.key === "ArrowRight" || event.key === "ArrowDown") {
                  nextIndex = index === lastIndex ? 0 : index + 1;
                } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
                  nextIndex = index === 0 ? lastIndex : index - 1;
                } else if (event.key === "Home") {
                  nextIndex = 0;
                } else if (event.key === "End") {
                  nextIndex = lastIndex;
                }

                if (nextIndex !== undefined) {
                  event.preventDefault();
                  activateItem(nextIndex);
                }
              }}
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{solutionLabels[item.id] ?? item.problem}</strong>
              <i aria-hidden="true" />
            </button>
          );
        })}
        <div className="problem-explorer__status">
          <Pulse size={18} weight="bold" aria-hidden="true" />
          Architecture model ready
        </div>
      </div>

      <section
        id={`problem-panel-${activeItem.id}`}
        data-scroll-reveal="section"
        role="tabpanel"
        aria-labelledby={`problem-tab-${activeItem.id}`}
        className="problem-explorer__panel"
      >
        <header className="problem-explorer__panel-head">
          <div>
            <span>Source problem</span>
            <h3>{activeItem.problem}</h3>
          </div>
          <span className="problem-explorer__live"><i aria-hidden="true" /> Live model</span>
        </header>

        <figure className="problem-explorer__visual">
          <Image
            key={activeVisual.src}
            src={activeVisual.src}
            alt={activeVisual.alt}
            width={1200}
            height={620}
            sizes="(min-width: 1024px) 760px, 100vw"
          />
          <figcaption>{activeVisual.caption}</figcaption>
        </figure>

        <ol className="problem-pipeline" aria-label="Luồng kiến trúc">
          {activeItem.architecture.map((stage, index) => {
            const selected = activeStage === index;
            return (
              <li key={stage} className={selected ? "is-active" : undefined}>
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setActiveStage(index)}
                >
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{stage}</strong>
                  <small>{stageNotes[index] ?? "Xác định đầu ra có thể kiểm tra."}</small>
                  <i aria-hidden="true" />
                </button>
                {index < activeItem.architecture.length - 1 ? (
                  <ArrowRight className="problem-pipeline__arrow" size={19} weight="bold" aria-hidden="true" />
                ) : null}
              </li>
            );
          })}
        </ol>

        <div className="problem-explorer__outcome">
          <span className="problem-explorer__outcome-mark" aria-hidden="true"><Check size={20} weight="bold" /></span>
          <div>
            <span>Expected operating state</span>
            <p>{activeItem.desiredState}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
