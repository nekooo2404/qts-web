"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export function ScrollAnimations() {
  const pathname = usePathname();

  useEffect(() => {
    document.documentElement.classList.add("motion-ready");
    const elements = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    const storyRows = Array.from(document.querySelectorAll<HTMLElement>("[data-story-row]"));
    const workflowRows = storyRows.filter((row) => row.dataset.storyRow === "workflow");
    const workflowJourney = document.querySelector<HTMLElement>(".workflow-journey");
    workflowJourney?.style.setProperty("--workflow-progress", "0");
    const syncWorkflowProgress = (activeRow: HTMLElement) => {
      if (!workflowJourney || !workflowRows.includes(activeRow)) return;

      const marker = activeRow.querySelector<HTMLElement>(".workflow-step__marker");
      if (!marker) return;

      const journeyRect = workflowJourney.getBoundingClientRect();
      const markerRect = marker.getBoundingClientRect();
      const isDesktop = window.matchMedia("(min-width: 48rem)").matches;
      const progress = isDesktop
        ? (markerRect.left + markerRect.width / 2 - (journeyRect.left + journeyRect.width * 0.125)) /
          (journeyRect.width * 0.75)
        : (markerRect.top + markerRect.height / 2 - (journeyRect.top + 8)) /
          (journeyRect.height - 40);

      workflowJourney.style.setProperty("--workflow-progress", String(Math.min(1, Math.max(0, progress))));
    };
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let revealObserver: IntersectionObserver | undefined;

    if (reduceMotion) {
      elements.forEach((element) => element.classList.add("is-visible"));
      storyRows.forEach((row) => row.classList.add("has-entered"));
    } else {
      revealObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add("is-visible");
            revealObserver?.unobserve(entry.target);
          });
        },
        { rootMargin: "0px 0px -8%", threshold: 0.12 },
      );

      elements.forEach((element) => revealObserver?.observe(element));
    }

    const visibleRows = new Set<HTMLElement>();
    const storyObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const row = entry.target as HTMLElement;
          if (entry.isIntersecting) {
            row.classList.add("has-entered");
            visibleRows.add(row);
          } else {
            visibleRows.delete(row);
          }
        });

        const viewportAnchor = window.innerHeight * 0.42;
        const activeRow = [...visibleRows].sort((a, b) => {
          const aRect = a.getBoundingClientRect();
          const bRect = b.getBoundingClientRect();
          return (
            Math.abs(aRect.top + aRect.height / 2 - viewportAnchor) -
            Math.abs(bRect.top + bRect.height / 2 - viewportAnchor)
          );
        })[0];

        if (!activeRow) return;
        storyRows.forEach((row) => row.classList.toggle("is-active", row === activeRow));

        const workflowIndex = workflowRows.indexOf(activeRow);
        if (workflowIndex >= 0) {
          syncWorkflowProgress(activeRow);
        }
      },
      { rootMargin: "0px 0px -8%", threshold: [0, 0.25, 0.5, 0.75, 1] },
    );

    storyRows.forEach((row) => storyObserver.observe(row));
    const syncActiveWorkflowRow = () => {
      const activeWorkflowRow = workflowRows.find((row) => row.classList.contains("is-active"));
      if (activeWorkflowRow) syncWorkflowProgress(activeWorkflowRow);
    };
    let viewportFrame: number | undefined;
    const handleViewportChange = () => {
      if (viewportFrame !== undefined) return;
      viewportFrame = window.requestAnimationFrame(() => {
        viewportFrame = undefined;
        syncActiveWorkflowRow();
      });
    };
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, { passive: true });
    const handleWorkflowAnimationEnd = () => syncActiveWorkflowRow();
    workflowRows.forEach((row) => row.addEventListener("animationend", handleWorkflowAnimationEnd));
    return () => {
      revealObserver?.disconnect();
      storyObserver.disconnect();
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange);
      workflowRows.forEach((row) => row.removeEventListener("animationend", handleWorkflowAnimationEnd));
      if (viewportFrame !== undefined) window.cancelAnimationFrame(viewportFrame);
    };
  }, [pathname]);

  return null;
}
