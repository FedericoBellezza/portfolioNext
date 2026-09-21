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
    "Sviluppatore web freelance in tutta Italia: siti, e-commerce, web app e automazioni su misura. Preventivo chiuso dopo la prima call, consegna in 2-6 settimane.",
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
      "Sviluppatore web freelance in tutta Italia: siti, e-commerce, web app e automazioni su misura. Preventivo chiuso dopo la prima call, consegna in 2-6 settimane.",
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
      "Sviluppatore web freelance in tutta Italia: siti, e-commerce, web app e automazioni su misura. Preventivo chiuso dopo la prima call, consegna in 2-6 settimane.",
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

// Applies the stored theme before paint so the page never flashes the wrong mode.
const themeInit = `(function(){try{var t=localStorage.getItem("fb-theme");if(t==="light"||t==="dark"){document.documentElement.setAttribute("data-theme",t)}}catch(e){}})();`;

export default function RootLayout({ children }) {
  return (
    <html lang="it" className={`${geist.variable} ${geistMono.variable}`}>
      <head>
        <link rel="preconnect" href="https://api.emailjs.com" />
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
        <script
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
