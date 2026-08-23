import Link from "next/link";

const architectureNodes = [
  {
    id: "business",
    label: "Business",
    detail: "Mục tiêu, quy trình, ràng buộc",
    href: "/giai-phap",
  },
  {
    id: "data",
    label: "Data",
    detail: "Nguồn, chuẩn hóa, ngữ cảnh",
    href: "/nang-luc#integration",
  },
  {
    id: "integration",
    label: "Integration",
    detail: "API, sự kiện, điều phối",
    href: "/nang-luc#integration",
  },
  {
    id: "security",
    label: "Security",
    detail: "Danh tính, giám sát, ứng cứu",
    href: "/nang-luc#security",
  },
  {
    id: "operations",
    label: "Operations",
    detail: "Quan sát, xử lý, cải tiến",
    href: "/nang-luc#operations",
  },
] as const;

export function SystemArchitecture() {
  return (
    <figure className="system-architecture" aria-labelledby="system-architecture-title">
      <figcaption className="system-architecture__header">
        <span id="system-architecture-title">QTS / SYSTEM ARCHITECTURE</span>
        <span className="system-status"><i aria-hidden="true" /> Operational</span>
      </figcaption>

      <div className="system-architecture__canvas">
        <svg
          className="system-architecture__links"
          viewBox="0 0 760 500"
          role="img"
          aria-label="Business kết nối qua Data, Integration và Security để đi vào Operations"
        >
          <path d="M380 86V160" />
          <path d="M380 160H132V244" />
          <path d="M380 160V244" />
          <path d="M380 160H628V244" />
          <path d="M132 326V390H380" />
          <path d="M380 326V390" />
          <path d="M628 326V390H380" />
          <path className="system-architecture__signal signal-a" d="M380 86V160H132V244" pathLength="1" />
          <path className="system-architecture__signal signal-b" d="M380 86V244" pathLength="1" />
          <path className="system-architecture__signal signal-c" d="M380 86V160H628V244" pathLength="1" />
          <path className="system-architecture__signal signal-d" d="M132 326V390H380" pathLength="1" />
          <path className="system-architecture__signal signal-e" d="M380 326V390" pathLength="1" />
          <path className="system-architecture__signal signal-f" d="M628 326V390H380" pathLength="1" />
        </svg>

        <ol className="system-architecture__nodes">
          {architectureNodes.map((node, index) => (
            <li
              key={node.id}
              data-node-id={node.id}
              className={`system-architecture__node system-architecture__node--${node.id}`}
            >
              <Link href={node.href}>
                <span className="system-architecture__node-index" aria-hidden="true">
                  N{String(index + 1).padStart(2, "0")}
                </span>
                <strong>{node.label}</strong>
                <span className="system-architecture__node-detail">{node.detail}</span>
                <i aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ol>
      </div>

      <div className="system-architecture__footer">
        <span>Architecture loop / 04 layers</span>
        <span>Signal / live</span>
      </div>
    </figure>
  );
}
