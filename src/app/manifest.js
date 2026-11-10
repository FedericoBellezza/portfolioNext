import { SEO, SITE } from "@/lib/site-data";

/** Name, colours and icons used when the site is saved to a home screen. */
export default function manifest() {
  return {
    name: SITE.name,
    short_name: "F. Bellezza",
    description: SEO.description,
    lang: SITE.lang,
    start_url: "/",
    display: "browser",
    background_color: "#08090b",
    theme_color: "#08090b",
    icons: [
      { src: "/favicon.ico", sizes: "any", type: "image/x-icon" },
      { src: "/logo.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
