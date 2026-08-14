import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { ScrollAnimations } from "@/components/shared/scroll-animations";

import "@fontsource-variable/inter";
import "./globals.css";

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
  themeColor: "#162660",
};

const designContract = `<!--
THESIS: QTS turns operational problems into systems that can be implemented and improved; refuse the generic centered corporate hero.
OWN-WORLD: QTS blue structural fields, pale signal blue, warm paper markers, square geometry, precise linework.
STORY: Understand the problem, see the delivery method, inspect capabilities and sample work, then start a project conversation.
FIRST VIEWPORT: A full-bleed systems field carries the offer and CTA, while the delivery workflow remains visible below the fold.
FORM: Narrative Workflow, direction seed QTS-NW-162660.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md
-->`;

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="vi">
      <body>
        <template
          data-qts-design-contract
          dangerouslySetInnerHTML={{ __html: designContract }}
        />
        <a
          href="#main-content"
          className="fixed left-3 top-3 z-50 -translate-y-24 bg-qts-accent px-4 py-3 font-semibold text-qts-deep focus:translate-y-0"
        >
          Bỏ qua điều hướng
        </a>
        <SiteHeader />
        <main id="main-content">{children}</main>
        <SiteFooter />
        <ScrollAnimations />
      </body>
    </html>
  );
}
