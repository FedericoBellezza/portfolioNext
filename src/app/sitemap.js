export default function sitemap() {
  const BASE_URL = "https://federicobellezza.dev";

  return [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: `${BASE_URL}/privacy`,
      lastModified: new Date("2025-02-01"),
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
