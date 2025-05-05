"use client";
import { motion } from "motion/react";
import Image from "next/image";
import { useState } from "react";

export default function Home() {
  const [typingText, setTypingText] = useState([
    "FRONT-END",
    "BACK-END",
    "FULL-STACK",
  ]);
  const [currentIndex, setCurrentIndex] = useState(0);
  setTimeout(() => {
    setCurrentIndex((currentIndex + 1) % typingText.length);
  }, 4000);
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
          <div className="card bg-white text-center p-5 rounded-2xl hover:scale-102 hover:rotate-1 transition duration-500 ">
            <Image
              width={500}
              height={200}
              className="rounded-2xl grayscale hover:grayscale-0 transition duration-500"
              src="/profilephoto.jpg"
              alt="foto profilo"
            />
            <h1 className="text-4xl mt-5 font-black">Federico Bellezza</h1>
            <p className="mt-2 italic text-xl">Full Stack Web Developer</p>
          </div>
        </div>
        <div className="lg:w-3/4 px-8">
          <div className="text-white overflow-hidden ">
            <motion.ul
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{
                ease: "easeInOut",
                duration: 1.5,
                repeat: Infinity,
                repeatType: "reverse",
                repeatDelay: 0.5,
              }}
              className="lg:text-7xl text-4xl text-lime-400 font-black typing-text animate-pulse"
            >
              {typingText[currentIndex]}
              {"   "}
            </motion.ul>
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
        </div>
      </div>
      <div className="my-20 lg:px-10 px-5 ">
        <section className="lg:mb-20 mb-10 flex flex-col lg:flex-row justify-between gap-5 items-center">
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
        </section>
        <h3 className="lg:text-6xl text-4xl text-white text-center font-black mb-10">
          Tecnologie
        </h3>
        <div className="flex flex-wrap  justify-center  text-center gap-5 bg-white lg:p-10 p-5 rounded-2xl ">
          <section className="bg-slate-600 p-5 w-full xl:w-max rounded-2xl ">
            <h3 className="text-3xl text-white font-thin italic">Linguaggi</h3>
            <div className="flex flex-wrap gap-5 items-baseline justify-center pt-10 ">
              <div className="flex flex-col items-center gap-3">
                <img className="lg:h-20 h-15" src="/html.svg" alt="html logo" />
                <span className="text-white font-bold ">HTML</span>
              </div>
              <div className="flex  flex-col items-center gap-3">
                <img className="lg:h-20 h-15" src="/css-alt.svg" alt="css" />
                <span className="text-white font-bold ">CSS</span>
              </div>
              <div className="flex flex-col items-center gap-3">
                <img className="lg:h-20 h-13" src="/javascript.svg" alt="css" />
                <span className="text-white font-bold ">JavaScript</span>
              </div>
              <div className="flex flex-col items-center gap-3">
                <img className="lg:h-20 h-15" src="/java.svg" alt="css" />
                <span className="text-white font-bold ">Java</span>
              </div>
            </div>
          </section>
          <section className="bg-slate-600 p-5 w-full xl:w-max rounded-2xl">
            <h3 className="text-3xl text-white font-thin italic">
              Framework & Runtime
            </h3>
            <div className="flex flex-wrap gap-5 items-baseline justify-center pt-10">
              <div className="flex flex-col items-center gap-3">
                <img
                  className="lg:h-20 h-15"
                  src="/react.svg"
                  alt="React logo"
                />
                <span className="text-white font-bold ">React</span>
              </div>
              <div className="flex  flex-col items-center gap-3">
                <img
                  className="lg:h-20 h-15"
                  src="https://img.icons8.com/fluent-systems-filled/200/FFFFFF/nextjs.png"
                  alt="next.js logo"
                />
                <span className="text-white font-bold ">Next</span>
              </div>
              <div className="flex flex-col items-center gap-3">
                <img
                  className="lg:h-20 h-15 p-1"
                  src="/node-js.svg"
                  alt="Node.js logo"
                />
                <span className="text-white font-bold ">Node.js</span>
              </div>
              <div className="flex flex-col items-center gap-3">
                <img
                  className="lg:h-20 h-15"
                  src="https://netforemost.com/wp-content/uploads/2024/08/1646733543-1.webp"
                  alt="Express.js logo"
                />
                <span className="text-white font-bold ">Express.js</span>
              </div>
              <div className="flex flex-col items-center gap-3">
                <img
                  className="lg:h-20 h-15"
                  src="https://www.geekandjob.com/uploads/wiki/3abebb36b664ca8ac4d29397bb9d2705198996a5.png"
                  alt="Spring logo"
                />
                <span className="text-white font-bold ">Spring</span>
              </div>
            </div>
          </section>
          <section className="bg-slate-600 p-5 w-full xl:w-max rounded-2xl">
            <h3 className="text-3xl text-white font-thin italic">
              CSS & librerie UI
            </h3>
            <div className="flex flex-wrap gap-5 items-baseline justify-center pt-10">
              <div className="flex flex-col items-center gap-3">
                <img
                  className="lg:h-20 h-20"
                  src="/tailwind-css.svg"
                  alt="Tailwind logo"
                />
                <span className="text-white font-bold ">Tailwind</span>
              </div>
              <div className="flex flex-col items-center gap-3">
                <img
                  className="lg:h-20 h-15 lg:p-2 rounded-2xl"
                  src="https://images.seeklogo.com/logo-png/51/1/shadcn-ui-logo-png_seeklogo-519786.png"
                  alt="Shadcn ui logo"
                />
                <span className="text-white font-bold ">Shadcn UI</span>
              </div>
              <div className="flex flex-col items-center gap-3">
                <img
                  className="lg:h-20 h-15 p-1"
                  src="https://upload.wikimedia.org/wikipedia/commons/thumb/b/b2/Bootstrap_logo.svg/2560px-Bootstrap_logo.svg.png"
                  alt="Bootstrap logo"
                />
                <span className="text-white font-bold ">Bootstrap</span>
              </div>
              <div className="flex flex-col items-center gap-3">
                <img
                  className="h-18 lg:h-20 w-20"
                  src="/motion.svg"
                  alt="Motion logo"
                />
                <span className="text-white font-bold ">Motion</span>
              </div>
            </div>
          </section>
          <section className="bg-slate-600 p-5 w-full xl:w-max rounded-2xl">
            <h3 className="text-3xl text-white font-thin italic">
              Database e BaaS
            </h3>
            <div className="flex flex-wrap gap-5 items-baseline justify-center pt-10">
              <div className="flex flex-col items-center gap-3">
                <img
                  className="lg:h-20 h-15"
                  src="mysql.svg"
                  alt="MySql logo"
                />
                <span className="text-white font-bold ">MySQL</span>
              </div>
              <div className="flex flex-col items-center gap-3">
                <img
                  className="lg:h-20 h-15 p-2 rounded-2xl"
                  src="https://elest.io/images/softwares/284/logo.png"
                  alt="Supabase logo"
                />
                <span className="text-white font-bold ">Supabase</span>
              </div>
              <div className="flex flex-col items-center gap-3">
                <img
                  className="lg:h-20 h-15 p-1"
                  src="https://brandlogos.net/wp-content/uploads/2025/03/firebase_icon-logo_brandlogos.net_tcvck.png"
                  alt="Firebase logo"
                />
                <span className="text-white font-bold ">Firebase</span>
              </div>
            </div>
          </section>
          <section className="bg-slate-600 p-5 w-full xl:w-max rounded-2xl">
            <h3 className="text-3xl text-white font-thin italic">Templating</h3>
            <div className="flex justify-center gap-5 pt-10">
              <div className="flex flex-col items-center  gap-3">
                <img
                  className="lg:h-20 h-15 p-1"
                  src="https://www.thymeleaf.org/images/thymeleaf.png"
                  alt="Thymeleaf logo"
                />
                <span className="text-white font-bold ">Thymeleaf</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
