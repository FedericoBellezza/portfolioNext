import "./globals.css";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import CookieBanner from "./components/CookieBanner";

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

const BASE_URL = "https://federicobellezza.dev";

export const metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "Federico Bellezza | Sviluppatore Web & Automazioni",
    template: "%s | Federico Bellezza",
  },
  description:
    "Sviluppatore web freelance: siti web, e-commerce e automazioni su misura per far crescere il tuo business. Preventivo gratuito, risultati concreti.",
  keywords: [
    "sviluppatore web freelance",
    "siti web professionali",
    "automazioni aziendali",
    "next.js developer",
    "react developer",
    "e-commerce",
    "web app",
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
    title: "Federico Bellezza | Sviluppatore Web & Automazioni",
    description:
      "Sviluppatore web freelance: siti web, e-commerce e automazioni su misura per far crescere il tuo business. Preventivo gratuito, risultati concreti.",
    url: BASE_URL,
    siteName: "Federico Bellezza",
    locale: "it_IT",
    type: "website",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Federico Bellezza, sviluppatore web e automazioni",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Federico Bellezza | Sviluppatore Web & Automazioni",
    description:
      "Sviluppatore web freelance: siti web, e-commerce e automazioni su misura per far crescere il tuo business. Preventivo gratuito, risultati concreti.",
    images: ["/opengraph-image"],
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

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Person",
      "@id": `${BASE_URL}/#person`,
      name: "Federico Bellezza",
      url: BASE_URL,
      image: `${BASE_URL}/foto-profilo.jpg`,
      jobTitle: "Full Stack Developer & Automation Specialist",
      description:
        "Sviluppatore web freelance specializzato in siti web, e-commerce, web app e automazioni per aziende e professionisti.",
      email: "info@federicobellezza.dev",
      sameAs: [
        "https://github.com/FedericoBellezza",
        "https://www.linkedin.com/in/federicobellezzadev/",
      ],
      knowsAbout: [
        "Next.js",
        "React",
        "Node.js",
        "Supabase",
        "Web Development",
        "E-Commerce",
        "Business Automation",
      ],
    },
    {
      "@type": "WebSite",
      "@id": `${BASE_URL}/#website`,
      url: BASE_URL,
      name: "Federico Bellezza",
      description:
        "Siti web, e-commerce e automazioni professionali per far crescere il tuo business.",
      publisher: { "@id": `${BASE_URL}/#person` },
      inLanguage: "it-IT",
    },
    {
      "@type": "ProfessionalService",
      "@id": `${BASE_URL}/#service`,
      name: "Federico Bellezza, sviluppo web e automazioni",
      url: BASE_URL,
      description:
        "Realizzo siti web, e-commerce, web app e automazioni su misura per aziende e professionisti italiani.",
      provider: { "@id": `${BASE_URL}/#person` },
      areaServed: "IT",
      availableLanguage: "Italian",
      serviceType: [
        "Web Development",
        "E-Commerce Development",
        "Business Automation",
        "Web Application Development",
      ],
      priceRange: "€€",
      hasOfferCatalog: {
        "@type": "OfferCatalog",
        name: "Servizi di Sviluppo Web",
        itemListElement: [
          {
            "@type": "Offer",
            name: "Sito Web",
            description:
              "Landing page o sito corporate responsive con Next.js, ottimizzazione SEO e form di contatto.",
            priceSpecification: {
              "@type": "UnitPriceSpecification",
              price: "400",
              priceCurrency: "EUR",
              minPrice: "400",
              unitText: "pagina",
            },
          },
          {
            "@type": "Offer",
            name: "Web App / MVP",
            description:
              "Applicazione web completa con autenticazione, database, dashboard e pagamenti Stripe.",
            priceSpecification: {
              "@type": "UnitPriceSpecification",
              price: "3500",
              priceCurrency: "EUR",
              minPrice: "3500",
            },
          },
        ],
      },
    },
  ],
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
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
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
