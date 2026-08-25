"use client";

import {
  ArrowRight,
  Buildings,
  Database,
  Fingerprint,
  FlowArrow,
  Pause,
  Play,
  Pulse,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { MotionSection } from "@/components/shared/motion-primitives";
import { Button } from "@/components/ui/button";

const stages = [
  {
    title: "Data Source",
    label: "Nguồn dữ liệu",
    description: "Thu nhận dữ liệu từ ứng dụng, hạ tầng và luồng nghiệp vụ.",
    icon: Database,
  },
  {
    title: "Integration Layer",
    label: "Lớp tích hợp",
    description: "Chuẩn hóa API, sự kiện và kết nối giữa các nền tảng.",
    icon: FlowArrow,
  },
  {
    title: "Security Control",
    label: "Kiểm soát an toàn",
    description: "Xác thực, giám sát và áp dụng chính sách theo từng luồng.",
    icon: Fingerprint,
  },
  {
    title: "Operation Center",
    label: "Trung tâm vận hành",
    description: "Quan sát trạng thái, xử lý sự cố và kiểm soát thay đổi.",
    icon: Pulse,
  },
  {
    title: "Business Service",
    label: "Dịch vụ nghiệp vụ",
    description: "Bàn giao dịch vụ ổn định với chỉ số và trách nhiệm rõ ràng.",
    icon: Buildings,
  },
] as const;

export function WorkflowSection() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reducedMotion.matches || !isPlaying) return;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % stages.length);
    }, 2200);
    return () => window.clearInterval(timer);
  }, [isPlaying]);

  const activeStage = stages[activeIndex] ?? stages[0];

  return (
    <MotionSection id="phuong-phap" className="operating-section" aria-labelledby="operating-model-title">
      <div className="flow-shell" data-reveal="operating-model">
        <header className="flow-section-head flow-section-head--center">
          <h2 id="operating-model-title">Xem <span>mô hình vận hành QTS</span>.</h2>
          <p>Hệ thống mẫu cho thấy dữ liệu đi qua tích hợp, kiểm soát và vận hành như thế nào.</p>
        </header>

        <div className="operating-model">
          <header className="operating-model__top">
            <div>
              <small>QTS Enterprise Platform</small>
              <strong>SYSTEM FLOW</strong>
            </div>
            <div className="operating-model__controls">
              <span><i aria-hidden="true" /> Model signal</span>
              <button
                type="button"
                className="operating-model__motion-control"
                aria-pressed={!isPlaying}
                aria-label={isPlaying ? "Tạm dừng mô phỏng luồng" : "Phát mô phỏng luồng"}
                title={isPlaying ? "Tạm dừng mô phỏng luồng" : "Phát mô phỏng luồng"}
                onClick={() => setIsPlaying((current) => !current)}
              >
                {isPlaying ? <Pause size={14} weight="bold" aria-hidden="true" /> : <Play size={14} weight="fill" aria-hidden="true" />}
              </button>
            </div>
          </header>

          <div className="operating-model__canvas">
            <ol>
              {stages.map((stage, index) => {
                const Icon = stage.icon;
                const active = index === activeIndex;
                return (
                  <li key={stage.title} className={active ? "is-active" : undefined}>
                    <button
                      type="button"
                      aria-pressed={active}
                      onClick={() => {
                        setActiveIndex(index);
                        setIsPlaying(false);
                      }}
                    >
                      <span className="operating-model__node-icon"><Icon size={24} weight="regular" /></span>
                      <small>{String(index + 1).padStart(2, "0")}</small>
                      <strong>{stage.title}</strong>
                      <span>{stage.label}</span>
                    </button>
                    {index < stages.length - 1 ? (
                      <span className="operating-model__connector" aria-hidden="true">
                        <i className={index < activeIndex ? "is-complete" : undefined} />
                        <ArrowRight size={17} weight="bold" />
                      </span>
                    ) : null}
                  </li>
                );
              })}
            </ol>
          </div>

          <footer className="operating-model__detail" aria-live={isPlaying ? "off" : "polite"}>
            <div>
              <span>Active layer · {String(activeIndex + 1).padStart(2, "0")}</span>
              <h3>{activeStage.title}</h3>
              <p>{activeStage.description}</p>
            </div>
            <dl>
              <div><dt>Signal</dt><dd>REFERENCE</dd></div>
              <div><dt>Control</dt><dd>VERIFIED</dd></div>
              <div><dt>Latency</dt><dd>24ms</dd></div>
            </dl>
          </footer>
        </div>

        <div className="operating-section__action">
          <Button asChild size="lg">
            <Link href="/giai-phap" prefetch aria-label="Khám phá operating model của QTS">
              Khám phá operating model
              <ArrowRight size={18} weight="bold" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </div>
    </MotionSection>
  );
}
