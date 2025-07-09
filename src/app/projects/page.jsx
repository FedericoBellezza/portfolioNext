"use client";
import Image from "next/image";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { motion } from "motion/react";
import { ArrowUpRight, Github } from "lucide-react";

const projects = [
  {
    title: "Cantieri360",
    description: `Web app dedicata all’edilizia per gestire cantieri, attività di squadra, ore lavorate, costi e riepiloghi in modo semplice e sicuro.
    Sviluppata in React (Next.js), TailwindCSS, Shadcn, Supabase e Framer Motion. Moderna, mobile-friendly e cloud-first, permette alle imprese di lavorare ovunque senza carta né Excel.`,
    image: "/Canieri360-Copertina.jpg",
    url: "https://cantieri360.vercel.app/",
    tags: ["React", "Next.js", "Tailwind", "Framer Motion", "Supabase"],
    emoji: "🏗️",
  },
  {
    title: "Fanfara Bersaglieri Settimo Torinese",
    description: `Ho realizzato il sito per la Fanfara di Bersaglieri di Settimo Torinese.
Ho utilizzato Next.js, React e TailwindCSS per garantire velocità, efficienza e un design moderno e responsive.
Mi sono occupato della struttura dell’app, dell’organizzazione del codice, dell’integrazione del calendario eventi e di una UI personalizzata. Ho curato performance, accessibilità e ottimizzazione tramite componentizzazione front-end.`,
    image: "/FanfaraBersaglieriScreenshot.jpg",
    url: "https://bersaglierisettimo.vercel.app/",
    tags: ["Next.js", "React", "Tailwind", "Framer Motion"],
    emoji: "🎺",
  },
  {
    title: "Let's Play",
    description:
      "Ho sviluppato con Spring e React, un sito che permette di cercare/filtrare eventi per categoria, prezzo e ubicazione. Backoffice con autenticazione per gestione CRUD di eventi. Integra MySQL per il database, Tailwind per la grafica, EmailJS per il form di contatto e animazioni con Framer Motion.",
    image: "/letsPlayImage.jpeg",
    url: "https://www.linkedin.com/feed/update/urn:li:activity:7318199610559066112/",
    tags: ["Spring", "React", "MySQL", "Tailwind", "EmailJS", "Framer Motion"],
    emoji: "🥳",
  },
  {
    title: "Weather App",
    description:
      "Ho voluto sperimentare le API di terze parti per realizzare il mio sito del meteo. Un API ti permette di ricevere le coordinate in base all'indirizzo inserito e un API in grado di fornirti le previsioni metereologiche tramite le coordinate fornite. Il sito è realizzato con React e Tailwind per la grafica.",
    image: "/weatherApp.jpg",
    url: "https://weatherapp-federicobellezza.web.app/",
    tags: ["React", "Tailwind", "API"],
    emoji: "🌩",
  },
  {
    title: "Task Manager",
    description:
      "Ho sviluppato un sito per imparare ad utilizzare Next.JS, l'autenticazione e il servizio di storage di SupaBase. Il sito è un semplicissimo task manager che ti permette di gestire la tua lista delle cose da fare. Ho utilizzato Vercel per il suo servizio gratuito di Hosting.",
    image: "/task-manager.jpg",
    url: "https://next-todo-list-swart.vercel.app/",
    tags: ["Next.js", "SupaBase", "Vercel"],
    emoji: "👨‍🏫",
  },
  {
    title: "Rubber Duck",
    description:
      "Ho realizzato una pagina landing-page responsive utilizzando Next.js, React, Tailwind CSS, Swiper.js e Shadcn/UI. Include funzionalità come slider per le recensioni, FAQ interattive e animazioni fluide per il menu mobile. Scopri come questa paperella può migliorare la tua esperienza di sviluppo!",
    image: "/rubber-duck-screenshot.JPG",
    url: "https://rubber-duck-lemon.vercel.app/",
    tags: ["Next.js", "React", "Tailwind", "Swiper.js", "Shadcn/UI"],
    emoji: "🦆",
  },
];

export default function Projects() {
  return (
    <div className="container mx-auto mt-40 px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-16"
      >
        <h1 className="text-5xl lg:text-7xl font-black text-center bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent pb-4">
          Progetti personali
        </h1>
        <div className="w-24 h-1 bg-gradient-to-r from-green-500 to-blue-500 mx-auto rounded-full mt-4"></div>
      </motion.div>

      <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-8">
        {projects.map((project, index) => (
          <motion.div
            key={index}
            className="h-full"
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            <Card className="h-full shadow-xl relative hover:shadow-2xl transition-all duration-300 bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 overflow-hidden hover:border-slate-500 group">
              <div className="absolute top-5 right-5 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent text-white px-3 py-3 rounded-full text-md font-medium z-10">
                {project.emoji}
              </div>

              <CardHeader>
                <CardTitle className="text-3xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                  {project.title}
                </CardTitle>
                <div className="flex flex-wrap gap-2 mt-3">
                  {project.tags.map((tag, i) => (
                    <span
                      key={i}
                      className="px-2 py-1 text-xs font-medium bg-slate-700 text-slate-300 rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </CardHeader>

              <CardContent>
                <div className="relative overflow-hidden rounded-xl mb-6 group-hover:shadow-lg transition-all duration-300">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center"></div>
                  <Image
                    className="w-full h-64 object-cover object-top transition-transform duration-500 group-hover:scale-105"
                    height={600}
                    width={600}
                    src={project.image}
                    alt={`Screenshot del progetto ${project.title}`}
                  />
                </div>
                <p className="text-gray-300 leading-relaxed">
                  {project.description.split("\n").map((line, i) => (
                    <span key={i}>
                      {line}
                      <br />
                    </span>
                  ))}
                </p>
              </CardContent>

              <CardFooter className="flex justify-between items-center border-t border-slate-700 pt-4 mt-2">
                <div className="text-sm text-slate-400">
                  <span>Progetto personale</span>
                </div>
                <a
                  href={project.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg text-white font-medium hover:from-green-600 hover:to-emerald-700 transition-all"
                >
                  <span>Visita</span>
                  <ArrowUpRight className="h-4 w-4" />
                </a>
              </CardFooter>
            </Card>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.5 }}
        className="mt-16 text-center"
      >
        <a
          href="https://github.com/FedericoBellezza"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-full transition-all duration-300"
        >
          <Github className="h-5 w-5" />
          <span>Visualizza altri progetti su GitHub</span>
        </a>
      </motion.div>
    </div>
  );
}
