type RouteVisualVariant = "capabilities" | "solutions" | "projects";

const capabilityLayers = ["Architecture", "Integration", "Security", "Operations"] as const;
const solutionStages = ["Problem", "Discovery", "Architecture", "Implementation", "Operations"] as const;

export function RouteSystemVisual({ variant }: { variant: RouteVisualVariant }) {
  if (variant === "capabilities") {
    return (
      <figure className="route-system route-system--capabilities" aria-label="QTS System Loop gồm bốn lớp năng lực">
        <figcaption>
          <span>QTS / SYSTEM LOOP</span>
          <span>04 layers</span>
        </figcaption>
        <ol>
          {capabilityLayers.map((layer, index) => (
            <li key={layer}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{layer}</strong>
              <i aria-hidden="true" />
            </li>
          ))}
        </ol>
        <div className="route-system__return" aria-hidden="true">Loop / continuous improvement</div>
      </figure>
    );
  }

  if (variant === "solutions") {
    return (
      <figure className="route-system route-system--solutions" aria-label="Luồng từ vấn đề đến vận hành">
        <figcaption>
          <span>QTS / DECISION FLOW</span>
          <span>05 gates</span>
        </figcaption>
        <ol>
          {solutionStages.map((stage, index) => (
            <li key={stage}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{stage}</strong>
              <i aria-hidden="true" />
            </li>
          ))}
        </ol>
        <div className="route-system__return" aria-hidden="true">Problem / architecture / outcome</div>
      </figure>
    );
  }

  return (
    <figure className="route-system route-system--projects" aria-label="Topology dự án từ dữ liệu đến vận hành">
      <figcaption>
        <span>QTS / SYSTEM TOPOLOGY</span>
        <span>Anonymous record</span>
      </figcaption>
      <div className="project-topology" aria-hidden="true">
        <span className="project-topology__node project-topology__node--data">Data</span>
        <span className="project-topology__node project-topology__node--api">API</span>
        <span className="project-topology__node project-topology__node--platform">Platform</span>
        <span className="project-topology__node project-topology__node--security">Security</span>
        <span className="project-topology__node project-topology__node--operations">Operations</span>
        <svg viewBox="0 0 560 300" preserveAspectRatio="none">
          <path d="M80 65V148H208" />
          <path d="M208 148H346" />
          <path d="M208 148V238H472" />
          <path d="M346 148V238H472" />
          <path className="project-topology__signal" d="M80 65V148H208H346V238H472" pathLength="1" />
        </svg>
      </div>
      <div className="route-system__return" aria-hidden="true">Scope / layers / target metrics</div>
    </figure>
  );
}

export type { RouteVisualVariant };
