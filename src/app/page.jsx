import SiteNav from "./components/landing/SiteNav";
import Hero from "./components/landing/Hero";
import ProofStrip from "./components/landing/ProofStrip";
import Services from "./components/landing/Services";
import Work from "./components/landing/Work";
import Process from "./components/landing/Process";
import About from "./components/landing/About";
import Pricing from "./components/landing/Pricing";
import Contact from "./components/landing/Contact";
import SiteFooter from "./components/landing/SiteFooter";
import MobileCta from "./components/landing/MobileCta";
import { homeGraph } from "@/lib/structured-data";

/**
 * Order follows the questions a buyer asks, in sequence: what do you do for
 * me, can I trust it, how does it work, who are you, how much, how do I start.
 */
export default function Home() {
  return (
    <>
      {/* The FAQ and the project list are marked up here, not in the root
          layout: they describe this page, not the site. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homeGraph()) }}
      />

      <a href="#contenuto" className="fb-skip">
        Vai al contenuto
      </a>
      <SiteNav />
      <main id="contenuto">
        <Hero />
        <ProofStrip />
        <Services />
        <Work />
        <Process />
        <About />
        <Pricing />
        <Contact />
      </main>
      <SiteFooter />
      <MobileCta />
    </>
  );
}
