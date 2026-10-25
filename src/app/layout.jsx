import "./globals.css";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import CookieBanner from "./components/CookieBanner";
import { SITE } from "@/lib/site-data";
import { siteGraph } from "@/lib/structured-data";

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

export const metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "Federico Bellezza | Sviluppatore Web Freelance e Automazioni",
    template: "%s | Federico Bellezza",
  },
  description:
    "Sviluppatore freelance per PMI in tutta Italia: automazioni, assistenti AI, siti e web app su misura. Call gratuita, preventivo chiuso in 3 giorni.",
  keywords: [
    "sviluppatore web freelance",
    "sviluppatore web Italia",
    "siti web professionali",
    "automazioni aziendali",
    "automazioni n8n",
    "sviluppo web app su misura",
    "next.js developer freelance",
    "react developer",
    "e-commerce",
    "Federico Bellezza",
  ],
  authors: [{ name: "Federico Bellezza", url: BASE_URL }],
  creator: "Federico Bellezza",
  category: "technology",
  icons: {
    icon: [
      { url: "/logo.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
    ],
  },
  alternates: {
    canonical: BASE_URL,
    languages: {
      it: BASE_URL,
      "x-default": BASE_URL,
    },
  },
  openGraph: {
    title: "Federico Bellezza | Sviluppatore Web Freelance e Automazioni",
    description:
      "Sviluppatore freelance per PMI in tutta Italia: automazioni, assistenti AI, siti e web app su misura. Call gratuita, preventivo chiuso in 3 giorni.",
    url: BASE_URL,
    siteName: SITE.name,
    locale: SITE.locale,
    type: "website",
    // og:image is not listed here: opengraph-image.jsx already provides it,
    // with a content hash for cache busting that a hand-written URL lacks.
  },
  twitter: {
    card: "summary_large_image",
    title: "Federico Bellezza | Sviluppatore Web Freelance e Automazioni",
    description:
      "Sviluppatore freelance per PMI in tutta Italia: automazioni, assistenti AI, siti e web app su misura. Call gratuita, preventivo chiuso in 3 giorni.",
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
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteGraph()) }}
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
