"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";

import { partners } from "@/data/site-content";

function PartnerGroup({ duplicate = false }: { duplicate?: boolean }) {
  return (
    <ul className="trusted-strip__group" aria-hidden={duplicate || undefined}>
      {partners.map((company) => (
        <li key={company.name} className="trusted-strip__company">
          <Image
            src={company.src}
            alt={company.name}
            width={company.width}
            height={company.height}
            className="trusted-strip__logo"
            unoptimized
          />
        </li>
      ))}
    </ul>
  );
}

export function TrustedCompaniesStrip() {
  const sectionRef = useRef<HTMLElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  const pauseOnPointer = () => viewportRef.current?.setAttribute("data-paused", "true");
  const resumeOnPointer = () => viewportRef.current?.removeAttribute("data-paused");

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let isVisible = false;
    const syncMotion = () => {
      section.toggleAttribute(
        "data-running",
        isVisible && !document.hidden && !reducedMotion.matches,
      );
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting;
        syncMotion();
      },
      { rootMargin: "64px 0px", threshold: 0 },
    );

    const initialRect = section.getBoundingClientRect();
    isVisible = initialRect.bottom >= -64 && initialRect.top <= window.innerHeight + 64;
    syncMotion();
    observer.observe(section);
    document.addEventListener("visibilitychange", syncMotion);
    reducedMotion.addEventListener("change", syncMotion);

    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", syncMotion);
      reducedMotion.removeEventListener("change", syncMotion);
      section.removeAttribute("data-running");
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      className="trusted-strip"
      aria-labelledby="trusted-companies-title"
    >
      <div className="page-shell">
        <div className="trusted-strip__surface">
          <div className="trusted-strip__visual" aria-hidden="true">
            <Image
              src="/images/qts-capability-blueprint.svg"
              alt=""
              fill
              sizes="(max-width: 48rem) calc(100vw - 2rem), 69rem"
              className="trusted-strip__visual-image"
              unoptimized
            />
          </div>
          <div className="trusted-strip__content">
            <h2 id="trusted-companies-title" className="trusted-strip__title">
              Trusted by Leading Brands
            </h2>
            <div
              ref={viewportRef}
              className="trusted-strip__viewport"
              role="region"
              aria-label="Browse trusted enterprise relationships"
              tabIndex={0}
              onMouseEnter={pauseOnPointer}
              onMouseLeave={resumeOnPointer}
              onFocus={pauseOnPointer}
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                  resumeOnPointer();
                }
              }}
            >
              <div className="trusted-strip__track">
                <PartnerGroup />
                <PartnerGroup duplicate />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
