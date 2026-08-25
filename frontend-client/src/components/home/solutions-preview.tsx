"use client";

import {
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  CaretDown,
  Check,
  Database,
  FlowArrow,
  HardDrives,
  Pause,
  Play,
  Pulse,
  ShieldCheck,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { DepthSurface, MotionSection } from "@/components/shared/motion-primitives";
import { solutions } from "@/data/site-content";
import type { PublicSolution } from "@/types/public-content";

const operatingLayers = [
  {
    id: "foundation",
    code: "01",
    title: "Foundation",
    subtitle: "Infrastructure",
    description: "Thiết lập hạ tầng, môi trường và baseline dịch vụ có thể kiểm soát.",
    status: "STABLE",
    icon: HardDrives,
    capabilities: ["Compute & Network", "Backup & Recovery", "Service Baseline"],
    metrics: [
      { label: "Operating zones", value: "02" },
      { label: "Environments", value: "03" },
      { label: "Availability target", value: "99.9%" },
    ],
  },
  {
    id: "integration",
    code: "02",
    title: "Integration",
    subtitle: "API & Data Flow",
    description: "Kết nối ứng dụng, API và dữ liệu qua luồng tích hợp có thể truy vết.",
    status: "RUNNING",
    icon: FlowArrow,
    capabilities: ["API Gateway", "Event Flow", "Data Contracts"],
    metrics: [
      { label: "Integration paths", value: "12" },
      { label: "Control points", value: "04" },
      { label: "Flow state", value: "RUNNING" },
    ],
  },
  {
    id: "security",
    code: "03",
    title: "Security",
    subtitle: "IAM & Protection",
    description: "Đưa danh tính, bảo vệ và giám sát vào từng đường đi của hệ thống.",
    status: "ACTIVE",
    icon: ShieldCheck,
    capabilities: ["Identity Control", "Threat Detection", "Audit Trail"],
    metrics: [
      { label: "Integrated sources", value: "12" },
      { label: "Analysis engines", value: "03" },
      { label: "Response target", value: "<15 min" },
    ],
  },
  {
    id: "operations",
    code: "04",
    title: "Operations",
    subtitle: "Monitoring & Response",
    description: "Quan sát dịch vụ, điều phối sự cố và kiểm soát thay đổi liên tục.",
    status: "HEALTHY",
    icon: Pulse,
    capabilities: ["Service Monitoring", "Incident Response", "Change Governance"],
    metrics: [
      { label: "System health", value: "98.7%" },
      { label: "Monitoring model", value: "24/7" },
      { label: "Response target", value: "<15 min" },
    ],
  },
] as const;

const moduleDefinitions = [
  {
    id: "cybersecurity",
    code: "01",
    title: "Cybersecurity Control",
    category: "Security Operations",
    description: "Phát hiện, phân tích và điều phối phản ứng trong cùng một control path.",
    status: "ACTIVE",
    icon: ShieldCheck,
    secondaryIcon: FlowArrow,
    flow: ["Detect", "Analyze", "Respond"],
    metrics: [
      { value: "12", label: "Integrated sources" },
      { value: "03", label: "Analysis engines" },
      { value: "<15 min", label: "Response target" },
    ],
  },
  {
    id: "infrastructure",
    code: "02",
    title: "Infrastructure Platform",
    category: "Enterprise Foundation",
    description: "Chuẩn hóa workload, hạ tầng và observability thành một operating baseline.",
    status: "STABLE",
    icon: HardDrives,
    secondaryIcon: Pulse,
    flow: ["Workload", "Platform", "Observe"],
    metrics: [
      { value: "02", label: "Operating zones" },
      { value: "03", label: "Environments" },
      { value: "99.9%", label: "Availability target" },
    ],
  },
  {
    id: "data-platform",
    code: "03",
    title: "Data Pipeline",
    category: "Data Operations",
    description: "Đưa dữ liệu từ nguồn đến sản phẩm qua luồng tích hợp và quản trị thống nhất.",
    status: "RUNNING",
    icon: Database,
    secondaryIcon: FlowArrow,
    flow: ["Source", "Integrate", "Govern", "Serve"],
    metrics: [
      { value: "08", label: "Data domains" },
      { value: "04", label: "Processing layers" },
      { value: "RUNNING", label: "Pipeline status" },
    ],
  },
] as const;

const liveStates = [
  ["Security", "Healthy"],
  ["Infrastructure", "Stable"],
  ["Data", "Running"],
  ["Operations", "Monitoring"],
] as const;

export function SolutionsPreview({ items = solutions }: { items?: PublicSolution[] }) {
  const [activeLayerId, setActiveLayerId] = useState("operations");
  const [activeModuleIndex, setActiveModuleIndex] = useState(0);
  const [isCompact, setIsCompact] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const compact = window.matchMedia("(max-width: 47.99rem)");
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      setIsCompact(compact.matches);
      setReducedMotion(motion.matches);
    };
    sync();
    compact.addEventListener("change", sync);
    motion.addEventListener("change", sync);
    return () => {
      compact.removeEventListener("change", sync);
      motion.removeEventListener("change", sync);
    };
  }, []);

  const activeLayer = operatingLayers.find((layer) => layer.id === activeLayerId) ?? operatingLayers[3];
  const displayedLayers = [...operatingLayers].reverse();
  const availableModules = moduleDefinitions.filter((module) => items.some((item) => item.id === module.id));
  const displayedModules = availableModules.length > 0 ? availableModules : moduleDefinitions;
  const motionActive = isPlaying && !reducedMotion;

  return (
    <MotionSection id="giai-phap" className="architecture-system" aria-labelledby="architecture-system-title">
      <div className="page-shell">
        <header className="architecture-system__heading" data-reveal="architecture-heading">
          <h2 id="architecture-system-title">
            <span>Một kiến trúc.</span>
            <span>Bốn lớp vận hành.</span>
          </h2>
          <p>
            Một mô hình thống nhất kết nối foundation, integration, security và operations
            để hệ thống được thiết kế cho vận hành liên tục.
          </p>
        </header>

        <DepthSurface className="depth-tool-wrap" strength={2.25}>
        <section
          className="architecture-console"
          data-scroll-reveal="section"
          data-playing={motionActive}
          aria-labelledby="architecture-console-title"
          data-reveal="architecture-console"
        >
          <header className="architecture-console__top">
            <div>
              <span className="architecture-console__mark">Q</span>
              <div>
                <small>QTS Operating Architecture</small>
                <h3 id="architecture-console-title">ARCHITECTURE SYSTEM</h3>
              </div>
            </div>
            <div className="architecture-console__actions">
              <span className="architecture-console__model">Reference model</span>
              <button
                type="button"
                className="architecture-console__motion"
                disabled={reducedMotion}
                aria-label={
                  reducedMotion
                    ? "Chuyển động đã tắt theo cài đặt hệ thống"
                    : motionActive
                      ? "Tạm dừng luồng kiến trúc"
                      : "Phát luồng kiến trúc"
                }
                title={
                  reducedMotion
                    ? "Chuyển động đã tắt theo cài đặt hệ thống"
                    : motionActive
                      ? "Tạm dừng luồng kiến trúc"
                      : "Phát luồng kiến trúc"
                }
                onClick={() => setIsPlaying((current) => !current)}
              >
                {motionActive ? (
                  <Pause size={16} weight="bold" aria-hidden="true" />
                ) : (
                  <Play size={16} weight="fill" aria-hidden="true" />
                )}
              </button>
            </div>
          </header>

          <div className="architecture-console__body">
            <section className="architecture-map" aria-labelledby="architecture-map-title">
              <header>
                <div>
                  <small>Architecture Map</small>
                  <h3 id="architecture-map-title">Operating Layers</h3>
                </div>
                <span><ArrowUp size={16} weight="bold" aria-hidden="true" /> Business</span>
              </header>

              <ol>
                {displayedLayers.map((layer, index) => {
                  const Icon = layer.icon;
                  const active = layer.id === activeLayer.id;
                  return (
                    <li key={layer.id} className={active ? "is-active" : undefined}>
                      <button
                        type="button"
                        aria-pressed={active}
                        onClick={() => setActiveLayerId(layer.id)}
                      >
                        <span className="architecture-layer__code">{layer.code}</span>
                        <span className="architecture-layer__icon"><Icon size={21} weight="regular" aria-hidden="true" /></span>
                        <span className="architecture-layer__copy">
                          <strong>{layer.title}</strong>
                          <small>{layer.subtitle}</small>
                        </span>
                        <span className="architecture-layer__status"><i aria-hidden="true" /> {layer.status}</span>
                      </button>
                      {index < displayedLayers.length - 1 ? (
                        <span className="architecture-layer__connector" aria-hidden="true"><i /></span>
                      ) : null}
                    </li>
                  );
                })}
              </ol>

              <footer>
                <span>System</span>
                <strong>Enterprise foundation</strong>
              </footer>
            </section>

            <section className="architecture-detail" aria-live="polite" aria-atomic="true">
              <header>
                <div>
                  <small>Active layer · {activeLayer.code}</small>
                  <h3>{activeLayer.title}</h3>
                </div>
                <span><i aria-hidden="true" /> {activeLayer.status}</span>
              </header>

              <p>{activeLayer.description}</p>

              <div className="architecture-detail__capabilities">
                <span>System capabilities</span>
                <ul>
                  {activeLayer.capabilities.map((capability) => (
                    <li key={capability}><Check size={15} weight="bold" aria-hidden="true" /> {capability}</li>
                  ))}
                </ul>
              </div>

              <dl>
                {activeLayer.metrics.map((metric) => (
                  <div key={metric.label}>
                    <dt>{metric.label}</dt>
                    <dd>{metric.value}</dd>
                  </div>
                ))}
              </dl>
            </section>

            <aside className="architecture-live" aria-labelledby="architecture-live-title">
              <header>
                <div>
                  <small>System Preview</small>
                  <h3 id="architecture-live-title">REFERENCE ARCHITECTURE VIEW</h3>
                </div>
                <Pulse size={19} weight="regular" aria-hidden="true" />
              </header>
              <ul>
                {liveStates.map(([label, state]) => (
                  <li key={label}>
                    <span>{label}</span>
                    <strong><i aria-hidden="true" /> {state}</strong>
                  </li>
                ))}
              </ul>
              <footer>
                <span>Reference snapshot</span>
                <strong>Illustrative only</strong>
                <small>Illustrative system state</small>
              </footer>
            </aside>
          </div>
        </section>
        </DepthSurface>

        <section data-scroll-reveal="section" className="architecture-modules" aria-labelledby="architecture-modules-title" data-reveal="architecture-modules">
          <header>
            <h3 id="architecture-modules-title">Operating system modules</h3>
            <p>Reference architecture values · Not live production data.</p>
          </header>

          <div className="architecture-module-list">
            {displayedModules.map((module, index) => {
              const Icon = module.icon;
              const SecondaryIcon = module.secondaryIcon;
              const expanded = !isCompact || activeModuleIndex === index;
              const bodyId = `architecture-module-${module.id}`;
              const summary = (
                <>
                  <span className="architecture-module__code">{module.code}</span>
                  <span className="architecture-module__icons">
                    <Icon size={22} weight="regular" aria-hidden="true" />
                    <SecondaryIcon size={14} weight="bold" aria-hidden="true" />
                  </span>
                  <span className="architecture-module__identity">
                    <small>{module.category}</small>
                    <strong>{module.title}</strong>
                  </span>
                  <span className="architecture-module__status"><i aria-hidden="true" /> {module.status}</span>
                  {isCompact ? <CaretDown size={18} weight="bold" aria-hidden="true" /> : null}
                </>
              );

              return (
                <article key={module.id} className={`architecture-module${expanded ? " is-active" : ""}`}>
                  {isCompact ? (
                    <button
                      type="button"
                      className="architecture-module__summary"
                      aria-expanded={expanded}
                      aria-controls={bodyId}
                      onClick={() => setActiveModuleIndex((current) => current === index ? -1 : index)}
                    >
                      {summary}
                    </button>
                  ) : (
                    <div className="architecture-module__summary">{summary}</div>
                  )}

                  <div id={bodyId} className="architecture-module__body" hidden={!expanded}>
                    <div className="architecture-module__description">
                      <p>{module.description}</p>
                    </div>

                    <ol
                      className={`architecture-module__flow architecture-module__flow--${module.flow.length}`}
                      aria-label={`Luồng ${module.title}`}
                    >
                      {module.flow.map((stage, stageIndex) => (
                        <li key={stage}>
                          <span>{stage}</span>
                          {stageIndex < module.flow.length - 1 ? <ArrowRight size={15} weight="bold" aria-hidden="true" /> : null}
                        </li>
                      ))}
                    </ol>

                    <dl className="architecture-module__metrics">
                      {module.metrics.map((metric) => (
                        <div key={metric.label}>
                          <dt>{metric.label}</dt>
                          <dd>{metric.value}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <footer className="architecture-system__footer">
          <dl className="architecture-system__metrics">
            <div><dt>Integrated sources</dt><dd>12</dd></div>
            <div><dt>Operating layers</dt><dd>04</dd></div>
            <div><dt>Availability target</dt><dd>99.9%</dd></div>
            <div><dt>Response target</dt><dd>&lt;15 min</dd></div>
          </dl>
          <Link href="/giai-phap">
            Xem cấu trúc giải pháp
            <ArrowUpRight size={18} weight="bold" aria-hidden="true" />
          </Link>
        </footer>
      </div>
    </MotionSection>
  );
}
