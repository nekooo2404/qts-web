"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export function ScrollAnimations() {
  const pathname = usePathname();

  useEffect(() => {
    const elements = Array.from(document.querySelectorAll<HTMLElement>("[data-animate]"));
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const observer = reduceMotion
      ? null
      : new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (!entry.isIntersecting) {
                return;
              }

              const element = entry.target as HTMLElement;
              element.classList.add(
                "animate__animated",
                element.dataset.animate ?? "animate__fadeInUp",
                "entrance-motion",
              );
              observer?.unobserve(element);
            });
          },
          { rootMargin: "0px 0px -10%", threshold: 0.12 },
        );

    elements.forEach((element) => observer?.observe(element));

    function cleanup() {
      elements.forEach((element) => observer?.unobserve(element));
      observer?.disconnect();
    }

    return cleanup;
  }, [pathname]);

  return null;
}
