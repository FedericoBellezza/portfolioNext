import { motion } from "framer-motion";
import Image from "next/image";

export default function AffidiSitoSection() {
  return (
    <section className="px-6">
      {" "}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.5 }}
        className="flex flex-col sm:flex-row items-center gap-6 mt-16 mb-16 justify-center"
      >
        <div className="max-w-99/100 w-100 h-120 rounded-xl overflow-hidden shrink-0 border border-zinc-200">
          <Image
            src="/foto-bambino.jpg"
            alt="Federico da bambino"
            width={1000}
            height={1000}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="text-center sm:text-left">
          <p className="text-slate-900 text-4xl font-bold">
            Occhio a chi affidi il tuo sito web.
          </p>
          <p className="text-lg text-slate-400 italic mt-1">
            Crescendo sono rinsanito, lo giuro.
          </p>
        </div>
      </motion.div>
    </section>
  );
}
