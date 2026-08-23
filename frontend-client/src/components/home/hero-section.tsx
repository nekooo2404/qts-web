import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

import { SystemArchitecture } from "@/components/shared/system-architecture";

export function HeroSection() {
  return (
    <section className="system-hero qts-dark bg-qts-deep text-white">
      <div className="system-hero__grid page-shell">
        <div className="system-hero__content">
          <p className="system-hero__statement">Engineering intelligence. Building human impact.</p>
          <h1 className="hero-title font-bold">
            <span className="hero-title__line"><span>Thiết kế và vận hành</span></span>
            <span className="hero-title__line"><span>hệ thống số</span></span>
            <span className="hero-title__line"><span>cho quy trình phức tạp.</span></span>
          </h1>
          <p className="hero-description body-wrap">
            QTS chuyển bài toán vận hành thành kiến trúc, lộ trình triển khai và cơ chế cải tiến có thể kiểm tra.
          </p>
          <div className="system-hero__actions">
            <Link href="/nang-luc" className="qts-button qts-button--accent qts-button--hero">
              Khám phá năng lực
              <ArrowRight size={20} weight="bold" aria-hidden="true" />
            </Link>
            <span className="system-hero__mode"><i aria-hidden="true" /> System loop / active</span>
          </div>
          <dl className="system-hero__facts">
            <div>
              <dt>Architecture</dt>
              <dd>Ranh giới rõ</dd>
            </div>
            <div>
              <dt>Security</dt>
              <dd>Ngay từ thiết kế</dd>
            </div>
            <div>
              <dt>Operations</dt>
              <dd>Có thể quan sát</dd>
            </div>
          </dl>
          <nav className="hero-system-loop" aria-label="QTS system loop">
            <span className="hero-system-loop__label">System loop</span>
            <ol>
              <li>ARCH</li>
              <li>INT</li>
              <li>SEC</li>
              <li>OPS</li>
            </ol>
          </nav>
        </div>
        <div className="system-hero__visual">
          <SystemArchitecture />
        </div>
      </div>
    </section>
  );
}
