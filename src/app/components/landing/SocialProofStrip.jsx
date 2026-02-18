"use client";
import Image from "next/image";

const techs = [
  { name: "React", src: "/react.svg" },
  { name: "Next.js", src: "/next.svg" },
  { name: "Node.js", src: "/node-js.svg" },
  { name: "Tailwind", src: "/tailwind-css.svg" },
  { name: "n8n", src: "/n8n-logo.png" },
  { name: "MySQL", src: "/mysql.svg" },
  { name: "JavaScript", src: "/javascript.svg" },
  { name: "Java", src: "/java.svg" },
  { name: "Motion", src: "/motion.svg" },
];

function TechSet() {
  return (
    <div className="flex items-center shrink-0">
      {techs.map((tech) => (
        <div
          key={tech.name}
          className="flex flex-col items-center gap-2 shrink-0 px-8 grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all duration-300"
        >
          <Image
            src={tech.src}
            alt={tech.name}
            width={40}
            height={40}
            className="object-contain h-10 w-10"
          />
          <span className="text-xs text-slate-400 font-medium">
            {tech.name}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function SocialProofStrip() {
  return (
    <section className="py-16 border-y border-zinc-100">
      <p className="text-center text-sm font-medium text-slate-400 uppercase tracking-wider mb-10">
        Le tecnologie che utilizzo
      </p>

      <div className="relative overflow-hidden">
        {/* Fade edges */}
        <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />

        <div
          className="flex w-max"
          style={{ animation: "scroll 40s linear infinite" }}
        >
          <TechSet />
          <TechSet />
          <TechSet />
          <TechSet />
        </div>
      </div>
    </section>
  );
}
