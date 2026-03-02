import "./globals.css";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import CookieBanner from "./components/CookieBanner";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  metadataBase: new URL("https://federicobellezza.dev"),
  title: "Federico Bellezza | Siti Web Professionali e Automazioni",
  description:
    "Realizzo siti web, e-commerce e sistemi automatizzati per far crescere il tuo business. Dal sito vetrina all'app web: prezzi chiari, risultati concreti.",
  openGraph: {
    title: "Federico Bellezza | Siti Web Professionali e Automazioni",
    description:
      "Realizzo siti web, e-commerce e sistemi automatizzati per far crescere il tuo business. Dal sito vetrina all'app web: prezzi chiari, risultati concreti.",
    url: "https://federicobellezza.dev",
    siteName: "Federico Bellezza",
    locale: "it_IT",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Federico Bellezza | Siti Web Professionali e Automazioni",
    description:
      "Realizzo siti web, e-commerce e sistemi automatizzati per far crescere il tuo business. Dal sito vetrina all'app web: prezzi chiari, risultati concreti.",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="it">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600&display=swap"
        />
      </head>
      <body
        className={`${inter.className} antialiased bg-white text-slate-900 overflow-x-hidden`}
      >
        {children}
        <Analytics />
        <CookieBanner />
      </body>
    </html>
  );
}
