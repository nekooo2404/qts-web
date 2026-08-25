const trustMetrics = [
  { value: "04", label: "Operating layers", qualifier: "Reference model" },
  { value: "12", label: "Integrated sources", qualifier: "Reference scope" },
  { value: "99.9%", label: "Availability", qualifier: "Design target" },
  { value: "<15 min", label: "Response", qualifier: "Design target" },
] as const;

const evidence = {
  source: "QTS reference architecture",
  reviewedAt: "2026-08-25",
} as const;

export function TrustedCompaniesStrip() {
  return (
    <MotionSection className="trust-metrics" aria-labelledby="trust-metrics-title" lang="en">
      <div className="page-shell trust-metrics__inner">
        <header>
          <h2 id="trust-metrics-title">For organizations requiring enterprise-grade operations.</h2>
          <p>Infrastructure · Cybersecurity · Data Platform · Digital Transformation</p>
        </header>
        <dl>
          {trustMetrics.map((metric) => (
            <div key={metric.label}>
              <dt>{metric.label}</dt>
              <dd>{metric.value}</dd>
              <dd className="metric-qualifier">{metric.qualifier}</dd>
            </div>
          ))}
        </dl>
        <p className="trust-metrics__evidence">
          {evidence.source} · Reviewed {evidence.reviewedAt} · Not live production data
        </p>
      </div>
    </MotionSection>
  );
}
import { MotionSection } from "@/components/shared/motion-primitives";
