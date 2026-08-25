import type { MetadataRoute } from "next";

import { getSiteUrl } from "@/lib/seo";

const routes = ["", "nang-luc", "giai-phap", "du-an", "pricing", "lien-he", "quyen-rieng-tu"];

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();
  return routes.map((route, index) => ({
    url: new URL(route, siteUrl).toString(),
    lastModified: new Date(),
    changeFrequency: index === 0 ? "weekly" : "monthly",
    priority: index === 0 ? 1 : route === "lien-he" ? 0.9 : 0.7,
  }));
}
