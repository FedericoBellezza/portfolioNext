"use client";
import { motion } from "motion/react";
import Image from "next/image";

export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center pt-16 px-6 overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute top-20 -left-32 w-96 h-96 bg-blue-100 rounded-full blur-3xl opacity-40 pointer-events-none" />
      <div className="absolute bottom-20 -right-32 w-96 h-96 bg-violet-100 rounded-full blur-3xl opacity-40 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-slate-100 to-blue-50 rounded-full blur-3xl opacity-30 pointer-events-none" />

      <div className="relative max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        {/* Left — Text */}
        <div>
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-block px-4 py-1.5 bg-slate-100 text-slate-600 text-sm font-medium rounded-full mb-8">
              Full Stack Developer & Automation Specialist
            </span>
          </motion.div>

          {/* H1 */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl sm:text-5xl lg:text-5xl xl:text-6xl font-bold text-slate-900 tracking-tight leading-tight mb-6"
          >
            Ecosistemi Digitali{" "}
            <span className="bg-gradient-to-r from-slate-900 via-slate-700 to-slate-500 bg-clip-text text-transparent">
              Automatizzati
            </span>{" "}
            per il Tuo Business
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg sm:text-xl text-slate-500 max-w-xl mb-10 leading-relaxed"
          >
            Non scrivo solo codice: progetto soluzioni che fanno risparmiare
            tempo e aumentano il valore del tuo business.
          </motion.p>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="text-sm text-slate-400 italic -mt-6 mb-10"
          >
            Tradotto: faccio siti web e automazioni. E funzionano.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center sm:items-start gap-4"
          >
            <a
              href="#contatti"
              className="w-full sm:w-auto text-center px-8 py-3.5 bg-slate-900 text-white font-medium rounded-lg hover:bg-slate-800 transition-colors duration-200 text-sm"
            >
              Prenota una Consulenza
            </a>
            <a
              href="#progetti"
              className="w-full sm:w-auto text-center px-8 py-3.5 border border-slate-300 text-slate-700 font-medium rounded-lg hover:border-slate-400 hover:bg-slate-50 transition-colors duration-200 text-sm"
            >
              Vedi i Progetti
            </a>
          </motion.div>
        </div>

        {/* Right — Photo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="flex justify-center lg:justify-end"
        >
          <div>
            <span className="text-sm text-slate-500 italic mb-4 block ">
              Colui che preme i tasti finché non funziona il tutto:
            </span>
            <Image
              src="/foto-profilo.jpg"
              alt="Federico Bellezza"
              width={480}
              height={480}
              priority
              className="rounded-3xl object-cover w-full max-w-md shadow-lg"
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
