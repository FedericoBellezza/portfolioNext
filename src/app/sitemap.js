import { SITE } from "@/lib/site-data";

export default function sitemap() {
  return [
    {
      url: SITE.url,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: `${SITE.url}/privacy`,
      lastModified: new Date("2025-02-01"),
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
