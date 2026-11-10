import { ABOUT, HERO, PROJECTS, SITE } from "@/lib/site-data";

const abs = (path) => `${SITE.url}${path}`;

// Every image on the home page that is content rather than decoration, so the
// screenshots and the portrait can show up in image search with this page as
// their source.
const HOME_IMAGES = [
  ...new Set([
    ...HERO.shots.map((shot) => shot.src),
    ...PROJECTS.map((project) => project.image),
    ABOUT.photo.src,
  ]),
].map(abs);

export default function sitemap() {
  return [
    {
      url: SITE.url,
      // The page is static: this is the date of the last deploy.
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
      images: HOME_IMAGES,
    },
    {
      url: `${SITE.url}/privacy`,
      lastModified: new Date("2025-02-01"),
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
