"use client";
import { motion } from "motion/react";
import { Code, Workflow, Sparkles, Database } from "lucide-react";

const features = [
  {
    title: "Sviluppo Full Stack",
    description:
      "Web app scalabili con Next.js, React, Spring Boot e Node.js",
    icon: Code,
    span: "lg:col-span-2",
  },
  {
    title: "Automazione Processi",
    description:
      "Workflow n8n che fanno risparmiare 20+ ore a settimana",
    icon: Workflow,
    span: "",
  },
  {
    title: "Integrazione AI",
    description:
      "Soluzioni intelligenti con integrazione AI e automazione",
    icon: Sparkles,
    span: "",
  },
  {
    title: "Database & Cloud",
    description:
      "Supabase, Firebase, MySQL per dati sicuri e performanti",
    icon: Database,
    span: "lg:col-span-2",
  },
];

export default function FeaturesBentoGrid() {
  return (
    <section id="servizi" className="scroll-mt-20 py-24 px-6">
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
            I Miei Servizi
          </h2>
          <p className="text-slate-500 max-w-xl mx-auto">
            Soluzioni end-to-end per trasformare le tue idee in prodotti digitali
            performanti e automatizzati.
          </p>
        </motion.div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className={`${feature.span} bg-white border border-zinc-200 rounded-2xl p-8 hover:shadow-lg hover:border-zinc-300 transition-all duration-300 group`}
            >
              <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mb-5 group-hover:bg-slate-900 group-hover:text-white transition-colors duration-300">
                <feature.icon className="w-6 h-6 text-slate-600 group-hover:text-white transition-colors duration-300" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">
                {feature.title}
              </h3>
              <p className="text-slate-500 leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
