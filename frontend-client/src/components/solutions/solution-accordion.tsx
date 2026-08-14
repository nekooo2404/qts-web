import { ArrowRight } from "@phosphor-icons/react/dist/ssr";

import { solutions } from "@/data/site-content";

export function SolutionAccordion() {
  return (
    <div className="divide-y divide-qts-border border-y border-qts-border">
      {solutions.map((item, index) => (
        <details
          key={item.id}
          name="qts-solutions"
          open={index === 0}
          className="collapse collapse-arrow rounded-none bg-transparent text-qts-ink"
        >
          <summary className="collapse-title grid min-h-0 cursor-pointer gap-4 py-7 pr-14 text-left sm:grid-cols-[2.5rem_minmax(0,1fr)] sm:py-9">
            <span className="text-sm font-semibold text-qts-primary" aria-hidden="true">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="display-wrap text-xl font-semibold leading-tight text-qts-deep sm:text-2xl">
              {item.problem}
            </span>
          </summary>
          <div className="collapse-content pb-8 sm:pl-[4.5rem] sm:pr-16">
            <div className="grid gap-4 border-l-2 border-qts-primary pl-5 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-start sm:gap-6">
              <ArrowRight className="mt-1 hidden text-qts-primary sm:block" size={24} aria-hidden="true" />
              <div>
                <h2 className="display-wrap text-lg font-semibold leading-7 text-qts-primary sm:text-xl">
                  {item.solution}
                </h2>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-qts-muted sm:text-base sm:leading-7">
                  {item.description}
                </p>
              </div>
            </div>
          </div>
        </details>
      ))}
    </div>
  );
}
