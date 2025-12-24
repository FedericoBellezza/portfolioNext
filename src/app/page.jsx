"use client";
import { motion } from "motion/react";
import Image from "next/image";
import { useEffect, useState } from "react";
// IMPORTIAMO LE ICONE NECESSARIE
import { FiGithub, FiLinkedin, FiDownload } from "react-icons/fi";
import TechnologiesSection from "./components/TechnologiesSection";

export default function Home() {
  const [typingText, setTypingText] = useState([
    "FULL-STACK",
    "FRONT-END",
    "BACK-END",
  ]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // title changing
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % typingText.length);
    }, 4000);

    return () => clearTimeout(timer);
  }, [currentIndex, typingText.length]);

  function downloadCV() {
    const link = document.createElement("a");
    link.download = "CV_FedericoBellezza.pdf";
    link.href = "/CV.pdf";
    link.click();
  }

  // Classe riutilizzabile per i nuovi pulsanti per evitare ripetizioni
  const buttonClass =
    "group w-full h-24 bg-slate-800 rounded-2xl flex items-center justify-center gap-4 cursor-pointer border border-slate-700 shadow-xl hover:shadow-lime-500/20 hover:border-lime-500/50 hover:-translate-y-1 transition-all duration-300 ease-out px-4";

  // Classe per il testo e le icone che cambiano colore all'hover del gruppo
  const textIconClass =
    "text-white group-hover:text-lime-400 transition-colors duration-300";

  return (
    <div className="container mx-auto mt-20">
      <div className="flex flex-col lg:flex-row justify-center items-center gap-10 py-10">
        {/* SEZIONE FOTO PROFILO (Invariata) */}
        <div className="lg:w-3/6 lg:px-10 px-5 py-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="card bg-slate-800 text-center p-8 rounded-3xl hover:scale-105 transition duration-300 shadow-xl border border-slate-700"
          >
            <Image
              priority
              width={500}
              height={200}
              className="rounded-2xl hover:grayscale-0  transition grayscale duration-500 shadow-lg"
              src="/profile.jpg"
              alt="foto profilo"
            />
            <h1 className="text-4xl mt-5 font-black text-white">
              Federico Bellezza
            </h1>
            <p className="mt-2 italic text-xl text-lime-400">
              Full Stack Web Developer
            </p>
          </motion.div>
        </div>

        {/* SEZIONE TESTO (Invariata) */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="lg:w-3/4 px-8"
        >
          <div className="text-white overflow-hidden">
            <motion.div
              key={currentIndex} // Forza il re-render al cambio testo
              initial={{ width: 0 }}
              animate={{ width: "auto" }}
              transition={{
                duration: 1.5,
                ease: "easeInOut",
                repeat: Infinity,
                repeatType: "reverse",
                repeatDelay: 1,
              }}
              className="lg:text-7xl text-4xl text-lime-400 font-black typing-text italic"
            >
              {typingText[currentIndex]}
            </motion.div>
            <h2 className="lg:text-7xl text-4xl font-black text-white">
              Web Developer
            </h2>
            <p className="mt-10 lg:text-xl text-slate-300">
              👋 Mi chiamo{" "}
              <strong className="text-lime-300">Federico Bellezza</strong>, ho
              24 anni e vivo a <strong className="text-lime-300">Torino</strong>
              .<br />
              <br />
              🎓 Diplomato in{" "}
              <strong className="text-lime-300">
                Elettronica ed Elettrotecnica
              </strong>
              , ho sempre avuto una passione per la tecnologia.
              <br />
              💼 Dopo 1 anno e mezzo come operatore in fabbrica, ho sentito il
              bisogno di cambiare e...
              <br />
              <br />
              ✈️ <strong className="text-lime-300">Australia per 2 anni</strong>
              :<br />- Lavori nell'
              <strong className="text-lime-300">ospitalità</strong>
              <br />- Scuola di vita:{" "}
              <strong className="text-lime-300">adattamento</strong> e{" "}
              <strong className="text-lime-300">indipendenza</strong>
              <br />
              <br />
              💻{" "}
              <strong className="text-lime-300">
                Svolta nella programmazione
              </strong>
              :<br />- Corso{" "}
              <strong className="text-lime-300">FullStack Developer</strong>{" "}
              @Boolean
              <br />- <strong className="text-lime-300">Front-end</strong>:
              HTML, CSS, JavaScript, React, Bootstrap
              <br />- <strong className="text-lime-300">Back-end</strong>:
              Node.js/Express, MySQL, Java/Spring
              <br />- Della programmazione amo la sua{" "}
              <strong className="text-lime-300">evoluzione costante</strong> e
              l'
              <strong className="text-lime-300">impatto concreto</strong> sul
              mondo
              <br />
              <br />
              🔥 Punti di forza:{" "}
              <strong className="text-lime-300">resilienza</strong>,{" "}
              <strong className="text-lime-300">curiosità</strong> e voglia di{" "}
              <strong className="text-lime-300">mettermi alla prova</strong>!
            </p>
          </div>
        </motion.div>
      </div>

      <div className="my-20 lg:px-10 px-5">
        {/* --- INIZIO SEZIONE PULSANTI MODIFICATA --- */}
        <motion.div
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          initial={{ opacity: 0, y: 100 }}
          className="lg:mb-20 mb-10 flex flex-col lg:flex-row justify-between gap-6 items-center"
        >
          {/* GitHub Button */}
          <div
            onClick={() => window.open("https://github.com/FedericoBellezza")}
            className={buttonClass}
          >
            <FiGithub className={`text-4xl ${textIconClass}`} />
            <h4 className={`lg:text-2xl text-xl font-bold ${textIconClass}`}>
              GitHub
            </h4>
          </div>

          {/* LinkedIn Button */}
          <div
            onClick={() =>
              window.open("https://www.linkedin.com/in/federicobellezzadev/")
            }
            className={buttonClass}
          >
            <FiLinkedin className={`text-4xl ${textIconClass}`} />
            <h4 className={`lg:text-2xl text-xl font-bold ${textIconClass}`}>
              LinkedIn
            </h4>
          </div>

          {/* CV Button */}
          <div onClick={() => downloadCV()} className={buttonClass}>
            <FiDownload className={`text-4xl ${textIconClass}`} />
            <h4 className={`lg:text-2xl text-xl font-bold ${textIconClass}`}>
              Scarica CV
            </h4>
          </div>
        </motion.div>
        {/* --- FINE SEZIONE PULSANTI MODIFICATA --- */}

        <TechnologiesSection />
      </div>
    </div>
  );
}
