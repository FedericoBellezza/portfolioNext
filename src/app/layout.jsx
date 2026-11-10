import "./globals.css";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import CookieBanner from "./components/CookieBanner";
import { SEO, SITE } from "@/lib/site-data";
import { jsonLd, siteGraph } from "@/lib/structured-data";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

const BASE_URL = SITE.url;

/**
 * Site-wide defaults. Anything that is true only of one URL (canonical,
 * og:url) lives in that route's own metadata: declared here it was inherited
 * by every page, so /login and the 404 claimed to be the home page.
 */
export const metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: SEO.title,
    template: "%s | Federico Bellezza",
  },
  description: SEO.description,
  applicationName: SITE.name,
  keywords: SEO.keywords,
  authors: [{ name: SITE.name, url: BASE_URL }],
  creator: SITE.name,
  publisher: SITE.name,
  category: "technology",
  // iOS turns any long digit run into a phone link; prices and dates on this
  // site are not phone numbers.
  formatDetection: { telephone: false, address: false, email: false },
  // favicon.ico is picked up from the app folder on its own. Listing icons
  // here switches off the automatic apple-icon tag, so it is listed too.
  icons: {
    icon: [{ url: "/logo.svg", type: "image/svg+xml" }],
    apple: [{ url: "/apple-icon", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    title: SEO.title,
    description: SEO.description,
    siteName: SITE.name,
    locale: SITE.locale,
    type: "website",
    // og:image is not listed here: opengraph-image.jsx already provides it,
    // with a content hash for cache busting that a hand-written URL lacks.
  },
  twitter: {
    card: "summary_large_image",
    title: SEO.title,
    description: SEO.description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  // Search Console ownership via meta tag, only once the token is set in the
  // environment. Unset, nothing is rendered.
  ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? {
        verification: {
          google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
        },
      }
    : null),
};

// Dark only: tells the browser to draw its own UI (scrollbars, form controls,
// mobile address bar) to match.
export const viewport = {
  colorScheme: "dark",
  themeColor: "#08090b",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="it"
      className={`${geist.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <link rel="preconnect" href="https://api.emailjs.com" />
        <script
          suppressHydrationWarning
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd(siteGraph()) }}
        />
      </head>
      <body className="font-sans antialiased overflow-x-hidden">
        {children}
        <Analytics />
        <CookieBanner />
      </body>
    </html>
  );
}
