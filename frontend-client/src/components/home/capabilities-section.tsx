import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

import { capabilities, capabilityIcons } from "@/data/site-content";
import type { PublicCapability } from "@/types/public-content";

interface CapabilitiesSectionProps {
  items?: Array<PublicCapability & { iconKey: keyof typeof capabilityIcons }>;
}

export function CapabilitiesSection({ items = capabilities }: CapabilitiesSectionProps) {
  return (
    <section id="nang-luc" className="capabilities-section bg-qts-soft py-16 sm:py-20 lg:py-28">
      <div className="page-shell" data-reveal="capabilities-section">
        <div className="grid gap-6 border-b border-qts-border pb-8 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-8">
            <p className="text-sm font-bold uppercase text-qts-primary">Bản đồ năng lực</p>
            <h2 className="display-wrap mt-3 text-3xl font-bold leading-tight text-qts-deep sm:text-4xl lg:text-5xl">
              Bốn lớp cùng hội tụ vào một hệ thống có thể vận hành.
            </h2>
          </div>
          <Link
            href="/nang-luc"
            className="inline-flex min-h-11 items-center gap-2 border-b-2 border-qts-primary pb-1 font-bold text-qts-primary lg:col-span-3 lg:col-start-10 lg:justify-self-end"
          >
            Xem chi tiết
            <ArrowUpRight size={19} weight="bold" aria-hidden="true" />
          </Link>
        </div>

        <div className="capability-system-map">
          <div className="capability-system-map__core" aria-hidden="true">
            <span>QTS</span>
            <strong>System</strong>
            <i />
          </div>
          <ol className="capability-system-map__layers">
          {items.map((capability, index) => {
            const Icon = capabilityIcons[capability.iconKey];
            return (
              <li key={capability.id} data-reveal="capability-card">
                <Link
                  href={`/nang-luc#${capability.id}`}
                  aria-label={`Xem chi tiết: ${capability.title}`}
                  className="capability-system-map__layer"
                >
                  <span className="capability-system-map__index">L{String(index + 1).padStart(2, "0")}</span>
                  <span className="capability-system-map__icon" aria-hidden="true"><Icon size={26} weight="regular" /></span>
                  <span className="capability-system-map__copy">
                    <strong>{capability.title}</strong>
                    <small>{capability.description}</small>
                  </span>
                  <ArrowUpRight size={20} weight="bold" aria-hidden="true" />
                  <i aria-hidden="true" />
                </Link>
              </li>
            );
          })}
          </ol>
        </div>
      </div>
    </section>
  );
}
