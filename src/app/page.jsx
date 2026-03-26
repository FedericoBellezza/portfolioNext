"use client";
import LandingNavbar from "./components/landing/LandingNavbar";
import HeroSection from "./components/landing/HeroSection";
import SocialProofStrip from "./components/landing/SocialProofStrip";
import FeaturesBentoGrid from "./components/landing/FeaturesBentoGrid";
import ScaleSection from "./components/landing/ScaleSection";
import ProjectsShowcase from "./components/landing/ProjectsShowcase";
import ContactSection from "./components/landing/ContactSection";
import LandingFooter from "./components/landing/LandingFooter";
import AffidiSitoSection from "./components/landing/AffidiSitoSection";
import { useEffect } from "react";

export default function Home() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  return (
    <>
      <LandingNavbar />
      <main>
        <HeroSection />
        <SocialProofStrip />
        <FeaturesBentoGrid />
        {/* <AffidiSitoSection /> */}
        <ScaleSection />
        <ProjectsShowcase />
        <ContactSection />
      </main>
      <LandingFooter />
    </>
  );
}
