export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard/", "/login"],
      },
    ],
    sitemap: "https://federicobellezza.dev/sitemap.xml",
  };
}
