import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

import { capabilities, capabilityIcons } from "@/data/site-content";

const cardStyles = [
  "bg-qts-deep text-white lg:col-span-7",
  "bg-qts-secondary text-qts-deep lg:col-span-5",
  "bg-qts-accent text-qts-deep lg:col-span-5",
  "bg-qts-surface text-qts-deep lg:col-span-7",
] as const;

export function CapabilitiesSection() {
  return (
    <section id="nang-luc" className="bg-qts-soft py-16 sm:py-20 lg:py-28">
      <div className="page-shell" data-animate="animate__fadeInUp">
        <div className="flex flex-col gap-6 border-b border-qts-border pb-8 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-bold uppercase text-qts-primary">Năng lực cốt lõi</p>
            <h2 className="display-wrap mt-3 max-w-3xl text-3xl font-bold leading-tight text-qts-deep sm:text-4xl lg:text-5xl">
              Bốn lớp năng lực, cùng phục vụ một hệ thống thống nhất.
            </h2>
          </div>
          <Link
            href="/nang-luc"
            className="inline-flex min-h-11 items-center gap-2 self-start border-b-2 border-qts-primary pb-1 font-semibold text-qts-primary md:self-auto"
          >
            Khám phá năng lực
            <ArrowUpRight size={19} weight="bold" aria-hidden="true" />
          </Link>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-12">
          {capabilities.map((capability, index) => {
            const Icon = capabilityIcons[capability.iconKey];
            const mutedText = index === 0 ? "text-qts-secondary" : "text-qts-muted";

            return (
              <article
                key={capability.id}
                className={`hvr-float min-h-64 w-full border border-qts-border/70 p-7 shadow-[var(--shadow-raised)] sm:p-9 ${cardStyles[index]}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <Icon size={36} weight="duotone" aria-hidden="true" />
                  <span className="text-sm font-bold opacity-60">0{index + 1}</span>
                </div>
                <h3 className="display-wrap mt-12 max-w-xl text-2xl font-bold leading-tight">
                  {capability.title}
                </h3>
                <p className={`mt-4 max-w-xl text-sm leading-7 ${mutedText}`}>
                  {capability.description}
                </p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
