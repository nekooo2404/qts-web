"use client";

import {
  ChartLine,
  Database,
  HardDrives,
  Pulse,
  ShieldCheck,
} from "@phosphor-icons/react";
import { motion, useReducedMotion } from "framer-motion";

import { Badge } from "@/components/ui/badge";

const systemStates = [
  { label: "Infrastructure", state: "MODELED", icon: HardDrives, tone: "blue" },
  { label: "Security", state: "CONTROLLED", icon: ShieldCheck, tone: "cyan" },
  { label: "Data Pipeline", state: "REFERENCE", icon: Database, tone: "mint" },
  { label: "Operations", state: "BASELINE", icon: Pulse, tone: "violet" },
] as const;

export function SystemDashboard() {
  const reducedMotion = useReducedMotion();

  return (
    <motion.figure
      className="live-dashboard"
      aria-label="Mô hình tham chiếu QTS System Center, không phải dữ liệu production"
      lang="en"
      initial={false}
      whileInView={reducedMotion ? undefined : { opacity: 1, scale: 1, y: 0 }}
      whileHover={reducedMotion ? undefined : { scale: 1.006, y: -3 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
    >
      <header className="live-dashboard__top">
        <div>
          <span className="live-dashboard__mark">Q</span>
          <div>
            <small>QTS Operations Dashboard</small>
            <strong>QTS SYSTEM CENTER</strong>
          </div>
        </div>
        <Badge variant="success" className="live-dashboard__live">
          <motion.i
            aria-hidden="true"
            animate={reducedMotion ? undefined : {
              opacity: [0.7, 1, 0.7],
              scale: [0.86, 1.1, 0.86],
            }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          />
          Reference
        </Badge>
      </header>

      <section className="live-dashboard__health" aria-labelledby="system-health-title">
        <div>
          <span id="system-health-title">Model Health</span>
          <strong>98.7%</strong>
          <small>Illustrative architecture score</small>
        </div>
        <div className="live-dashboard__health-visual" aria-hidden="true">
          <svg viewBox="0 0 160 68" preserveAspectRatio="none">
            <motion.path
              d="M2 54C20 51 25 36 43 40s23 9 38-3 18-27 35-20 20 26 42 5"
              initial={false}
              whileInView={{ pathLength: 1, opacity: 1 }}
              viewport={{ once: true, amount: 0.7 }}
              transition={{ duration: 1.15, ease: [0.16, 1, 0.3, 1] }}
            />
          </svg>
          <span><i /></span>
        </div>
      </section>

      <div
        className="live-dashboard__progress"
        role="progressbar"
        aria-label="Điểm mô hình tham chiếu"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={98.7}
      >
        <motion.span
          initial={false}
          whileInView={{ width: "98.7%", opacity: 1 }}
          viewport={{ once: true, amount: 0.8 }}
          transition={{ duration: 1.05, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>

      <section className="live-dashboard__states" aria-labelledby="system-state-title">
        <header>
          <div>
            <h2 id="system-state-title">Reference system state</h2>
            <p>Illustrative architecture overview</p>
          </div>
          <ChartLine size={20} weight="regular" aria-hidden="true" />
        </header>
        <ul>
          {systemStates.map((item) => {
            const Icon = item.icon;
            return (
              <motion.li
                key={item.label}
                className={`live-dashboard__state live-dashboard__state--${item.tone}`}
                whileHover={reducedMotion ? undefined : { x: 3, backgroundColor: "rgb(255 255 255 / 0.92)" }}
                transition={{ duration: 0.18, ease: "easeOut" }}
              >
                <span className="live-dashboard__state-icon"><Icon size={19} weight="regular" aria-hidden="true" /></span>
                <span>{item.label}</span>
                <strong>
                  <motion.i
                    aria-hidden="true"
                    animate={reducedMotion ? undefined : {
                      opacity: [0.65, 1, 0.65],
                      scale: [0.9, 1.08, 0.9],
                    }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                  />
                  {item.state}
                </strong>
              </motion.li>
            );
          })}
        </ul>
      </section>

      <dl className="live-dashboard__metrics">
        <div>
          <dt>Sample incidents</dt>
          <dd>02</dd>
          <dd className="metric-note">Reference state</dd>
        </div>
        <div>
          <dt>Response Time</dt>
          <dd>&lt;15 min</dd>
          <dd className="metric-note">Target MTTA</dd>
        </div>
        <div>
          <dt>Availability</dt>
          <dd>99.9%</dd>
          <dd className="metric-note">Design target</dd>
        </div>
      </dl>
    </motion.figure>
  );
}
