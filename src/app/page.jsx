"use client";
import { motion } from "motion/react";
import Image from "next/image";
import { FiGithub, FiLinkedin, FiDownload } from "react-icons/fi";
import TechnologiesSection from "./components/TechnologiesSection";

export default function Home() {
  function downloadCV() {
    const link = document.createElement("a");
    link.download = "CV_FedericoBellezza.pdf";
    link.href = "/CV.pdf";
    link.click();
  }

  const buttonClass =
    "group flex items-center justify-center gap-4 py-6 px-8 bg-transparent border border-[var(--portfolio-border)] cursor-pointer hover:border-[var(--portfolio-accent)] transition-all duration-300";

  const textIconClass =
    "text-white group-hover:text-[var(--portfolio-accent)] transition-colors duration-300";

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="min-h-screen flex flex-col justify-center items-center relative pt-20 px-8">
        {/* Name - Large Serif */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="font-serif text-6xl lg:text-8xl xl:text-9xl text-white tracking-tight mb-4 text-center"
        >
          Federico
          <br />
          Bellezza
        </motion.h1>

        {/* Role - Gold Accent */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="text-[var(--portfolio-accent)] uppercase tracking-luxury-wide text-sm lg:text-base mb-12 text-center"
        >
          Full Stack Developer & Automation Specialist
        </motion.p>

        {/* Portrait Image - B&W */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="relative w-72 lg:w-80"
        >
          <Image
            priority
            width={400}
            height={500}
            className="grayscale w-full object-cover"
            src="/profile.jpg"
            alt="Federico Bellezza"
          />
          <div className="absolute inset-0 border border-[var(--portfolio-accent)]/20 pointer-events-none" />
        </motion.div>
      </section>

      {/* About Section */}
      <section className="py-24 px-8">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <h2 className="font-serif text-4xl lg:text-5xl text-white mb-4">
              About
            </h2>
            <div className="w-16 h-px bg-[var(--portfolio-accent)] mx-auto mb-12" />

            <p className="text-[var(--portfolio-text-secondary)] text-lg lg:text-xl leading-relaxed">
              La mia missione è{" "}
              <span className="text-[var(--portfolio-accent)]">
                aiutare le aziende a evolversi tecnologicamente
              </span>
              . Non mi limito a scrivere codice: progetto ecosistemi digitali
              che fanno risparmiare tempo e aumentano il valore del business.
            </p>

            <div className="mt-12 text-left max-w-2xl mx-auto space-y-4 px-4 lg:px-0">
              <p className="text-[var(--portfolio-text-secondary)] leading-relaxed">
                Come{" "}
                <span className="text-[var(--portfolio-accent)]">
                  Sviluppatore Full Stack
                </span>{" "}
                &{" "}
                <span className="text-[var(--portfolio-accent)]">
                  Automation Specialist
                </span>
                , mi occupo di:
              </p>
              <ul className="space-y-4 text-[var(--portfolio-text-secondary)]">
                <li className="flex items-start gap-3">
                  <span className="text-[var(--portfolio-accent)] shrink-0">—</span>
                  <span>
                    Sviluppo di{" "}
                    <span className="text-[var(--portfolio-accent)]">
                      piattaforme gestionali
                    </span>{" "}
                    e web app su misura
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[var(--portfolio-accent)] shrink-0">—</span>
                  <span>
                    Creazione di flussi di automazione avanzati con{" "}
                    <span className="text-[var(--portfolio-accent)]">n8n</span>
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[var(--portfolio-accent)] shrink-0">—</span>
                  <span>
                    Integrazione di processi con{" "}
                    <span className="text-[var(--portfolio-accent)]">
                      Intelligenza Artificiale
                    </span>
                  </span>
                </li>
              </ul>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA Buttons Section */}
      <section className="py-16 px-8">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="flex flex-col lg:flex-row justify-center gap-6 items-stretch"
          >
            {/* GitHub Button */}
            <div
              onClick={() => window.open("https://github.com/FedericoBellezza")}
              className={buttonClass}
            >
              <FiGithub className={`text-2xl ${textIconClass}`} />
              <span
                className={`uppercase tracking-luxury text-sm font-medium ${textIconClass}`}
              >
                GitHub
              </span>
            </div>

            {/* LinkedIn Button */}
            <div
              onClick={() =>
                window.open("https://www.linkedin.com/in/federicobellezzadev/")
              }
              className={buttonClass}
            >
              <FiLinkedin className={`text-2xl ${textIconClass}`} />
              <span
                className={`uppercase tracking-luxury text-sm font-medium ${textIconClass}`}
              >
                LinkedIn
              </span>
            </div>

            {/* CV Button */}
            <div onClick={() => downloadCV()} className={buttonClass}>
              <FiDownload className={`text-2xl ${textIconClass}`} />
              <span
                className={`uppercase tracking-luxury text-sm font-medium ${textIconClass}`}
              >
                Scarica CV
              </span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Technologies Section */}
      <section className="py-16 px-8">
        <TechnologiesSection />
      </section>
    </div>
  );
}
