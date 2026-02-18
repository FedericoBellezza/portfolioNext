import { motion } from "framer-motion";
import Image from "next/image";

export default function AffidiSitoSection() {
  return (
    <section className="px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.5 }}
        className="flex flex-col sm:flex-row items-center gap-6  mb-16 justify-center"
      >
        <div className="max-w-99/100  w-100 h-120 rounded-xl overflow-hidden shrink-0 border border-zinc-200">
          <Image
            src="/foto-bambino.jpg"
            alt="Federico da bambino"
            width={1000}
            height={1000}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="text-center sm:text-left">
          <span className="text-slate-900 md:text-3xl  font-bold text-balance">
            Lui è quello a cui stai chiedendo di{" "}
            <br className="hidden lg:block" /> realizzare il sito web per la tua
            attività
          </span>
          <p className="lg:text-lg text-sm text-slate-400 italic mt-1">
            Crescendo sono rinsanito, lo giuro.
          </p>
        </div>
      </motion.div>
    </section>
  );
}
