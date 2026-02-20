import "./globals.css";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import CookieBanner from "./components/CookieBanner";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Federico Bellezza | Full Stack Developer & Automation",
  description:
    "Soluzioni Tech su Misura per Scalare il Tuo Business. Sviluppo Full Stack, automazione processi e integrazione AI.",
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
