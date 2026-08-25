import type { MetadataRoute } from "next";

import { getSiteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/maintenance"],
    },
    sitemap: new URL("sitemap.xml", getSiteUrl()).toString(),
    host: getSiteUrl().origin,
  };
}
