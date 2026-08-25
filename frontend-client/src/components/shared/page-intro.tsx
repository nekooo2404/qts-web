import { RouteSystemVisual, type RouteVisualVariant } from "@/components/shared/route-system-visual";

interface PageIntroProps {
  title: string;
  description: string;
  variant: RouteVisualVariant;
}
export function PageIntro({ title, description, variant }: PageIntroProps) {
  return (
    <section data-scroll-reveal="section" className={`route-intro route-intro--${variant} qts-dark bg-qts-deep`}>
      <div className="page-shell route-intro__grid">
        <div className="route-intro__copy">
          <h1 className="display-wrap route-intro__title">
            {title}
          </h1>
          <p className="body-wrap route-intro__description">
            {description}
          </p>
        </div>
        <RouteSystemVisual variant={variant} />
      </div>
    </section>
  );
}
