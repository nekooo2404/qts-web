"use client";

import {
  ArrowRight,
  Blueprint,
  CaretDown,
  Database,
  Eye,
  Fingerprint,
  FlowArrow,
  Pulse,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { MotionSection, TiltedCard } from "@/components/shared/motion-primitives";

const features = [
  {
    id: "architecture",
    title: "Architecture Intelligence",
    description: "Thiết kế nền tảng có khả năng mở rộng.",
    href: "/nang-luc#architecture",
    icon: Blueprint,
  },
  {
    id: "integration",
    title: "System Integration",
    description: "Kết nối ứng dụng, dữ liệu và API.",
    href: "/nang-luc#integration",
    icon: FlowArrow,
  },
  {
    id: "security",
    title: "Cyber Security",
    description: "Kiểm soát rủi ro và bảo vệ hệ thống.",
    href: "/nang-luc#security",
    icon: Fingerprint,
  },
  {
    id: "data-platform",
    title: "Data Platform",
    description: "Chuẩn hóa và khai thác dữ liệu.",
    href: "/giai-phap#data-platform",
    icon: Database,
  },
  {
    id: "monitoring",
    title: "Monitoring",
    description: "Quan sát toàn bộ trạng thái vận hành.",
    href: "/nang-luc#operations",
    icon: Eye,
  },
  {
    id: "managed-operations",
    title: "Managed Operations",
    description: "Theo dõi và cải tiến liên tục.",
    href: "/nang-luc#operations",
    icon: Pulse,
  },
] as const;

export function CapabilitiesSection() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isCompact, setIsCompact] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 47.99rem)");
    const sync = () => setIsCompact(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  return (
    <MotionSection id="nang-luc" className="flow-features" aria-labelledby="capabilities-title">
      <div className="flow-shell" data-reveal="capabilities-section">
        <header className="flow-section-head flow-section-head--split">
          <h2 id="capabilities-title">Mọi năng lực để <span>vận hành hệ thống doanh nghiệp</span>.</h2>
          <p>Sáu năng lực cốt lõi, từ thiết kế kiến trúc đến vận hành liên tục.</p>
        </header>

        <div className="flow-feature-grid">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            const expanded = !isCompact || activeIndex === index;
            const bodyId = `feature-body-${feature.id}`;
            const summaryContent = (
              <>
                <span className="flow-feature-card__icon" aria-hidden="true"><Icon size={25} weight="regular" /></span>
                <h3>{feature.title}</h3>
                {isCompact ? <CaretDown size={18} weight="bold" aria-hidden="true" /> : null}
              </>
            );
            return (
              <TiltedCard key={feature.id} strength={2.5} className={`flow-feature-card flow-feature-card--${index + 1}${expanded ? " is-active" : ""}`}>
                {isCompact ? (
                  <button
                    type="button"
                    className="flow-feature-card__summary"
                    aria-expanded={expanded}
                    aria-controls={bodyId}
                    onClick={() => setActiveIndex((current) => current === index ? -1 : index)}
                  >
                    {summaryContent}
                  </button>
                ) : (
                  <div className="flow-feature-card__summary">{summaryContent}</div>
                )}
                <div id={bodyId} className="flow-feature-card__body" hidden={!expanded}>
                  <p>{feature.description}</p>
                  <Link href={feature.href} className="flow-feature-card__link">
                    Tìm hiểu thêm <ArrowRight size={15} weight="bold" />
                  </Link>
                </div>
              </TiltedCard>
            );
          })}
        </div>
      </div>
    </MotionSection>
  );
}
