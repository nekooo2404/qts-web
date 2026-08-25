import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro, Lora, Sora } from "next/font/google";
import type { ReactNode } from "react";

import Footer from "@/components/layout/site-footer";
import Navbar from "@/components/layout/site-header";
import { MobileContactBar } from "@/components/layout/mobile-contact-bar";
import { ClientTelemetry } from "@/components/telemetry/client-telemetry";
import { createPageMetadata, getSiteUrl } from "@/lib/seo";

import "./globals.css";
import "./system-redesign.css";
import "./precision-system.css";
import "./modern-saas.css";

const bodyFont = Be_Vietnam_Pro({
  weight: ["400", "600", "700", "800"],
  subsets: ["latin", "vietnamese"],
  display: "swap",
  variable: "--font-be-vietnam-pro",
});

const displayFont = Sora({
  weight: "variable",
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-sora",
});

const editorialFont = Lora({
  weight: "variable",
  style: ["normal", "italic"],
  subsets: ["latin", "vietnamese"],
  display: "swap",
  variable: "--font-lora",
});

const baseMetadata = createPageMetadata({
  title: "QTS | Kiến tạo hệ thống số cho doanh nghiệp",
  description: "QTS đồng hành cùng doanh nghiệp từ bài toán vận hành đến kiến trúc, triển khai và cải tiến hệ thống số.",
  path: "/",
});

export const metadata: Metadata = {
  ...baseMetadata,
  metadataBase: getSiteUrl(),
  applicationName: "QTS Technology Solutions",
  category: "technology",
  title: {
    default: "QTS | Kiến tạo hệ thống số cho doanh nghiệp",
    template: "%s | QTS",
  },
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f5f8fd",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const siteUrl = getSiteUrl();
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "QTS Technology Solutions",
    url: siteUrl.origin,
    email: "support@qts.com.vn",
    logo: new URL("icon.svg", siteUrl).toString(),
  };
  return (
    <html lang="vi" dir="ltr" data-scroll-behavior="smooth">
      <body className={`${bodyFont.variable} ${displayFont.variable} ${editorialFont.variable} flex min-h-screen flex-col`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema).replace(/</gu, "\\u003c") }}
        />
        <a
          href="#main-content"
          className="fixed left-3 top-3 z-[70] -translate-y-24 bg-qts-accent px-4 py-3 font-semibold text-qts-deep focus:translate-y-0"
        >
          Bỏ qua điều hướng
        </a>
        <Navbar />
        <ClientTelemetry />
        <div id="main-content" className="flex flex-1 flex-col" tabIndex={-1}>{children}</div>
        <Footer />
        <MobileContactBar />
      </body>
    </html>
  );
}
