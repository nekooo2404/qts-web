"use client";

import {
  ArrowsClockwise,
  CaretDown,
  Check,
  Clock,
  Database,
  Eye,
  Fingerprint,
  Pause,
  Play,
  Pulse,
  ShieldCheck,
  UsersThree,
} from "@phosphor-icons/react";
import { useEffect, useState } from "react";

import { DepthSurface, MotionSection, TiltedCard } from "@/components/shared/motion-primitives";

const systemStates = [
  ["Infrastructure", "Healthy"],
  ["Security", "Protected"],
  ["Monitoring", "Active"],
  ["Operations", "Stable"],
] as const;

const securityPath = [
  { label: "Users", icon: UsersThree },
  { label: "Identity", icon: Fingerprint },
  { label: "Application Security", icon: ShieldCheck },
  { label: "Data Protection", icon: Database },
  { label: "Operation Monitoring", icon: Pulse },
] as const;

const trustIndicators = [
  "Identity Control",
  "Audit Trail",
  "Monitoring",
  "Incident Response",
  "Backup Strategy",
  "Change Governance",
] as const;

const proofCards = [
  {
    id: "defense",
    title: "Defense in Depth",
    shortTitle: "Defense in Depth",
    description: "Multiple protection layers across every component.",
    icon: ShieldCheck,
  },
  {
    id: "observability",
    title: "Continuous Monitoring",
    shortTitle: "Observability",
    description: "Real-time visibility across systems.",
    icon: Eye,
  },
  {
    id: "change",
    title: "Controlled Change",
    shortTitle: "Controlled Change",
    description: "Every change has scope and rollback.",
    icon: ArrowsClockwise,
  },
  {
    id: "response",
    title: "Measurable Response",
    shortTitle: "Response",
    description: "Every incident has timeline and metrics.",
    icon: Clock,
  },
] as const;

