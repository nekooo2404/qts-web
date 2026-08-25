import type { Metadata } from "next";

const defaultSiteUrl = "https://qts.com.vn";

export function getSiteUrl() {
  const value = process.env.SITE_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? defaultSiteUrl;
  try {
    return new URL(value.endsWith("/") ? value : `${value}/`);
  } catch {
    return new URL(`${defaultSiteUrl}/`);
  }
}

export function createPageMetadata({
  title,
  description,
  path,
}: {
  title: string;
  description: string;
  path: string;
}): Metadata {
  const canonical = new URL(path.replace(/^\//u, ""), getSiteUrl());
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "website",
      locale: "vi_VN",
      siteName: "QTS Technology Solutions",
      title,
      description,
      url: canonical,
      images: [{ url: "/og/qts-platform.png", width: 1200, height: 630, alt: "QTS Enterprise Operating Platform" }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/og/qts-platform.png"],
    },
  };
}
