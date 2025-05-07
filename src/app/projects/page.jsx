"use client";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { motion } from "motion/react";

export default function Projects() {
  return (
    <div className="container mx-auto mt-20 py-10 text-white">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="lg:text-6xl text-4xl font-black text-center my-10 mb-20">
          Progetti personali
        </h1>
      </motion.div>
      <div className="grid lg:grid-cols-3 gap-5">
        {/* let's play */}
        <motion.div
          className="flex"
          animate={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          initial={{ opacity: 0, y: 100 }}
        >
          <Card
            className={
              " shadow-2xl flex flex-col justify-between hover:scale-101 transition"
            }
          >
            <CardHeader className={"grow"}>
              <CardTitle className={"text-3xl font-bold italic"}>
                Let's Play
              </CardTitle>
              <CardDescription className={"text-md"}>
                🥳 Ho sviluppato con <strong>Spring e React</strong>, un sito
                che permette di cercare/filtrare eventi per categoria, prezzo e
                ubicazione. <br />
                Backoffice con <strong>autenticazione</strong> per{" "}
                <strong>gestione CRUD</strong> di eventi. <br />
                🗃 Integra <strong>MySQL</strong> per il database,{" "}
                <strong>Tailwind</strong> per la grafica,{" "}
                <strong>EmailJS</strong> per il form di contatto e animazioni
                con <strong>Framer Motion</strong>.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <img
                className="w-full rounded-2xl border border-gray-400"
                src="/letsPlayImage.jpeg"
                alt="lets play image"
              />
            </CardContent>
            <CardFooter>
              <a
                onClick={() =>
                  window.open(
                    "https://www.linkedin.com/feed/update/urn:li:activity:7318199610559066112/"
                  )
                }
                className="px-3 py-1 bg-lime-500 cursor-pointer  rounded-md hover:bg-lime-600 text-white transition"
              >
                <span>Vai al sito</span>
              </a>
            </CardFooter>
          </Card>
        </motion.div>
        {/* Weather App */}
        <motion.div
          className="flex"
          animate={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          initial={{ opacity: 0, y: 100 }}
        >
          <Card
            className={
              "shadow-2xl flex flex-col justify-between hover:scale-101 transition"
            }
          >
            <CardHeader className={"grow"}>
              <CardTitle className={"text-3xl font-bold italic"}>
                Weather App
              </CardTitle>
              <CardDescription className={"text-md"}>
                🌩 Ho voluto sperimentare le <strong>API</strong> di terze parti
                per realizzare il mio <strong>sito del meteo</strong>. <br />
                Un API ti permette di ricevere le coordinate in base
                all’indirizzo inserito e un API in grado di fornirti le
                previsioni metereologiche tramite le coordinate fornite. 🌍{" "}
                <br />
                Il sito è realizzato con <strong>React e Tailwind</strong> per
                la grafica.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <img
                className="w-full rounded-2xl border border-gray-400"
                src="/weatherApp.jpg"
                alt=""
              />
            </CardContent>
            <CardFooter>
              <a
                onClick={() =>
                  window.open("https://weatherapp-federicobellezza.web.app/")
                }
                className="px-3 py-1 bg-lime-500 cursor-pointer  rounded-md hover:bg-lime-600 text-white transition"
              >
                <span>Vai al sito</span>
              </a>
            </CardFooter>
          </Card>
        </motion.div>
        {/* Task Manager */}
        <motion.div
          className="flex"
          animate={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          initial={{ opacity: 0, y: 100 }}
        >
          <Card
            className={
              "shadow-2xl flex flex-col justify-between hover:scale-101 transition"
            }
          >
            <CardHeader className={"grow"}>
              <CardTitle className={"text-3xl font-bold italic "}>
                Task Manager
              </CardTitle>
              <CardDescription className={"text-md"}>
                👨‍🏫 Ho sviluppato un sito per imparare ad utilizzare{" "}
                <strong>Next.JS</strong>,{" "}
                <strong>
                  l’autenticazione e il servizio di storage di SupaBase
                </strong>
                . <br />
                Il sito è un semplicissimo task manager che ti permette di
                gestire la tua lista delle cose da fare. 🧮 <br />
                Ho utilizzato <strong>Vercel</strong> per il suo servizio
                gratuito di <strong>Hosting</strong>.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <img
                className="w-full rounded-2xl border border-gray-400"
                src="/task-manager.jpg"
                alt=""
              />
            </CardContent>
            <CardFooter>
              <a
                onClick={() =>
                  window.open("https://next-todo-list-swart.vercel.app/")
                }
                className="px-3 py-1 bg-lime-500 cursor-pointer  rounded-md hover:bg-lime-600 text-white transition"
              >
                <span>Vai al sito</span>
              </a>
            </CardFooter>
          </Card>
        </motion.div>
        {/* Rubber Duck */}
        <motion.div
          className="flex"
          animate={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          initial={{ opacity: 0, y: 100 }}
        >
          <Card
            className={
              "shadow-2xl flex flex-col justify-between hover:scale-101 transition"
            }
          >
            <CardHeader className={"grow"}>
              <CardTitle className={"text-3xl font-bold italic "}>
                Rubber Duck
              </CardTitle>
              <CardDescription className={"text-md"}>
                <p>
                  🦆 Ho realizzato una pagina responsive utilizzando{" "}
                  <strong>Next.js</strong>, <strong>React</strong>,{" "}
                  <strong>Tailwind CSS</strong>, <strong>Swiper.js</strong> e{" "}
                  <strong>Shadcn/UI</strong>. <br />
                  Include funzionalità come{" "}
                  <strong>slider per le recensioni</strong>,{" "}
                  <strong>FAQ interattive</strong> e{" "}
                  <strong>animazioni fluide</strong> per il menu mobile. <br />
                  🔗 Scopri come questa paperella può migliorare la tua
                  esperienza di sviluppo! 🧸
                </p>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <img
                className="w-full rounded-2xl border border-gray-400 "
                src="/rubber-duck-screenshot.jpg"
                alt=""
              />
            </CardContent>
            <CardFooter>
              <a
                onClick={() =>
                  window.open("https://rubber-duck-lemon.vercel.app/")
                }
                className="px-3 py-1 bg-lime-500 cursor-pointer  rounded-md hover:bg-lime-600 text-white transition"
              >
                <span>Vai al sito</span>
              </a>
            </CardFooter>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
