import { ArrowRight, CheckCircle } from "@phosphor-icons/react/dist/ssr";
import Image from "next/image";
import Link from "next/link";

const systemLayers = ["Kiến trúc", "Tích hợp", "An toàn"] as const;

export function HeroSection() {
  return (
    <section className="relative isolate min-h-[calc(100svh-11.5rem)] overflow-hidden bg-qts-deep text-white">
      <div className="animate__animated animate__zoomIn entrance-motion absolute inset-0">
        <Image
          src="/images/projects/security-operations-center.svg"
          alt=""
          fill
          loading="eager"
          fetchPriority="high"
          sizes="100vw"
          className="object-cover object-center opacity-35"
        />
      </div>
      <div className="absolute inset-0 bg-qts-deep/65" aria-hidden="true" />
      <div className="absolute inset-y-0 left-1/4 border-l border-white/10" aria-hidden="true" />
      <div className="absolute inset-y-0 left-1/2 border-l border-white/10" aria-hidden="true" />
      <div className="absolute inset-y-0 left-3/4 border-l border-white/10" aria-hidden="true" />

      <div className="page-shell relative flex min-h-[calc(100svh-11.5rem)] items-end pb-16 pt-10 sm:pb-20 sm:pt-12 lg:items-center lg:pb-24 lg:pt-14">
        <div className="animate__animated animate__fadeInUp entrance-motion max-w-4xl">
          <h1 className="display-wrap text-[2.55rem] font-extrabold leading-[1.02] tracking-normal sm:text-6xl lg:text-7xl">
            <span className="block text-qts-accent">QTS</span>
            <span className="mt-2 block">Kiến tạo hệ thống số để vận hành thật.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-qts-secondary sm:text-lg sm:leading-8">
            Từ bài toán vận hành đến kiến trúc, tích hợp, an toàn thông tin và cải tiến
            liên tục trong một lộ trình rõ ràng.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/lien-he"
              className="hvr-sweep-to-right inline-flex min-h-12 items-center gap-2 bg-qts-primary px-5 font-semibold text-white active:scale-[0.98]"
            >
              Trao đổi dự án
              <ArrowRight size={19} weight="bold" aria-hidden="true" />
            </Link>
            <Link
              href="/nang-luc"
              className="hvr-grow inline-flex min-h-12 items-center border border-white/45 px-5 font-semibold text-white transition-colors hover:border-white hover:bg-white hover:text-qts-deep active:scale-[0.98]"
            >
              Xem năng lực
            </Link>
          </div>

          <ul className="mt-8 grid max-w-2xl grid-cols-3 gap-px border-t border-white/25 pt-4 text-xs font-semibold text-white/80 sm:text-sm">
            {systemLayers.map((layer) => (
              <li key={layer} className="flex min-w-0 items-center gap-2 pr-2">
                <CheckCircle className="shrink-0 text-qts-accent" size={17} aria-hidden="true" />
                <span className="display-wrap">{layer}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
