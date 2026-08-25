import {
  ArrowRight,
  Blueprint,
  CaretDown,
  Check,
  Database,
  FlowArrow,
  Pulse,
  ShieldCheck,
  Stack,
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

import { MotionSection, TiltedCard } from "@/components/shared/motion-primitives";
import { Button } from "@/components/ui/button";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Pricing",
  description: "Mô hình định giá theo phạm vi cho đánh giá kiến trúc, triển khai nền tảng và vận hành hệ thống doanh nghiệp cùng QTS.",
  path: "/pricing",
});

const engagements = [
  {
    id: "assessment",
    title: "Architecture Assessment",
    model: "Scoped assessment",
    description: "Làm rõ hiện trạng, ranh giới hệ thống và quyết định kiến trúc trước khi đầu tư.",
    icon: Blueprint,
    features: [
      "Current-state review",
      "Target architecture",
      "Risk and control map",
      "Prioritized roadmap",
    ],
  },
  {
    id: "delivery",
    title: "Platform Delivery",
    model: "Program-based",
    description: "Thiết kế, tích hợp và đưa một phạm vi nền tảng vào trạng thái có thể vận hành.",
    icon: Stack,
    features: [
      "Solution architecture",
      "Integration delivery",
      "Security controls",
      "Operational handoff",
    ],
  },
  {
    id: "operations",
    title: "Managed Operations",
    model: "Recurring scope",
    description: "Quan sát, kiểm soát thay đổi và cải tiến liên tục cho hệ thống đang hoạt động.",
    icon: Pulse,
    features: [
      "Service observability",
      "Incident coordination",
      "Change governance",
      "Continuous review",
    ],
  },
] as const;

const pricingDrivers = [
  {
    title: "System boundary",
    description: "Số môi trường, ứng dụng, nguồn dữ liệu và điểm tích hợp nằm trong phạm vi.",
    icon: Stack,
  },
  {
    title: "Integration complexity",
    description: "Mức độ phụ thuộc giữa API, dữ liệu, middleware và hệ thống hiện hữu.",
    icon: FlowArrow,
  },
  {
    title: "Control requirements",
    description: "Yêu cầu về danh tính, audit, bảo mật, sao lưu và quản trị thay đổi.",
    icon: ShieldCheck,
  },
  {
    title: "Operating ownership",
    description: "Ranh giới trách nhiệm giữa đội QTS, đội nội bộ và các nhà cung cấp liên quan.",
    icon: Database,
  },
] as const;

const comparisonRows = [
  ["Best when", "Cần quyết định kiến trúc", "Cần triển khai hoặc chuyển đổi", "Cần vận hành và cải tiến"],
  ["Core output", "Baseline + roadmap", "Working platform", "Managed operating loop"],
  ["Commercial basis", "Defined assessment scope", "Milestone-based program", "Recurring service scope"],
  ["Handoff", "Decision package", "Operational handoff", "Continuous review"],
] as const;

const faqs = [
  [
    "Vì sao QTS không công bố một mức giá cố định?",
    "Hệ thống doanh nghiệp khác nhau về ranh giới, tích hợp, kiểm soát và trách nhiệm vận hành. QTS định giá sau khi các biến số này được xác nhận để đề xuất có thể kiểm tra được.",
  ],
  [
    "Có thể bắt đầu chỉ với Architecture Assessment không?",
    "Có. Assessment là một phạm vi độc lập, phù hợp khi tổ chức cần baseline và roadmap trước khi quyết định triển khai.",
  ],
  [
    "Chi phí công cụ và bản quyền có nằm trong đề xuất không?",
    "Đề xuất sẽ tách rõ dịch vụ QTS, hạ tầng, công cụ và bản quyền bên thứ ba. Không có hạng mục nào được ngầm gộp khi chưa xác nhận phạm vi.",
  ],
  [
    "Managed Operations được xác định phạm vi thế nào?",
    "Phạm vi dựa trên dịch vụ cần quan sát, giờ hỗ trợ, quy trình sự cố, quyền truy cập, trách nhiệm thay đổi và nhịp báo cáo.",
  ],
] as const;

