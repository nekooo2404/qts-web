import { ArrowSquareOut, MapPin, Phone } from "@phosphor-icons/react/dist/ssr";
import type { Metadata } from "next";
import Image from "next/image";

import { ContactForm } from "@/components/contact/contact-form";
import { companyInfo } from "@/data/site-content";

export const metadata: Metadata = {
  title: "Liên hệ",
  description:
    "Gửi yêu cầu tư vấn cho QTS về hạ tầng số, tích hợp hệ thống, an toàn thông tin và vận hành công nghệ.",
};

const openStreetMapViewUrl =
  "https://www.openstreetmap.org/#map=10/21.0500/105.8250";

export default function ContactPage() {
  return (
    <div className="bg-qts-paper">
      <section className="border-b border-qts-border bg-qts-secondary/55">
        <div className="page-shell grid gap-10 py-12 lg:grid-cols-[minmax(0,0.78fr)_minmax(36rem,1.22fr)] lg:items-start lg:gap-14 lg:py-20">
          <div className="animate__animated animate__fadeInUp lg:sticky lg:top-28">
            <p className="text-xs font-bold uppercase text-qts-primary">Liên hệ QTS</p>
            <h1 className="display-wrap mt-4 max-w-xl text-4xl font-extrabold leading-tight text-qts-deep sm:text-5xl lg:text-6xl">
              Bắt đầu từ bài toán đang cần giải quyết.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-8 text-qts-muted sm:text-lg">
              Chia sẻ mục tiêu, hiện trạng hoặc điểm nghẽn của hệ thống. Biểu mẫu bên cạnh
              sẽ chuyển yêu cầu trực tiếp tới dịch vụ liên hệ của QTS.
            </p>

            <div className="mt-9 grid border-y border-qts-border sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <div className="flex min-w-0 gap-4 py-5 sm:border-r sm:border-qts-border sm:pr-5 lg:border-r-0 lg:pr-0 xl:border-r xl:pr-5">
                <MapPin
                  size={24}
                  weight="duotone"
                  className="mt-0.5 shrink-0 text-qts-primary"
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase text-qts-muted">Khu vực trong seed</p>
                  <p className="display-wrap mt-2 font-semibold text-qts-deep">
                    {companyInfo.address}
                  </p>
                </div>
              </div>

              <div className="flex min-w-0 gap-4 border-t border-qts-border py-5 sm:border-t-0 sm:pl-5 lg:border-t lg:pl-0 xl:border-t-0 xl:pl-5">
                <Phone
                  size={24}
                  weight="duotone"
                  className="mt-0.5 shrink-0 text-qts-primary"
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase text-qts-muted">Hotline trong seed</p>
                  <p className="display-wrap mt-2 font-semibold text-qts-deep">
                    {companyInfo.hotline}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 border border-qts-border bg-qts-accent p-4 text-sm leading-6 text-qts-deep">
              Địa chỉ và hotline trên là dữ liệu seed của backend, chưa có nguồn xác minh độc
              lập. Không nên dùng như thông tin văn phòng chính thức trước khi QTS xác nhận.
            </div>
          </div>

          <div className="animate__animated animate__fadeInUp [animation-delay:120ms]">
            <ContactForm />
          </div>
        </div>
      </section>

      <section aria-labelledby="contact-map-title" className="bg-qts-deep text-white">
        <div className="page-shell grid gap-8 py-12 lg:grid-cols-[minmax(0,1.45fr)_minmax(20rem,0.55fr)] lg:items-center lg:gap-12 lg:py-16">
          <div className="relative overflow-hidden border border-white/25 bg-white">
            <Image
              src="/images/hanoi-reference-map.svg"
              alt="Sơ đồ tham chiếu minh họa phạm vi Hà Nội, không đánh dấu văn phòng cụ thể"
              loading="lazy"
              fill
              sizes="(min-width: 1024px) 60vw, 100vw"
              className="object-cover"
            />
            <div className="aspect-[4/3] sm:aspect-[16/8] lg:aspect-[16/9]" aria-hidden="true" />
          </div>

          <div>
            <p className="text-xs font-bold uppercase text-qts-secondary">Phạm vi tham chiếu</p>
            <h2
              id="contact-map-title"
              className="display-wrap mt-3 text-3xl font-bold leading-tight text-white sm:text-4xl"
            >
              Bản đồ tổng quan Hà Nội
            </h2>
            <p className="mt-5 text-sm leading-7 text-white/75">
              Backend hiện chỉ ghi địa chỉ ở cấp thành phố là “{companyInfo.address}”. Vì dữ
              liệu chưa đủ chi tiết, bản đồ chỉ hiển thị phạm vi rộng và không đặt marker văn
              phòng cụ thể.
            </p>
            <p className="mt-3 text-xs leading-5 text-white/60">
              Sơ đồ nền là hình minh họa tham chiếu; mở OpenStreetMap để xem bản đồ trực tiếp.
            </p>
            <a
              href={openStreetMapViewUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-7 inline-flex min-h-11 items-center gap-2 border-b-2 border-qts-accent pb-1 font-semibold text-white transition-colors hover:text-qts-secondary"
            >
              Mở bản đồ OpenStreetMap
              <ArrowSquareOut size={18} weight="bold" aria-hidden="true" />
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
