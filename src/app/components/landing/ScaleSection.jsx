"use client";
import { motion } from "motion/react";
import { Monitor, Layers, Check, Plus } from "lucide-react";

const scales = [
  {
    title: "Landing Page & Siti Web",
    description:
      "Siti vetrina, landing page e presenze online per professionisti, attivita' locali e piccoli business. Veloci, responsive e pronti a convertire.",
    icon: Monitor,
    includes: ["Design responsive", "Form contatto", "SEO", "Hosting"],
  },
  {
    title: "Web App & Piattaforme",
    description:
      "Applicazioni web complesse con dashboard, autenticazione, database e logica di business. Per startup e aziende che hanno bisogno di scalare.",
    icon: Layers,
    includes: ["Dashboard", "Auth", "Database", "API", "Automazioni"],
  },
];

const pricingPlans = [
  {
    name: "Landing Page",
    price: "400",
    description:
      "Ideale per convertire visitatori in clienti o lanciare un prodotto.",
    popular: false,
    features: [
      "Sviluppo in Next.js (Ultra veloce)",
      "Design Responsive & Mobile First",
      "Ottimizzazione SEO (fatti trovare su Google)",
      "Integrazione Form di contatto",
      "Hosting su Vercel configurato",
    ],
    addOns: [
      "Brand Identity (Logo/Colori/Font)",
      "CMS per gestione contenuti",
      "Analytics",
    ],
  },
  {
    name: "Sito Corporate",
    price: "1.500",
    description:
      "Sito multipagina per aziende che vogliono una presenza solida e scalabile.",
    popular: true,
    features: [
      "Fino a 5-8 pagine",
      "CMS per gestione contenuti (opzionale)",
      "Ottimizzazione Performance (Core Web Vitals)",
      "Brand Identity (Logo/Colori/Font)",
      "Analytics",
    ],
    addOns: [
      "Autenticazione Utenti",
      "Database & Dashboard",
      "Pagamenti (Stripe)",
    ],
  },
  {
    name: "Web App / MVP",
    price: "3.500",
    description:
      "Applicazioni complesse, SaaS o Gestionali su misura con logica custom.",
    popular: false,
    features: [
      "Stack: Next.js + Supabase",
      "Autenticazione Utenti & Ruoli",
      "Database & Dashboard Admin",
      "Pagamenti (Stripe integration)",
      "API Development",
    ],
    addOns: [],
  },
];

export default function ScaleSection() {
  return (
    <section className="py-24 px-6">
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
            Un Progetto per Ogni Esigenza
          </h2>
          <p className="text-slate-500 max-w-xl mx-auto">
            Dalla landing page per il professionista alla piattaforma complessa
            per l&apos;azienda: ogni progetto ha la soluzione giusta.
          </p>
        </motion.div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {scales.map((scale, index) => (
            <motion.div
              key={scale.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className="bg-white border border-zinc-200 rounded-2xl p-8 hover:shadow-lg hover:border-zinc-300 transition-all duration-300 group"
            >
              <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mb-5 group-hover:bg-slate-900 group-hover:text-white transition-colors duration-300">
                <scale.icon className="w-6 h-6 text-slate-600 group-hover:text-white transition-colors duration-300" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">
                {scale.title}
              </h3>
              <p className="text-slate-500 leading-relaxed mb-5">
                {scale.description}
              </p>
              <div className="flex flex-wrap gap-2">
                {scale.includes.map((item) => (
                  <span
                    key={item}
                    className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-medium rounded-md"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Pricing cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-16">
          {pricingPlans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className={`relative bg-white rounded-2xl p-8 hover:shadow-lg transition-all duration-300 ${
                plan.popular
                  ? "border-2 border-slate-900"
                  : "border border-zinc-200 hover:border-zinc-300"
              }`}
            >
              {plan.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs font-semibold px-4 py-1 rounded-full">
                  Piu&apos; Popolare
                </span>
              )}

              <h3 className="text-xl font-semibold text-slate-900 mb-2">
                {plan.name}
              </h3>
              <p className="text-slate-500 text-sm mb-5">{plan.description}</p>

              <div className="mb-6">
                <span className="text-sm text-slate-500">da </span>
                <span className="text-3xl font-bold text-slate-900">
                  &euro; {plan.price}
                </span>
                <span className="text-sm text-slate-500"> iva inclusa</span>
              </div>

              <ul className="space-y-3 mb-6">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2 text-sm text-slate-600"
                  >
                    <Check className="w-4 h-4 text-slate-900 mt-0.5 shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>

              {plan.addOns.length > 0 && (
                <div className="border-t border-zinc-100 pt-4 mb-6">
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-3">
                    Aggiungi anche
                  </p>
                  <ul className="space-y-2">
                    {plan.addOns.map((addOn) => (
                      <li
                        key={addOn}
                        className="flex items-start gap-2 text-sm text-slate-400"
                      >
                        <Plus className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                        {addOn}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <a
                href="#contatti"
                className={`block w-full text-center py-3 rounded-xl text-sm font-medium transition-colors duration-200 ${
                  plan.popular
                    ? "bg-slate-900 text-white hover:bg-slate-800"
                    : "border border-zinc-300 text-slate-700 hover:bg-slate-50"
                }`}
              >
                Richiedi Preventivo
              </a>
            </motion.div>
          ))}
        </div>

        {/* Nota prezzi */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="text-center text-xs text-slate-400 mt-8"
        >
          * I prezzi sono indicativi e possono variare in base alle specifiche
          del progetto. Ogni preventivo viene personalizzato dopo
          un&apos;analisi delle tue esigenze.
        </motion.p>
      </div>
    </section>
  );
}
