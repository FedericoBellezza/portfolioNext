"use client";
import { motion } from "motion/react";
import {
  Code,
  Workflow,
  Sparkles,
  Database,
  MessageSquare,
  Zap,
  Plug,
  BarChart3,
} from "lucide-react";

const topFeatures = [
  {
    title: "Sviluppo Full Stack",
    description: "Web app scalabili con Next.js, React, Spring Boot e Node.js",
    icon: Code,
    span: "",
  },
  {
    title: "Automazione Processi",
    description: "Workflow n8n che fanno risparmiare 20+ ore a settimana",
    joke: "Perché la vita è troppo corta per fare copia-incolla.",
    icon: Workflow,
    span: "",
  },
  {
    title: "Database & Cloud",
    description: "Supabase, Firebase, MySQL per dati sicuri e performanti",
    icon: Database,
    span: "",
  },
];

const aiFeature = {
  title: "Integrazione AI",

  icon: Sparkles,
  subServices: [
    {
      title: "Chatbot & Assistenti AI",
      description:
        "Chatbot intelligenti, customer support automatico e FAQ con LLM",
      icon: MessageSquare,
    },
    {
      title: "Automazione con AI",
      description:
        "Workflow n8n + AI per analisi documenti, generazione contenuti ed email",
      icon: Zap,
    },
    {
      title: "Integrazione AI in app",
      description: "OpenAI, Claude e modelli custom integrati nelle tue app",
      icon: Plug,
    },
    {
      title: "Analisi Dati con AI",
      description:
        "Dashboard intelligenti, report automatici e insights predittivi",
      icon: BarChart3,
    },
  ],
};


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
            Soluzioni end-to-end per trasformare le tue idee in prodotti
            digitali performanti e automatizzati.
          </p>
        </motion.div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Top row */}
          {topFeatures.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className={`${feature.span} bg-white border border-zinc-200 rounded-2xl p-8 hover:shadow-lg hover:border-zinc-300 transition-all duration-300 group`}
            >
              <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mb-5 group-hover:bg-slate-900 transition-colors duration-300">
                <feature.icon className="w-6 h-6 text-slate-600 group-hover:text-white transition-colors duration-300" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">
                {feature.title}
              </h3>
              <p className="text-slate-500 leading-relaxed">
                {feature.description}
              </p>
              {feature.joke && (
                <p className="text-xs text-slate-400 italic mt-2">
                  {feature.joke}
                </p>
              )}
            </motion.div>
          ))}

          {/* AI card - full width */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="lg:col-span-3 bg-white border text-balance border-zinc-200 rounded-2xl p-8 hover:shadow-lg hover:border-zinc-300 transition-all duration-300 group"
          >
            <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mb-5 group-hover:bg-slate-900 transition-colors duration-300">
              <aiFeature.icon className="w-6 h-6 text-slate-600 group-hover:text-white transition-colors duration-300" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">
              {aiFeature.title}
            </h3>
            <p className="text-slate-500 leading-relaxed">
              {aiFeature.description}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
              {aiFeature.subServices.map((sub) => (
                <div
                  key={sub.title}
                  className="bg-slate-50 border border-zinc-200 rounded-xl p-4 hover:border-zinc-300 hover:shadow-sm transition-all duration-300"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                      <sub.icon className="w-4 h-4 text-slate-600" />
                    </div>
                    <h4 className="text-sm font-semibold text-slate-900">
                      {sub.title}
                    </h4>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {sub.description}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
