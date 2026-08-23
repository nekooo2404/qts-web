import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

const proof = [
  ["01", "Phạm vi được kiểm chứng", "Architecture, integration và operations được thiết kế như một hệ thống."],
  ["02", "Ranh giới rõ ràng", "Biên hệ thống, phụ thuộc và trách nhiệm được xác lập trước khi triển khai."],
  ["03", "Vận hành được", "Observability, incident response và thay đổi nằm trong cùng thiết kế."],
  ["04", "Đo lường được", "Mỗi giai đoạn có đầu ra, cổng kiểm soát và tiêu chí chuyển bước."],
] as const;

export function HomeClosing() {
  return (
    <section className="why-qts bg-qts-paper" aria-labelledby="why-qts-title">
      <div className="page-shell" data-reveal>
        <div className="why-qts__head">
          <div>
            <h2 id="why-qts-title">Why QTS</h2>
            <p>Công nghệ chỉ có ý nghĩa khi làm cho vận hành rõ ràng hơn.</p>
          </div>
          <Link href="/#phuong-phap">
            Cách QTS làm việc
            <ArrowUpRight size={19} weight="bold" aria-hidden="true" />
          </Link>
        </div>
        <ol className="why-qts__proof">
          {proof.map(([code, title, description]) => (
            <li key={code}>
              <span>{code}</span>
              <h3>{title}</h3>
              <p>{description}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
