"use client";
import { motion } from "motion/react";
import Image from "next/image";
import { useEffect, useState } from "react";

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

  return (
    <div className="container mx-auto mt-30">
      <div className="flex flex-col lg:flex-row justify-center items-center gap-5">
        <div className="lg:w-3/6 lg:px-10 px-5 py-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="card bg-white text-center p-5 rounded-2xl hover:scale-102 hover:rotate-1 transition duration-500 "
          >
            <Image
              priority
              width={500}
              height={200}
              className="rounded-2xl grayscale hover:grayscale-0 transition duration-500"
              src="/profilephoto.jpg"
              alt="foto profilo"
            />
            <h1 className="text-4xl mt-5 font-black">Federico Bellezza</h1>
            <p className="mt-2 italic text-xl">Full Stack Web Developer</p>
          </motion.div>
        </div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="lg:w-3/4 px-8"
        >
          <div className="text-white overflow-hidden ">
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
            <h2 className="lg:text-7xl text-4xl font-black">Web Developer</h2>
            <p className="mt-10 lg:text-xl text-">
              👋 Mi chiamo <strong>Federico Bellezza</strong>, ho 24 anni e vivo
              a <strong>Torino</strong>.<br />
              <br />
              🎓 Diplomato in <strong>Elettronica ed Elettrotecnica</strong>, ho
              sempre avuto una passione per la tecnologia.
              <br />
              💼 Dopo 1 anno e mezzo come operatore in fabbrica, ho sentito il
              bisogno di cambiare e...
              <br />
              <br />
              ✈️ <strong>Australia per 2 anni</strong>:<br />- Lavori nell'
              <strong>ospitalità</strong>
              <br />- Scuola di vita: <strong>adattamento</strong> e{" "}
              <strong>indipendenza</strong>
              <br />
              <br />
              💻 <strong>Svolta nella programmazione</strong>:<br />- Corso{" "}
              <strong>FullStack Developer</strong> @Boolean
              <br />- <strong>Front-end</strong>: HTML, CSS, JavaScript, React,
              Bootstrap
              <br />- <strong>Back-end</strong>: Node.js/Express, MySQL,
              Java/Spring
              <br />- Della ptogrammazione amo la sua{" "}
              <strong>evoluzione costante</strong> e l'
              <strong>impatto concreto</strong> sul mondo
              <br />
              <br />
              🔥 Punti di forza: <strong>resilienza</strong>,{" "}
              <strong>curiosità</strong> e voglia di{" "}
              <strong>mettermi alla prova</strong>!
            </p>
          </div>
        </motion.div>
      </div>
      <div className="my-20 lg:px-10 px-5 ">
        <motion.div
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          initial={{ opacity: 0, y: 100 }}
          className="lg:mb-20 mb-10 flex flex-col lg:flex-row justify-between gap-5 items-center"
        >
          <div
            onClick={() => window.open("https://github.com/FedericoBellezza")}
            className="bg-gradient-to-tr  from-purple-400 to-violet-700 w-full py-10 rounded-xl flex items-center justify-center cursor-pointer shadow-2xl hover:shadow-purple-800 duration-500 transition "
          >
            <h4 className="lg:text-4xl text-2xl text-white font-bold">
              GitHub
            </h4>
          </div>
          <div
            onClick={() =>
              window.open("https://www.linkedin.com/in/federicobellezzadev/")
            }
            className="bg-gradient-to-tr from-blue-400 to-sky-700 w-full py-10 rounded-xl flex items-center justify-center cursor-pointer shadow-2xl hover:shadow-sky-800 duration-500 transition "
          >
            <h4 className="lg:text-4xl text-2xl text-white font-bold ">
              LinkedIn
            </h4>
          </div>
          <div
            onClick={() => downloadCV()}
            className="bg-gradient-to-tr from-orange-500 to-red-600 w-full py-10 rounded-xl flex items-center justify-center cursor-pointer shadow-2xl hover:shadow-orange-800 duration-500 transition "
          >
            <h4 className="lg:text-4xl text-2xl text-white font-bold">
              Curriculum Vitae
            </h4>
          </div>
        </motion.div>
        <motion.div
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          initial={{ opacity: 0, y: 100 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="px-4 py-16"
        >
          <h2 className="lg:text-6xl text-4xl text-white text-center font-black mb-12 relative">
            <span className="relative z-10">Tecnologie</span>
            <span className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 h-1 w-24 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></span>
          </h2>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 max-w-7xl mx-auto">
            <div className="bg-gradient-to-br from-slate-700 to-slate-800 p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
              <h3 className="text-3xl text-white font-semibold mb-6 border-b border-slate-500 pb-3 flex items-center">
                <svg
                  className="w-6 h-6 mr-2 text-blue-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                  />
                </svg>
                Linguaggi
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="flex flex-col items-center gap-4 p-4 bg-slate-800/50 rounded-xl hover:bg-slate-800 transition-colors">
                  <img
                    className="h-16 w-16 object-contain"
                    src="/html.svg"
                    alt="HTML logo"
                  />
                  <span className="text-white font-medium">HTML</span>
                </div>
                <div className="flex flex-col items-center gap-4 p-4 bg-slate-800/50 rounded-xl hover:bg-slate-800 transition-colors">
                  <img
                    className="h-16 w-16 object-contain"
                    src="/css-alt.svg"
                    alt="CSS logo"
                  />
                  <span className="text-white font-medium">CSS</span>
                </div>
                <div className="flex flex-col items-center gap-4 p-4 bg-slate-800/50 rounded-xl hover:bg-slate-800 transition-colors">
                  <img
                    className="h-16 w-16 object-contain"
                    src="/javascript.svg"
                    alt="JavaScript logo"
                  />
                  <span className="text-white font-medium">JavaScript</span>
                </div>
                <div className="flex flex-col items-center gap-4 p-4 bg-slate-800/50 rounded-xl hover:bg-slate-800 transition-colors">
                  <img
                    className="h-16 w-16 object-contain"
                    src="/java.svg"
                    alt="Java logo"
                  />
                  <span className="text-white font-medium">Java</span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-slate-700 to-slate-800 p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
              <h3 className="text-3xl text-white font-semibold mb-6 border-b border-slate-500 pb-3 flex items-center">
                <svg
                  className="w-6 h-6 mr-2 text-green-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                  />
                </svg>
                Framework & Runtime
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="flex flex-col items-center gap-4 p-4 bg-slate-800/50 rounded-xl hover:bg-slate-800 transition-colors">
                  <img
                    className="h-16 w-16 object-contain"
                    src="/react.svg"
                    alt="React logo"
                  />
                  <span className="text-white font-medium">React</span>
                </div>
                <div className="flex flex-col items-center gap-4 p-4 bg-slate-800/50 rounded-xl hover:bg-slate-800 transition-colors">
                  <img
                    className="h-16 w-16 object-contain"
                    src="https://img.icons8.com/fluent-systems-filled/200/FFFFFF/nextjs.png"
                    alt="Next.js logo"
                  />
                  <span className="text-white font-medium">Next.js</span>
                </div>
                <div className="flex flex-col items-center gap-4 p-4 bg-slate-800/50 rounded-xl hover:bg-slate-800 transition-colors">
                  <img
                    className="h-16 w-16 object-contain p-1"
                    src="/node-js.svg"
                    alt="Node.js logo"
                  />
                  <span className="text-white font-medium">Node.js</span>
                </div>
                <div className="flex flex-col items-center gap-4 p-4 bg-slate-800/50 rounded-xl hover:bg-slate-800 transition-colors">
                  <img
                    className="h-16 w-16 object-contain"
                    src="https://netforemost.com/wp-content/uploads/2024/08/1646733543-1.webp"
                    alt="Express.js logo"
                  />
                  <span className="text-white font-medium">Express.js</span>
                </div>
                <div className="flex flex-col items-center gap-4 p-4 bg-slate-800/50 rounded-xl hover:bg-slate-800 transition-colors">
                  <img
                    className="h-16 w-16 object-contain"
                    src="https://www.geekandjob.com/uploads/wiki/3abebb36b664ca8ac4d29397bb9d2705198996a5.png"
                    alt="Spring logo"
                  />
                  <span className="text-white font-medium">Spring</span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-slate-700 to-slate-800 p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
              <h3 className="text-3xl text-white font-semibold mb-6 border-b border-slate-500 pb-3 flex items-center">
                <svg
                  className="w-6 h-6 mr-2 text-purple-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
                  />
                </svg>
                CSS & Librerie UI
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="flex flex-col items-center gap-4 p-4 bg-slate-800/50 rounded-xl hover:bg-slate-800 transition-colors">
                  <img
                    className="h-16 w-16 object-contain"
                    src="/tailwind-css.svg"
                    alt="Tailwind logo"
                  />
                  <span className="text-white font-medium">Tailwind</span>
                </div>
                <div className="flex flex-col items-center gap-4 p-4 bg-slate-800/50 rounded-xl hover:bg-slate-800 transition-colors">
                  <img
                    className="h-16 w-16 object-contain rounded-xl"
                    src="https://images.seeklogo.com/logo-png/51/1/shadcn-ui-logo-png_seeklogo-519786.png"
                    alt="Shadcn UI logo"
                  />
                  <span className="text-white font-medium">Shadcn UI</span>
                </div>
                <div className="flex flex-col items-center gap-4 p-4 bg-slate-800/50 rounded-xl hover:bg-slate-800 transition-colors">
                  <img
                    className="h-16 w-16 object-contain p-1"
                    src="https://upload.wikimedia.org/wikipedia/commons/thumb/b/b2/Bootstrap_logo.svg/2560px-Bootstrap_logo.svg.png"
                    alt="Bootstrap logo"
                  />
                  <span className="text-white font-medium">Bootstrap</span>
                </div>
                <div className="flex flex-col items-center gap-4 p-4 bg-slate-800/50 rounded-xl hover:bg-slate-800 transition-colors">
                  <img
                    className="h-16 w-16 object-contain"
                    src="/motion.svg"
                    alt="Motion logo"
                  />
                  <span className="text-white font-medium">Motion</span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-slate-700 to-slate-800 p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
              <h3 className="text-3xl text-white font-semibold mb-6 border-b border-slate-500 pb-3 flex items-center">
                <svg
                  className="w-6 h-6 mr-2 text-yellow-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"
                  />
                </svg>
                Database e BaaS
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="flex flex-col items-center gap-4 p-4 bg-slate-800/50 rounded-xl hover:bg-slate-800 transition-colors">
                  <img
                    className="h-16 w-16 object-contain"
                    src="mysql.svg"
                    alt="MySQL logo"
                  />
                  <span className="text-white font-medium">MySQL</span>
                </div>
                <div className="flex flex-col items-center gap-4 p-4 bg-slate-800/50 rounded-xl hover:bg-slate-800 transition-colors">
                  <img
                    className="h-16 w-16 object-contain p-2 rounded-xl"
                    src="https://elest.io/images/softwares/284/logo.png"
                    alt="Supabase logo"
                  />
                  <span className="text-white font-medium">Supabase</span>
                </div>
                <div className="flex flex-col items-center gap-4 p-4 bg-slate-800/50 rounded-xl hover:bg-slate-800 transition-colors">
                  <img
                    className="h-16 w-16 object-contain p-1"
                    src="https://brandlogos.net/wp-content/uploads/2025/03/firebase_icon-logo_brandlogos.net_tcvck.png"
                    alt="Firebase logo"
                  />
                  <span className="text-white font-medium">Firebase</span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-slate-700 to-slate-800 p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
              <h3 className="text-3xl text-white font-semibold mb-6 border-b border-slate-500 pb-3 flex items-center">
                <svg
                  className="w-6 h-6 mr-2 text-red-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
                  />
                </svg>
                Templating
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="flex flex-col items-center gap-4 p-4 bg-slate-800/50 rounded-xl hover:bg-slate-800 transition-colors">
                  <img
                    className="h-16 w-16 object-contain p-1"
                    src="https://www.thymeleaf.org/images/thymeleaf.png"
                    alt="Thymeleaf logo"
                  />
                  <span className="text-white font-medium">Thymeleaf</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