export function HomeClosing() {
  const [activeIndex, setActiveIndex] = useState(0);
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

  const motionActive = isPlaying && !reducedMotion;

  return (
    <MotionSection id="security" className="security-control" aria-labelledby="security-control-title">
      <div className="page-shell">
        <header className="security-control__heading" data-reveal>
          <p className="security-control__label">Security Layer</p>
          <h2 id="security-control-title">
            <span>An toàn &amp;</span>
            <span>Độ tin cậy</span>
          </h2>
          <p>Continuous control across architecture, security and operations.</p>
        </header>

        <DepthSurface className="depth-tool-wrap" strength={2}>
        <section
          className="security-center"
          data-scroll-reveal="section"
          data-playing={motionActive}
          aria-labelledby="security-center-title"
          data-reveal="security-center"
        >
          <header className="security-center__top">
            <div>
              <span className="security-center__mark">Q</span>
              <div>
                <small>QTS Enterprise Platform</small>
                <h3 id="security-center-title">QTS CONTROL CENTER</h3>
              </div>
            </div>
            <div className="security-center__top-actions">
              <span className="security-center__model">Model data</span>
              <button
                type="button"
                className="security-center__motion"
                disabled={reducedMotion}
                aria-label={
                  reducedMotion
                    ? "Chuyển động đã tắt theo cài đặt hệ thống"
                    : motionActive
                      ? "Tạm dừng luồng kiểm soát"
                      : "Phát luồng kiểm soát"
                }
                title={
                  reducedMotion
                    ? "Chuyển động đã tắt theo cài đặt hệ thống"
                    : motionActive
                      ? "Tạm dừng luồng kiểm soát"
                      : "Phát luồng kiểm soát"
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

          <div className="security-center__body">
            <section className="security-center__status" aria-labelledby="security-status-title">
              <div className="security-center__score">
                <div>
                  <span id="security-status-title">System Status</span>
                  <strong>98.7%</strong>
                  <small>Model security score</small>
                </div>
                <ShieldCheck size={44} weight="duotone" aria-hidden="true" />
              </div>
              <ul>
                {systemStates.map(([label, status]) => (
                  <li key={label}>
                    <span>{label}</span>
                    <strong><i aria-hidden="true" /> {status}</strong>
                  </li>
                ))}
              </ul>
              <dl>
                <div>
                  <dt>Sample window</dt>
                  <dd>42 days ago</dd>
                </div>
                <div>
                  <dt>Response target</dt>
                  <dd>&lt;15 min</dd>
                </div>
              </dl>
            </section>

            <section className="security-map" aria-labelledby="security-map-title">
              <header>
                <div>
                  <span>Security Visualization</span>
                  <h3 id="security-map-title">QTS SECURITY MAP</h3>
                </div>
                <span className="security-map__alert"><i aria-hidden="true" /> Controls modeled</span>
              </header>
              <ol>
                {securityPath.map((stage, index) => {
                  const Icon = stage.icon;
                  return (
                    <li key={stage.label}>
                      <span className="security-map__node">
                        <Icon size={20} weight="regular" aria-hidden="true" />
                      </span>
                      <div>
                        <small>{String(index + 1).padStart(2, "0")}</small>
                        <strong>{stage.label}</strong>
                      </div>
                      {index < securityPath.length - 1 ? (
                        <span className="security-map__connector" aria-hidden="true"><i /></span>
                      ) : null}
                    </li>
                  );
                })}
              </ol>
            </section>
          </div>
        </section>
        </DepthSurface>

        <section data-scroll-reveal="section" className="security-trust" aria-labelledby="security-trust-title" data-reveal>
          <h3 id="security-trust-title">Built for enterprise requirements</h3>
          <ul>
            {trustIndicators.map((item) => (
              <li key={item}><Check size={15} weight="bold" aria-hidden="true" /> {item}</li>
            ))}
          </ul>
        </section>

        <p className="security-proof-note">
          Illustrative control evidence · Reference states, not live production data.
        </p>

        <div
          className="security-proof-grid"
          data-reveal="security-proof-grid"
          aria-label="Illustrative security control evidence"
        >
          {proofCards.map((card, index) => {
            const Icon = card.icon;
            const expanded = !isCompact || activeIndex === index;
            const bodyId = `security-proof-${card.id}`;
            const summary = (
              <>
                <span className="security-proof-card__number">{String(index + 1).padStart(2, "0")}</span>
                <span className="security-proof-card__icon"><Icon size={21} weight="regular" aria-hidden="true" /></span>
                <span className="security-proof-card__title">{isCompact ? card.shortTitle : card.title}</span>
                {isCompact ? <CaretDown size={18} weight="bold" aria-hidden="true" /> : null}
              </>
            );

            return (
              <TiltedCard key={card.id} strength={2} className={`security-proof-card security-proof-card--${card.id}${expanded ? " is-active" : ""}`}>
                {isCompact ? (
                  <button
                    type="button"
                    className="security-proof-card__summary"
                    aria-expanded={expanded}
                    aria-controls={bodyId}
                    onClick={() => setActiveIndex((current) => current === index ? -1 : index)}
                  >
                    {summary}
                  </button>
                ) : (
                  <div className="security-proof-card__summary">{summary}</div>
                )}

                <div id={bodyId} className="security-proof-card__body" hidden={!expanded}>
                  <p>{card.description}</p>

                  {card.id === "defense" ? (
                    <div className="security-proof-card__checks">
                      <span>Security Layers</span>
                      {["Identity", "Network", "Application", "Data"].map((item) => (
                        <div key={item}><span>{item}</span><Check size={15} weight="bold" aria-hidden="true" /></div>
                      ))}
                      <strong>Reference: 4/4 layers covered</strong>
                    </div>
                  ) : null}

                  {card.id === "observability" ? (
                    <div className="security-proof-card__telemetry">
                      <span>Sample Telemetry</span>
                      <div><span>CPU</span><i><b style={{ width: "32%" }} /></i><strong>32%</strong></div>
                      <div><span>Memory</span><i><b style={{ width: "45%" }} /></i><strong>45%</strong></div>
                      <div><span>Network</span><i><b style={{ width: "88%" }} /></i><strong>Stable</strong></div>
                      <small><i aria-hidden="true" /> Monitoring active</small>
                    </div>
                  ) : null}

                  {card.id === "change" ? (
                    <div className="security-proof-card__checks">
                      <span>Change Controls</span>
                      {["Scope verified", "Rollback ready", "Audit logged"].map((item) => (
                        <div key={item}><span>{item}</span><Check size={15} weight="bold" aria-hidden="true" /></div>
                      ))}
                      <strong>Reference: 3/3 controls verified</strong>
                    </div>
                  ) : null}

                  {card.id === "response" ? (
                    <div className="security-proof-card__timeline">
                      <span>Incident Timeline</span>
                      <ol>
                        {["Detected", "Analyzed", "Resolved"].map((item) => <li key={item}>{item}</li>)}
                      </ol>
                      <strong>Example: 00:12:42</strong>
                      <small>Target &lt;15 min</small>
                    </div>
                  ) : null}
                </div>
              </TiltedCard>
            );
          })}
        </div>
      </div>
    </MotionSection>
  );
}