export default function PricingPage() {
  return (
    <main className="pricing-page section-stack">
      <MotionSection className="pricing-hero" aria-labelledby="pricing-hero-title">
        <div className="page-shell pricing-hero__grid">
          <div className="pricing-hero__copy">
            <h1 id="pricing-hero-title">
              Pricing built around
              <span>your system.</span>
            </h1>
            <p>
              QTS định giá theo phạm vi thực: ranh giới hệ thống, độ phức tạp tích hợp,
              yêu cầu kiểm soát và trách nhiệm vận hành.
            </p>
            <div className="pricing-hero__actions">
              <Button asChild size="lg">
                <Link href="/lien-he" prefetch aria-label="Nhận đề xuất phạm vi từ QTS">
                  Nhận đề xuất phạm vi
                  <ArrowRight size={18} weight="bold" aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="ghost">
                <Link href="/pricing#engagements" prefetch aria-label="Xem các mô hình hợp tác với QTS">
                  Xem mô hình hợp tác
                </Link>
              </Button>
            </div>
            <ul className="pricing-hero__assurances">
              <li><Check size={16} weight="bold" aria-hidden="true" /> Assumptions visible</li>
              <li><Check size={16} weight="bold" aria-hidden="true" /> Scope traceable</li>
              <li><Check size={16} weight="bold" aria-hidden="true" /> Third-party costs separated</li>
            </ul>
          </div>

          <aside className="pricing-scope" aria-labelledby="pricing-scope-title">
            <header>
              <div>
                <small>QTS Enterprise Pricing</small>
                <h2 id="pricing-scope-title">SCOPE MODEL</h2>
              </div>
              <span>Custom</span>
            </header>
            <ol>
              {pricingDrivers.map((driver, index) => {
                const Icon = driver.icon;
                return (
                  <li key={driver.title}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <Icon size={20} weight="regular" aria-hidden="true" />
                    <div>
                      <strong>{driver.title}</strong>
                      <small>{driver.description}</small>
                    </div>
                  </li>
                );
              })}
            </ol>
            <footer>
              <span>Proposal output</span>
              <strong>Scope · Assumptions · Commercial model</strong>
            </footer>
          </aside>
        </div>
      </MotionSection>

      <MotionSection id="engagements" className="pricing-engagements" aria-labelledby="pricing-engagements-title">
        <div className="flow-shell">
          <header className="pricing-section-head">
            <h2 id="pricing-engagements-title">Choose the engagement that matches your next decision.</h2>
            <p>Không khóa doanh nghiệp vào tier tính năng. Mỗi mô hình có đầu ra và ranh giới thương mại riêng.</p>
          </header>

          <div className="pricing-card-grid">
            {engagements.map((engagement, index) => {
              const Icon = engagement.icon;
              return (
                <TiltedCard key={engagement.id} strength={2.25} className={`pricing-card pricing-card--${engagement.id}`}>
                  <header>
                    <span className="pricing-card__icon"><Icon size={24} weight="regular" aria-hidden="true" /></span>
                    <span className="pricing-card__number">{String(index + 1).padStart(2, "0")}</span>
                  </header>
                  <h3>{engagement.title}</h3>
                  <p>{engagement.description}</p>
                  <div className="pricing-card__model">
                    <span>Commercial model</span>
                    <strong>{engagement.model}</strong>
                    <small>Custom scope</small>
                  </div>
                  <ul>
                    {engagement.features.map((feature) => (
                      <li key={feature}><Check size={16} weight="bold" aria-hidden="true" /> {feature}</li>
                    ))}
                  </ul>
                  <Button asChild variant="ghost">
                    <Link href="/lien-he" prefetch aria-label={`Trao đổi phạm vi ${engagement.title}`}>
                      Trao đổi phạm vi
                      <ArrowRight size={17} weight="bold" aria-hidden="true" />
                    </Link>
                  </Button>
                </TiltedCard>
              );
            })}
          </div>
        </div>
      </MotionSection>

      <MotionSection className="pricing-drivers" aria-labelledby="pricing-drivers-title">
        <div className="flow-shell pricing-drivers__grid">
          <div>
            <h2 id="pricing-drivers-title">What shapes the proposal.</h2>
            <p>Giá không bắt đầu từ số lượng tính năng. Giá bắt đầu từ biên hệ thống và trách nhiệm cần bàn giao.</p>
          </div>
          <ol>
            {pricingDrivers.map((driver, index) => {
              const Icon = driver.icon;
              return (
                <li key={driver.title}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <Icon size={22} weight="regular" aria-hidden="true" />
                  <div>
                    <h3>{driver.title}</h3>
                    <p>{driver.description}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </MotionSection>

      <MotionSection className="pricing-comparison" aria-labelledby="pricing-comparison-title">
        <div className="flow-shell">
          <header className="pricing-section-head">
            <h2 id="pricing-comparison-title">Compare engagement models.</h2>
            <p>Một cách đọc nhanh để chọn điểm bắt đầu phù hợp, trước khi xác nhận phạm vi chi tiết.</p>
          </header>
          <div className="pricing-table-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">Decision</th>
                  <th scope="col">Assessment</th>
                  <th scope="col">Delivery</th>
                  <th scope="col">Operations</th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map(([label, assessment, delivery, operations]) => (
                  <tr key={label}>
                    <th scope="row">{label}</th>
                    <td data-label="Assessment">{assessment}</td>
                    <td data-label="Delivery">{delivery}</td>
                    <td data-label="Operations">{operations}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </MotionSection>

      <MotionSection className="pricing-faq" aria-labelledby="pricing-faq-title">
        <div className="flow-shell pricing-faq__grid">
          <div>
            <h2 id="pricing-faq-title">Pricing questions, answered clearly.</h2>
            <p>Các nguyên tắc dưới đây giúp doanh nghiệp biết đề xuất sẽ được hình thành và kiểm tra thế nào.</p>
          </div>
          <div className="pricing-faq__list">
            {faqs.map(([question, answer]) => (
              <details key={question}>
                <summary>
                  <span>{question}</span>
                  <CaretDown size={19} weight="bold" aria-hidden="true" />
                </summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </div>
      </MotionSection>

    </main>
  );
}
