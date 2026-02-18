"use client";
import { motion } from "motion/react";
import Image from "next/image";

export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center md:pt-16 pt-25 px-6 overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute top-20 -left-32 w-96 h-96 bg-blue-100 rounded-full blur-3xl opacity-40 pointer-events-none" />
      <div className="absolute bottom-20 -right-32 w-96 h-96 bg-violet-100 rounded-full blur-3xl opacity-40 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-slate-100 to-blue-50 rounded-full blur-3xl opacity-30 pointer-events-none" />

      <div className="relative max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
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
            Soluzioni Tech su Misura per{" "}
            <span className="bg-gradient-to-r from-slate-900 via-slate-700 to-slate-500 bg-clip-text text-transparent">
              Scalare
            </span>{" "}
            il Tuo Business.
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
            {/* Mobile: WhatsApp */}
            <a
              href="https://wa.me/393314508880?text=Ciao%20Federico%2C%20sono%20passato%20dal%20tuo%20sito%2C%20ti%20scrivo%20per%20"
              target="_blank"
              rel="noopener noreferrer"
              className="sm:hidden w-full text-center px-8 py-3.5 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors duration-200 text-sm flex items-center justify-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              Scrivimi su WhatsApp
            </a>
            {/* Desktop: Consulenza */}
            <a
              href="#contatti"
              className="hidden sm:inline-block text-center px-8 py-3.5 bg-slate-900 text-white font-medium rounded-lg hover:bg-slate-800 transition-colors duration-200 text-sm"
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
