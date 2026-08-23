import type { Icon } from "@phosphor-icons/react";
import {
  ArrowUpRight,
  ArrowsClockwise,
  ChartLineUp,
  ChartPieSlice,
  Cube,
  Database,
  Eye,
  FileText,
  Funnel,
  HardDrives,
  MagnifyingGlass,
  PuzzlePiece,
  ShieldCheck,
  Stack,
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

import { solutions } from "@/data/site-content";
import type { PublicSolution } from "@/types/public-content";

const solutionVisuals: Record<string, { leadIcon: Icon; nodeIcons: Icon[]; problemLines: string[] }> = {
  cybersecurity: {
    leadIcon: MagnifyingGlass,
    nodeIcons: [FileText, Funnel, ChartPieSlice, ShieldCheck],
    problemLines: ["Sự kiện an ninh", "nằm rải rác, khó", "phát hiện và", "phối hợp xử lý."],
  },
  infrastructure: {
    leadIcon: ChartLineUp,
    nodeIcons: [Stack, HardDrives, ArrowsClockwise, Eye],
    problemLines: ["Hạ tầng phân", "mảnh khiến thay", "đổi chậm và khó", "kiểm soát độ", "sẵn sàng."],
  },
  "data-platform": {
    leadIcon: Database,
    nodeIcons: [Database, PuzzlePiece, ShieldCheck, Cube],
    problemLines: ["Dữ liệu cùng một", "nghiệp vụ nhưng", "khác định nghĩa", "và không theo", "kịp quyết định."],
  },
};

export function SolutionsPreview({ items = solutions }: { items?: PublicSolution[] }) {
  return (
    <section
      id="giai-phap"
      className="solutions-preview py-16 sm:py-20 lg:py-28"
      aria-labelledby="solutions-title"
    >
      <div className="page-shell">
        <div className="grid gap-6 lg:grid-cols-12 lg:items-end" data-reveal="solution-story-intro">
          <h2
            id="solutions-title"
            className="display-wrap text-3xl font-semibold leading-tight text-qts-deep sm:text-4xl lg:col-span-7 lg:text-5xl"
          >
            Bắt đầu bằng vấn đề. Kết thúc bằng một trạng thái vận hành rõ ràng.
          </h2>
          <p className="body-wrap text-base leading-7 text-qts-muted lg:col-span-4 lg:col-start-9">
            Mỗi hướng giải pháp được biểu diễn bằng luồng kiến trúc để người đọc thấy cách các lớp liên kết.
          </p>
        </div>

        <ol className="solution-story">
          {items.map((item, index) => {
            const visual = solutionVisuals[item.id] ?? solutionVisuals.cybersecurity;
            const LeadIcon = visual.leadIcon;

            return (
              <li key={item.id}>
                <article
                  className={`solution-story__row solution-story__row--${item.id}`}
                  data-story-row
                  aria-labelledby={`solution-problem-${item.id}`}
                >
                  <div className="solution-story__rail" aria-hidden="true">
                    <span className="solution-story__number">{String(index + 1).padStart(2, "0")}</span>
                    <span className="solution-story__lead-icon">
                      <LeadIcon size={34} weight="light" />
                    </span>
                  </div>

                  <h3
                    id={`solution-problem-${item.id}`}
                    className="solution-story__problem"
                    aria-label={item.problem}
                  >
                    {visual.problemLines.map((line) => (
                      <span key={line} className="solution-story__problem-line" aria-hidden="true">
                        <span>{line}</span>
                      </span>
                    ))}
                  </h3>

                  <div className="solution-story__content">
                    <ol className="solution-story__pipeline" aria-label="Luồng kiến trúc giải pháp">
                      {item.architecture.map((layer, layerIndex) => {
                        const NodeIcon = visual.nodeIcons[layerIndex] ?? FileText;

                        return (
                          <li key={layer} className="solution-story__stage">
                            <div className="solution-story__node">
                              <span className="solution-story__node-icon" aria-hidden="true">
                                <NodeIcon size={27} weight="light" />
                              </span>
                              <span>{layer}</span>
                            </div>
                            {layerIndex < item.architecture.length - 1 ? (
                              <span className="solution-story__connector" aria-hidden="true">
                                <svg viewBox="0 0 48 12" preserveAspectRatio="none">
                                  <path className="solution-story__connector-base" d="M1 6H44" />
                                  <path className="solution-story__connector-flow" pathLength="1" d="M1 6H44" />
                                  <path className="solution-story__connector-arrow" d="m40 2 5 4-5 4" />
                                </svg>
                              </span>
                            ) : null}
                          </li>
                        );
                      })}
                    </ol>

                    <p className="solution-story__result">
                      <span>{item.desiredState}</span>
                    </p>
                  </div>
                </article>
              </li>
            );
          })}
        </ol>

        <Link href="/giai-phap" className="solution-story__link">
          Xem cấu trúc giải pháp
          <ArrowUpRight size={19} weight="bold" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
