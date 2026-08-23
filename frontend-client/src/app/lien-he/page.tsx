import type { Metadata } from "next";
import Image from "next/image";
import {
  ArrowSquareOut,
  CheckCircle,
  Clock,
  EnvelopeSimple,
  MapPin,
  Phone,
  ShieldCheck,
  Timer,
} from "@phosphor-icons/react/dist/ssr";

import { ContactForm } from "@/components/contact/contact-form";
import { getCompanyInfo } from "@/lib/public-api";

const supportEmail = "support@qts.com.vn";

export const metadata: Metadata = {
  title: "Trao đổi với QTS",
  description: "Bắt đầu từ bài toán cần được giải quyết và gửi phạm vi hệ thống cho đội ngũ QTS.",
};

export default async function ContactPage() {
  const companyInfo = await getCompanyInfo();
  return (
    <main className="contact-page">
      <section className="contact-section bg-qts-paper pb-16 sm:pb-20 lg:pb-28" aria-labelledby="contact-title">
        <div className="page-shell">
          <header className="contact-page__header" data-reveal>
            <p className="contact-eyebrow">Trao đổi với QTS</p>
            <h1 id="contact-title" className="display-wrap contact-page__title">
              Bắt đầu từ bài toán cần được giải quyết.
            </h1>
            <p className="body-wrap contact-page__intro">
              Bài toán, quy mô và bối cảnh vận hành tạo thành đầu vào cho cuộc trao đổi kỹ thuật đầu tiên.
            </p>
          </header>

          <div className="contact-layout grid gap-10 lg:grid-cols-12 lg:items-start">
          <aside className="contact-aside lg:col-span-4" data-reveal>
            <div className="contact-aside__header">
              <p className="contact-eyebrow">Thông tin trao đổi</p>
              <p className="contact-aside__intro">Hotline, email và địa chỉ làm việc của QTS.</p>
            </div>

            <div className="contact-detail contact-detail--interactive">
              <span className="contact-detail__icon" aria-hidden="true">
                <Phone size={19} weight="regular" />
              </span>
              <div>
                <p className="contact-detail__label">Hotline</p>
                <a className="contact-detail__value" href={`tel:${companyInfo.hotline}`}>
                  +84 24 7300 0888
                </a>
              </div>
            </div>

            <div className="contact-detail contact-detail--interactive">
              <span className="contact-detail__icon" aria-hidden="true">
                <EnvelopeSimple size={19} weight="regular" />
              </span>
              <div>
                <p className="contact-detail__label">Email hỗ trợ</p>
                <a className="contact-detail__value contact-detail__value--email" href={`mailto:${supportEmail}`}>
                  {supportEmail}
                </a>
              </div>
            </div>

            <div className="contact-detail">
              <span className="contact-detail__icon" aria-hidden="true">
                <MapPin size={19} weight="regular" />
              </span>
              <div>
                <p className="contact-detail__label">Văn phòng</p>
                <p className="contact-detail__value">{companyInfo.address}</p>
                <p className="contact-detail__meta">{companyInfo.hours}</p>
                <a
                  className="contact-map-link"
                  href={`https://www.openstreetmap.org/search?query=${encodeURIComponent(companyInfo.address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Xem trên bản đồ
                  <ArrowSquareOut size={16} weight="bold" aria-hidden="true" />
                </a>
              </div>
            </div>

            <div className="contact-detail">
              <span className="contact-detail__icon" aria-hidden="true">
                <Clock size={19} weight="regular" />
              </span>
              <div>
                <p className="contact-detail__label">Thời gian phản hồi</p>
                <p className="contact-detail__value">Trong vòng 24 giờ làm việc</p>
              </div>
            </div>

            <ul className="contact-trust" aria-label="Cam kết hỗ trợ">
              <li className="contact-trust__item">
                <ShieldCheck size={18} weight="regular" aria-hidden="true" />
                <span>Bảo mật thông tin</span>
              </li>
              <li className="contact-trust__item">
                <Timer size={18} weight="regular" aria-hidden="true" />
                <span>Phản hồi trong 24h</span>
              </li>
              <li className="contact-trust__item">
                <CheckCircle size={18} weight="regular" aria-hidden="true" />
                <span>Tư vấn miễn phí ban đầu</span>
              </li>
            </ul>

            <figure className="contact-aside__visual">
              <Image
                src="/images/qts-intake-topology.svg"
                alt="Sơ đồ quy trình trao đổi từ bài toán đến vận hành"
                width={1200}
                height={420}
                sizes="(min-width: 1024px) 420px, 100vw"
                unoptimized
              />
              <figcaption>PROBLEM / DISCOVERY / ARCHITECTURE / OPERATIONS</figcaption>
            </figure>

            <div className="contact-privacy">
              <p>Vì an toàn thông tin, vui lòng không gửi mật khẩu, khóa truy cập hoặc dữ liệu bí mật qua biểu mẫu này.</p>
            </div>
          </aside>

          <div className="contact-form-column lg:col-span-7 lg:col-start-6" data-reveal>
            <ContactForm />
          </div>
          </div>
        </div>
      </section>
    </main>
  );
}
