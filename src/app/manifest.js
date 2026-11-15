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
    // Green logo on white. The logo sits inside the maskable safe zone, so
    // the same PNGs also serve Android launchers that crop icons to a shape.
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
