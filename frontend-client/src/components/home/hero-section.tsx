import { ArrowRight, Play } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

import { SystemDashboard } from "@/components/home/system-dashboard";
import { HeroVisualMotion, MotionAction, MotionSection } from "@/components/shared/motion-primitives";
import { Button } from "@/components/ui/button";

export function HeroSection() {
  return (
    <MotionSection className="flow-hero" aria-labelledby="home-hero-title">
      <div className="flow-hero__wash" aria-hidden="true" />
      <div className="flow-hero__grid page-shell">
        <div className="flow-hero__content">
          <h1 id="home-hero-title" className="flow-hero__title" lang="en">
            <span>Operate.</span>
            <span>Secure.</span>
            <span className="flow-hero__title-accent">Scale Enterprise Systems.</span>
          </h1>
          <p id="home-hero-description" className="flow-hero__description">
            QTS giúp doanh nghiệp giám sát, tích hợp và vận hành hệ thống trong một kiến trúc thống nhất.
          </p>
          <div className="flow-hero__actions">
            <MotionAction>
              <Button asChild size="lg">
                <Link href="/lien-he" prefetch aria-describedby="home-hero-description">
                  Trao đổi với QTS
                  <ArrowRight size={18} weight="bold" aria-hidden="true" />
                </Link>
              </Button>
            </MotionAction>
            <MotionAction>
              <Button asChild size="lg" variant="ghost">
                <Link href="/#phuong-phap" prefetch aria-describedby="home-hero-description">
                  <Play size={15} weight="fill" aria-hidden="true" />
                  Xem hệ thống mẫu
                </Link>
              </Button>
            </MotionAction>
          </div>
        </div>
        <HeroVisualMotion className="flow-hero__visual">
          <span className="flow-floating-node flow-floating-node--architecture" aria-hidden="true">Architecture Node</span>
          <span className="flow-floating-node flow-floating-node--security" aria-hidden="true">Security Engine</span>
          <span className="flow-floating-node flow-floating-node--operations" aria-hidden="true">Operation Center</span>
          <SystemDashboard />
        </HeroVisualMotion>
      </div>
    </MotionSection>
  );
}
