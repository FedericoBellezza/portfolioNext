import SiteNav from "./components/landing/SiteNav";
import Hero from "./components/landing/Hero";
import StackMarquee from "./components/landing/StackMarquee";
import Services from "./components/landing/Services";
import Process from "./components/landing/Process";
import Work from "./components/landing/Work";
import Pricing from "./components/landing/Pricing";
import Contact from "./components/landing/Contact";
import SiteFooter from "./components/landing/SiteFooter";

export default function Home() {
  return (
    <>
      {/* <a href="#contenuto" className="fb-skip">
        Vai al contenuto
      </a> */}
      <SiteNav />
      <main id="contenuto">
        <Hero />
        <StackMarquee />
        <Services />
        <Process />
        <Work />
        <Pricing />
        <Contact />
      </main>
      <SiteFooter />
    </>
  );
}
