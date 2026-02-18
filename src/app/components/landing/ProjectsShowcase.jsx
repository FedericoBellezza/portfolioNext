"use client";
import { motion } from "motion/react";
import Image from "next/image";
import { ArrowUpRight, Github } from "lucide-react";

const projects = [
  {
    title: "Federica Autretto",
    description:
      "Landing page responsive per una biologa nutrizionista, con form contatto Resend, redirect WhatsApp e Google Maps integrati.",
    image: "/federica-autretto.com-screenshot.png",
    url: "https://federica-autretto.com/",
    tags: ["Next.js", "Tailwind", "Resend"],
  },
  {
    title: "Cantieri360",
    description:
      "Web app gestionale per l'edilizia: cantieri, squadre, ore lavorate e costi. Cloud-first e mobile-friendly.",
    image: "/Canieri360-Copertina.jpg",
    url: "https://cantieri360.vercel.app/",
    tags: ["Next.js", "Supabase", "Tailwind"],
  },
  {
    title: "Knit",
    description:
      "Piattaforma per una start-up dedicata agli atleti professionisti: networking strategico, crescita e opportunità.",
    image: "/knit-screenshot.jpg",
    url: "https://www.knit-networks.com/",
    tags: ["Next.js", "Tailwind", "DaisyUI"],
  },
  {
    title: "Fanfara Bersaglieri",
    description:
      "Sito web per la Fanfara di Bersaglieri di Settimo Torinese, con calendario eventi e design responsive ottimizzato.",
    image: "/FanfaraBersaglieriScreenshot.jpg",
    url: "https://bersaglierisettimo.vercel.app/",
    tags: ["Next.js", "React", "Tailwind"],
  },
  {
    title: "Let's Play",
    description:
      "Piattaforma eventi con ricerca/filtro per categoria, prezzo e ubicazione. Backoffice con autenticazione e CRUD completo.",
    image: "/letsPlayImage.jpeg",
    url: "https://www.linkedin.com/feed/update/urn:li:activity:7318199610559066112/",
    tags: ["Spring", "React", "MySQL"],
  },
];

export default function ProjectsShowcase() {
  return (
    <section id="progetti" className="scroll-mt-20 py-24 px-6 bg-slate-50">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
            Progetti Selezionati
          </h2>
          <p className="text-slate-500 max-w-xl mx-auto">
            Alcuni dei lavori che rappresentano al meglio il mio approccio
            allo sviluppo.
          </p>
        </motion.div>

        {/* Projects grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {projects.map((project, index) => (
            <motion.div
              key={project.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className="group"
            >
              <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden hover:shadow-xl hover:border-zinc-300 transition-all duration-300">
                {/* Browser mockup */}
                <div className="bg-zinc-100 px-4 py-3 flex items-center gap-2 border-b border-zinc-200">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-zinc-300" />
                    <div className="w-3 h-3 rounded-full bg-zinc-300" />
                    <div className="w-3 h-3 rounded-full bg-zinc-300" />
                  </div>
                  <div className="flex-1 mx-4">
                    <div className="bg-white rounded-md px-3 py-1 text-xs text-zinc-400 truncate">
                      {project.url.replace("https://", "").replace(/\/$/, "")}
                    </div>
                  </div>
                </div>

                {/* Screenshot */}
                <div className="relative overflow-hidden">
                  <Image
                    src={project.image}
                    alt={project.title}
                    width={800}
                    height={450}
                    className="w-full h-56 object-cover object-top group-hover:scale-105 transition-transform duration-500"
                  />
                </div>

                {/* Content */}
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">
                    {project.title}
                  </h3>
                  <p className="text-sm text-slate-500 leading-relaxed mb-4">
                    {project.description}
                  </p>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {project.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2.5 py-1 bg-slate-100 text-slate-600 text-xs font-medium rounded-md"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Link */}
                  <a
                    href={project.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-900 hover:text-slate-600 transition-colors"
                  >
                    Vedi Progetto
                    <ArrowUpRight className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* GitHub CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="mt-12 text-center"
        >
          <a
            href="https://github.com/FedericoBellezza"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 border border-zinc-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 hover:border-zinc-400 transition-all duration-200 text-sm"
          >
            <Github className="w-4 h-4" />
            Vedi tutti su GitHub
          </a>
        </motion.div>
      </div>
    </section>
  );
}
