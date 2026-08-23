import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

import { getCompanyInfo } from "@/lib/public-api";

const footerGroups = [
  {
    id: "capabilities",
    label: "Năng lực",
    links: [
      { href: "/nang-luc#architecture", label: "Kiến trúc hệ thống" },
      { href: "/nang-luc#integration", label: "Tích hợp và dữ liệu" },
      { href: "/nang-luc#security", label: "An toàn thông tin" },
      { href: "/nang-luc#operations", label: "Vận hành hệ thống" },
    ],
  },
  {
    id: "solutions",
    label: "Giải pháp",
    links: [
      { href: "/giai-phap#cybersecurity", label: "Giám sát an ninh" },
      { href: "/giai-phap#infrastructure", label: "Hạ tầng số" },
      { href: "/giai-phap#data-platform", label: "Nền tảng dữ liệu" },
    ],
  },
  {
    id: "company",
    label: "Công ty",
    links: [
      { href: "/du-an", label: "Dự án" },
    ],
  },
] as const;

export default async function Footer() {
  const companyInfo = await getCompanyInfo();
  return (
    <footer className="site-footer qts-dark">
      <div className="page-shell">
        <section
          className="site-footer__closing"
          aria-labelledby="footer-closing-title"
          data-reveal="footer-closing"
        >
          <div className="site-footer__closing-grid">
            <div>
              <h2 id="footer-closing-title" className="site-footer__closing-title">
                Ready to build<br />the system?
              </h2>
              <p className="site-footer__closing-copy">
                Từ bài toán phức tạp đến một hệ thống có thể triển khai, kiểm tra và cải tiến.
              </p>
              <Link href="/lien-he" className="qts-button site-footer__cta">
                Trao đổi với QTS
                <ArrowRight size={21} weight="bold" aria-hidden="true" />
              </Link>
            </div>

            <div className="footer-system-loop" aria-label="QTS System Loop">
              <div className="footer-system-loop__head">
                <span>QTS / SYSTEM LOOP</span>
                <span className="system-status"><i aria-hidden="true" /> Active</span>
              </div>
              <ol>
                <li><span>01</span><strong>Architecture</strong></li>
                <li><span>02</span><strong>Integration</strong></li>
                <li><span>03</span><strong>Security</strong></li>
                <li><span>04</span><strong>Operations</strong></li>
              </ol>
              <p>From complexity to operable systems.</p>
            </div>
          </div>
        </section>

        <div className="site-footer__directory" data-reveal="footer-directory">
          <div className="site-footer__brand">
            <Link href="/" className="site-footer__brand-link" aria-label="QTS Technology Solutions">
              <span className="site-footer__brand-mark" aria-hidden="true">Q</span>
              <span>
                <strong>QTS</strong>
                <small>Technology Solutions</small>
              </span>
            </Link>
            <p className="site-footer__brand-statement">
              Engineering intelligence.<br />Building human impact.
            </p>
            <p className="site-footer__signature">Architecture · Integration · Security · Operations</p>
          </div>

          {footerGroups.map((group) => (
            <nav
              key={group.id}
              className={`site-footer__group site-footer__group--${group.id}`}
              aria-label={`Liên kết ${group.label.toLocaleLowerCase("vi")}`}
            >
              <h3>{group.label}</h3>
              <ul role="list">
                {group.links.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className="site-footer__link">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          <address className="site-footer__contact">
            <h3>Thông tin QTS</h3>
            <a className="site-footer__link" href={`mailto:${companyInfo.email}`}>
              {companyInfo.email}
            </a>
            <a className="site-footer__link" href={`tel:${companyInfo.hotline}`}>
              +84 24 7300 0888
            </a>
            <p>{companyInfo.address}</p>
            <p>{companyInfo.hours}</p>
          </address>
        </div>

        <div className="site-footer__legal">
          <p>© {new Date().getFullYear()} QTS Technology Solutions.</p>
          <p>{companyInfo.address}</p>
        </div>
      </div>
    </footer>
  );
}
