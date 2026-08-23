import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import Footer from "@/components/layout/site-footer";
import Navbar from "@/components/layout/site-header";
import { MobileContactBar } from "@/components/layout/mobile-contact-bar";
import { ScrollAnimations } from "@/components/shared/scroll-animations";

import "@fontsource/be-vietnam-pro/400.css";
import "@fontsource/be-vietnam-pro/600.css";
import "@fontsource/be-vietnam-pro/700.css";
import "@fontsource/be-vietnam-pro/800.css";
import "@fontsource-variable/sora";
import "./globals.css";
import "./system-redesign.css";
import "./precision-system.css";

export const metadata: Metadata = {
  title: {
    default: "QTS | Kiến tạo hệ thống số cho doanh nghiệp",
    template: "%s | QTS",
  },
  description:
    "QTS đồng hành cùng doanh nghiệp từ bài toán vận hành đến kiến trúc, triển khai và cải tiến hệ thống số.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#07143d",
};

const designContract = `<!--
THESIS: QTS makes architecture visible and operable; refuse the headline-plus-blob corporate template.
OWN-WORLD: QTS navy fields, pale blueprint surfaces, electric-cyan signals, one-pixel topology, and square operational modules.
STORY: See the live system, trace QTS capabilities through it, inspect technical proof, then submit an engineering brief.
FIRST VIEWPORT: The offer owns the left half; an interactive Business-Data-Integration-Security-Operations topology owns the right with status and live signal paths.
FORM: Data-center patch-panel topology, assigned direction 05, seed f2d4079d.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md
-->`;

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="vi" data-scroll-behavior="smooth">
      <body>
        <template
          data-qts-design-contract
          dangerouslySetInnerHTML={{ __html: designContract }}
        />
        <a
          href="#main-content"
          className="fixed left-3 top-3 z-[70] -translate-y-24 bg-qts-accent px-4 py-3 font-semibold text-qts-deep focus:translate-y-0"
        >
          Bỏ qua điều hướng
        </a>
        <Navbar />
        <ScrollAnimations />
        <div id="main-content">{children}</div>
        <Footer />
        <MobileContactBar />
      </body>
    </html>
  );
}
