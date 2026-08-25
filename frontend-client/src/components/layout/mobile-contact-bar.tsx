"use client";

import { ArrowRight } from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export function MobileContactBar() {
  const pathname = usePathname();
  const [pastIntro, setPastIntro] = useState(false);
  const [footerVisible, setFooterVisible] = useState(false);
  const visible = pathname !== "/lien-he" && pastIntro && !footerVisible;

  useEffect(() => {
    const intro = document.querySelector(".flow-hero, .pricing-hero, .system-hero, .route-intro, .contact-page__header");
    const footer = document.querySelector(".site-footer");
    const observers: IntersectionObserver[] = [];
    const resetFrame = requestAnimationFrame(() => {
      setPastIntro(!intro);
      setFooterVisible(false);
    });

    if (intro) {
      const introObserver = new IntersectionObserver(
        ([entry]) => setPastIntro(entry.boundingClientRect.bottom <= 80),
        { rootMargin: "-80px 0px 0px", threshold: 0 },
      );
      introObserver.observe(intro);
      observers.push(introObserver);
    }

    if (footer) {
      const footerObserver = new IntersectionObserver(
        ([entry]) => setFooterVisible(entry.isIntersecting),
        { threshold: 0.02 },
      );
      footerObserver.observe(footer);
      observers.push(footerObserver);
    }

    return () => {
      cancelAnimationFrame(resetFrame);
      observers.forEach((observer) => observer.disconnect());
    };
  }, [pathname]);

  useEffect(() => {
    document.body.classList.toggle("has-mobile-contact-bar", visible);
    return () => document.body.classList.remove("has-mobile-contact-bar");
  }, [visible]);

  if (!visible) return null;

  return (
    <aside className="mobile-contact-bar" aria-label="Trao đổi nhanh với QTS">
      <span>
        <i aria-hidden="true" /> QTS system online
      </span>
      <Link href="/lien-he" prefetch aria-label="Trao đổi nhanh với QTS">
        Trao đổi với QTS
        <ArrowRight size={18} weight="bold" aria-hidden="true" />
      </Link>
    </aside>
  );
}
