import type { MetadataRoute } from "next";

// Matches the base URL in sitemap.ts. Panel/ops/ticket routes stay hidden from
// crawlers; everything public is crawlable.
export default function robots(): MetadataRoute.Robots {
  const base = "https://woxsenstudentcouncil.in";
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/management", "/eventmanagement", "/api/", "/t/", "/coming-soon"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
