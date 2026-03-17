import "./globals.css";
import { Inter, Sora } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import CookieBanner from "./components/CookieBanner";

const inter = Inter({ subsets: ["latin"] });
const sora = Sora({ subsets: ["latin"] });

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
      <body
        className={`${sora.className} antialiased bg-white text-blue-900 overflow-x-hidden`}
      >
        {children}
        <Analytics />
        <CookieBanner />
      </body>
    </html>
  );
}
