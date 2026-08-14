import type { ReactNode } from "react";

interface PageIntroProps {
  title: string;
  description: string;
  aside?: ReactNode;
}

export function PageIntro({ title, description, aside }: PageIntroProps) {
  return (
    <section className="border-b border-qts-border bg-qts-soft">
      <div className="page-shell grid gap-10 py-16 sm:py-20 lg:grid-cols-[minmax(0,2fr)_minmax(16rem,1fr)] lg:items-end lg:py-24">
        <div className="animate__animated animate__fadeInUp max-w-4xl">
          <h1 className="display-wrap text-4xl font-semibold leading-[1.05] text-qts-deep sm:text-5xl lg:text-6xl">
            {title}
          </h1>
          <p className="mt-6 max-w-3xl text-base leading-7 text-qts-muted sm:text-lg sm:leading-8">
            {description}
          </p>
        </div>
        {aside ? (
          <div className="border-l-2 border-qts-primary pl-5 text-sm leading-6 text-qts-muted">
            {aside}
          </div>
        ) : null}
      </div>
    </section>
  );
}
