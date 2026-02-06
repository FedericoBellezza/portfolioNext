"use client";
import Image from "next/image";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { motion } from "motion/react";
import { ArrowUpRight, Github } from "lucide-react";

const projects = [
  {
    title: "Cantieri360",
    description: `Web app dedicata all'edilizia per gestire cantieri, attività di squadra, ore lavorate, costi e riepiloghi in modo semplice e sicuro.
    Sviluppata in React (Next.js), TailwindCSS, Shadcn, Supabase e Framer Motion. Moderna, mobile-friendly e cloud-first, permette alle imprese di lavorare ovunque senza carta né Excel.`,
    image: "/Canieri360-Copertina.jpg",
    url: "https://cantieri360.vercel.app/",
    tags: ["React", "Next.js", "Tailwind", "Framer Motion", "Supabase"],
  },
  {
    title: "Knit",
    description: `Sito web per Knit, start-up dedicata agli atleti professionisti, nata per guidarli e sostenerli nel raggiungimento del loro pieno potenziale, durante e dopo la carriera sportiva. \n Supportano gli atleti a prendere decisioni consapevoli e a costruire una rete strategica che favorisca crescita, benessere e opportunità a lungo termine, dentro e fuori dal campo. \n Allo stesso tempo, collaborano con club e organizzazioni sportive per promuovere la loro evoluzione e professionalizzazione, partendo dalla valorizzazione della loro risorsa più importante: l'atleta.`,
    image: "/knit-screenshot.jpg",
    url: "https://www.knit-networks.com/",
    tags: ["React", "Next.js", "Tailwind", "Framer Motion", "DaisyUI"],
  },
  {
    title: "Fanfara Bersaglieri Settimo Torinese",
    description: `Ho realizzato il sito per la Fanfara di Bersaglieri di Settimo Torinese.
Ho utilizzato Next.js, React e TailwindCSS per garantire velocità, efficienza e un design moderno e responsive.
Mi sono occupato della struttura dell'app, dell'organizzazione del codice, dell'integrazione del calendario eventi e di una UI personalizzata. Ho curato performance, accessibilità e ottimizzazione tramite componentizzazione front-end.`,
    image: "/FanfaraBersaglieriScreenshot.jpg",
    url: "https://bersaglierisettimo.vercel.app/",
    tags: ["Next.js", "React", "Tailwind", "Framer Motion"],
  },
  {
    title: "Let's Play",
    description:
      "Ho sviluppato con Spring e React, un sito che permette di cercare/filtrare eventi per categoria, prezzo e ubicazione. Backoffice con autenticazione per gestione CRUD di eventi. Integra MySQL per il database, Tailwind per la grafica, EmailJS per il form di contatto e animazioni con Framer Motion.",
    image: "/letsPlayImage.jpeg",
    url: "https://www.linkedin.com/feed/update/urn:li:activity:7318199610559066112/",
    tags: ["Spring", "React", "MySQL", "Tailwind", "EmailJS", "Framer Motion"],
  },
  {
    title: "Weather App",
    description:
      "Ho voluto sperimentare le API di terze parti per realizzare il mio sito del meteo. Un API ti permette di ricevere le coordinate in base all'indirizzo inserito e un API in grado di fornirti le previsioni metereologiche tramite le coordinate fornite. Il sito è realizzato con React e Tailwind per la grafica.",
    image: "/weatherApp.jpg",
    url: "https://weatherapp-federicobellezza.web.app/",
    tags: ["React", "Tailwind", "API"],
  },
  {
    title: "Task Manager",
    description:
      "Ho sviluppato un sito per imparare ad utilizzare Next.JS, l'autenticazione e il servizio di storage di SupaBase. Il sito è un semplicissimo task manager che ti permette di gestire la tua lista delle cose da fare. Ho utilizzato Vercel per il suo servizio gratuito di Hosting.",
    image: "/task-manager.jpg",
    url: "https://next-todo-list-swart.vercel.app/",
    tags: ["Next.js", "SupaBase", "Vercel"],
  },
  {
    title: "Rubber Duck",
    description:
      "Ho realizzato una pagina landing-page responsive utilizzando Next.js, React, Tailwind CSS, Swiper.js e Shadcn/UI. Include funzionalità come slider per le recensioni, FAQ interattive e animazioni fluide per il menu mobile. Scopri come questa paperella può migliorare la tua esperienza di sviluppo!",
    image: "/rubber-duck-screenshot.JPG",
    url: "https://rubber-duck-lemon.vercel.app/",
    tags: ["Next.js", "React", "Tailwind", "Swiper.js", "Shadcn/UI"],
  },
];

export default function Projects() {
  return (
    <div className="min-h-screen pt-32 pb-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-16 text-center"
        >
          <h1 className="font-serif text-6xl lg:text-8xl text-white mb-4">
            Progetti
          </h1>
          <div className="w-16 h-px bg-[var(--portfolio-accent)] mx-auto" />
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8">
          {projects.map((project, index) => (
            <motion.div
              key={index}
              className="h-full"
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className="h-full bg-[var(--portfolio-bg-card)] border border-[var(--portfolio-border)] overflow-hidden hover:border-[var(--portfolio-accent)]/50 transition-all duration-300 group">
                <div className="flex flex-col h-full">
                  <CardHeader>
                    <CardTitle className="font-serif text-2xl text-white">
                      {project.title}
                    </CardTitle>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {project.tags.map((tag, i) => (
                        <span
                          key={i}
                          className="px-3 py-1 text-xs uppercase tracking-wide text-[var(--portfolio-text-muted)] border border-[var(--portfolio-border)]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </CardHeader>

                  <CardContent className="flex-1">
                    <div className="relative overflow-hidden mb-6">
                      <Image
                        className="w-full h-64 object-cover object-top grayscale hover:grayscale-0 transition-all duration-500"
                        height={600}
                        width={600}
                        src={project.image}
                        alt={`Screenshot del progetto ${project.title}`}
                      />
                    </div>
                    <p className="text-[var(--portfolio-text-secondary)] leading-relaxed">
                      {project.description.split("\n").map((line, i) => (
                        <span key={i}>
                          {line}
                          <br />
                        </span>
                      ))}
                    </p>
                  </CardContent>

                  <CardFooter className="border-t border-[var(--portfolio-border)] pt-6">
                    <a
                      href={project.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-[var(--portfolio-accent)] hover:text-[var(--portfolio-accent-light)] transition-colors uppercase tracking-luxury text-sm"
                    >
                      <span>View Project</span>
                      <ArrowUpRight className="h-4 w-4" />
                    </a>
                  </CardFooter>
                </div>
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
            className="inline-flex items-center gap-3 py-4 px-8 border border-[var(--portfolio-border)] text-white hover:border-[var(--portfolio-accent)] hover:text-[var(--portfolio-accent)] transition-all duration-300 uppercase tracking-luxury text-sm"
          >
            <Github className="h-5 w-5" />
            <span>Altri progetti su GitHub</span>
          </a>
        </motion.div>
      </div>
    </div>
  );
}
