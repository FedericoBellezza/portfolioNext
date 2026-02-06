import { motion } from "motion/react";
import Image from "next/image";

export default function TechnologiesSection() {
  const cardClass =
    "bg-[var(--portfolio-bg-card)] border border-[var(--portfolio-border)] p-8 hover:border-[var(--portfolio-border-hover)] transition-colors duration-300";

  const techItemClass =
    "flex flex-col items-center gap-3 p-4 hover:bg-[var(--portfolio-bg-secondary)] transition-colors duration-300";

  return (
    <motion.div
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      initial={{ opacity: 0, y: 100 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="max-w-7xl mx-auto"
    >
      <h2 className="font-serif text-5xl lg:text-6xl text-white text-center mb-4">
        Tecnologie
      </h2>
      <div className="w-16 h-px bg-[var(--portfolio-accent)] mx-auto mb-16" />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Languages */}
        <div className={cardClass}>
          <h3 className="text-lg text-white font-medium mb-6 uppercase tracking-luxury border-b border-[var(--portfolio-border)] pb-3">
            Linguaggi
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className={techItemClass}>
              <img
                className="h-12 w-12 object-contain opacity-80 hover:opacity-100 transition-opacity"
                src="/html.svg"
                alt="HTML"
              />
              <span className="text-[var(--portfolio-text-secondary)] text-xs uppercase tracking-wide">
                HTML
              </span>
            </div>
            <div className={techItemClass}>
              <img
                className="h-12 w-12 object-contain opacity-80 hover:opacity-100 transition-opacity"
                src="/css-alt.svg"
                alt="CSS"
              />
              <span className="text-[var(--portfolio-text-secondary)] text-xs uppercase tracking-wide">
                CSS
              </span>
            </div>
            <div className={techItemClass}>
              <img
                className="h-12 w-12 object-contain opacity-80 hover:opacity-100 transition-opacity"
                src="/javascript.svg"
                alt="JavaScript"
              />
              <span className="text-[var(--portfolio-text-secondary)] text-xs uppercase tracking-wide">
                JavaScript
              </span>
            </div>
            <div className={techItemClass}>
              <img
                className="h-12 w-12 object-contain opacity-80 hover:opacity-100 transition-opacity"
                src="/java.svg"
                alt="Java"
              />
              <span className="text-[var(--portfolio-text-secondary)] text-xs uppercase tracking-wide">
                Java
              </span>
            </div>
          </div>
        </div>

        {/* Framework & Runtime */}
        <div className={cardClass}>
          <h3 className="text-lg text-white font-medium mb-6 uppercase tracking-luxury border-b border-[var(--portfolio-border)] pb-3">
            Framework & Runtime
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className={techItemClass}>
              <img
                className="h-12 w-12 object-contain opacity-80 hover:opacity-100 transition-opacity"
                src="/react.svg"
                alt="React"
              />
              <span className="text-[var(--portfolio-text-secondary)] text-xs uppercase tracking-wide">
                React
              </span>
            </div>
            <div className={techItemClass}>
              <img
                className="h-12 w-12 object-contain opacity-80 hover:opacity-100 transition-opacity"
                src="https://img.icons8.com/fluent-systems-filled/200/FFFFFF/nextjs.png"
                alt="Next.js"
              />
              <span className="text-[var(--portfolio-text-secondary)] text-xs uppercase tracking-wide">
                Next.js
              </span>
            </div>
            <div className={techItemClass}>
              <img
                className="h-12 w-12 object-contain opacity-80 hover:opacity-100 transition-opacity"
                src="/node-js.svg"
                alt="Node.js"
              />
              <span className="text-[var(--portfolio-text-secondary)] text-xs uppercase tracking-wide">
                Node.js
              </span>
            </div>
            <div className={techItemClass}>
              <img
                className="h-12 w-12 object-contain opacity-80 hover:opacity-100 transition-opacity"
                src="https://netforemost.com/wp-content/uploads/2024/08/1646733543-1.webp"
                alt="Express.js"
              />
              <span className="text-[var(--portfolio-text-secondary)] text-xs uppercase tracking-wide">
                Express.js
              </span>
            </div>
            <div className={techItemClass}>
              <img
                className="h-12 w-12 object-contain opacity-80 hover:opacity-100 transition-opacity"
                src="https://www.geekandjob.com/uploads/wiki/3abebb36b664ca8ac4d29397bb9d2705198996a5.png"
                alt="Spring"
              />
              <span className="text-[var(--portfolio-text-secondary)] text-xs uppercase tracking-wide">
                Spring
              </span>
            </div>
            <div className={techItemClass}>
              <Image
                height={48}
                width={48}
                className="object-contain opacity-80 hover:opacity-100 transition-opacity"
                src="https://angular.io/assets/images/logos/angular/angular.svg"
                alt="Angular"
              />
              <span className="text-[var(--portfolio-text-secondary)] text-xs uppercase tracking-wide">
                Angular
              </span>
            </div>
          </div>
        </div>

        {/* CSS & UI Libraries */}
        <div className={cardClass}>
          <h3 className="text-lg text-white font-medium mb-6 uppercase tracking-luxury border-b border-[var(--portfolio-border)] pb-3">
            CSS & Librerie UI
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className={techItemClass}>
              <img
                className="h-12 w-12 object-contain opacity-80 hover:opacity-100 transition-opacity"
                src="/tailwind-css.svg"
                alt="Tailwind"
              />
              <span className="text-[var(--portfolio-text-secondary)] text-xs uppercase tracking-wide">
                Tailwind
              </span>
            </div>
            <div className={techItemClass}>
              <img
                className="h-12 w-12 object-contain opacity-80 hover:opacity-100 transition-opacity rounded-lg"
                src="https://images.seeklogo.com/logo-png/51/1/shadcn-ui-logo-png_seeklogo-519786.png"
                alt="Shadcn UI"
              />
              <span className="text-[var(--portfolio-text-secondary)] text-xs uppercase tracking-wide">
                Shadcn UI
              </span>
            </div>
            <div className={techItemClass}>
              <img
                className="h-12 w-12 object-contain opacity-80 hover:opacity-100 transition-opacity"
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/b/b2/Bootstrap_logo.svg/2560px-Bootstrap_logo.svg.png"
                alt="Bootstrap"
              />
              <span className="text-[var(--portfolio-text-secondary)] text-xs uppercase tracking-wide">
                Bootstrap
              </span>
            </div>
            <div className={techItemClass}>
              <img
                className="h-12 w-12 object-contain opacity-80 hover:opacity-100 transition-opacity"
                src="/motion.svg"
                alt="Motion"
              />
              <span className="text-[var(--portfolio-text-secondary)] text-xs uppercase tracking-wide">
                Motion
              </span>
            </div>
          </div>
        </div>

        {/* Automation Tools */}
        <div className={cardClass}>
          <h3 className="text-lg text-white font-medium mb-6 uppercase tracking-luxury border-b border-[var(--portfolio-border)] pb-3">
            Automation Tools
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className={techItemClass}>
              <img
                className="h-12 w-12 object-contain opacity-80 hover:opacity-100 transition-opacity"
                src="n8n-logo.png"
                alt="n8n"
              />
              <span className="text-[var(--portfolio-text-secondary)] text-xs uppercase tracking-wide">
                n8n
              </span>
            </div>
            <div className={techItemClass}>
              <img
                className="h-12 w-12 object-contain opacity-80 hover:opacity-100 transition-opacity rounded-lg"
                src="/notion-logo.png"
                alt="Notion"
              />
              <span className="text-[var(--portfolio-text-secondary)] text-xs uppercase tracking-wide">
                Notion
              </span>
            </div>
            <div className={techItemClass}>
              <img
                className="h-12 w-12 object-contain opacity-80 hover:opacity-100 transition-opacity"
                src="/ai-logo.svg"
                alt="AI"
              />
              <span className="text-[var(--portfolio-text-secondary)] text-xs uppercase tracking-wide">
                AI
              </span>
            </div>
          </div>
        </div>

        {/* Database & BaaS */}
        <div className={cardClass}>
          <h3 className="text-lg text-white font-medium mb-6 uppercase tracking-luxury border-b border-[var(--portfolio-border)] pb-3">
            Database & BaaS
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className={techItemClass}>
              <img
                className="h-12 w-12 object-contain opacity-80 hover:opacity-100 transition-opacity"
                src="mysql.svg"
                alt="MySQL"
              />
              <span className="text-[var(--portfolio-text-secondary)] text-xs uppercase tracking-wide">
                MySQL
              </span>
            </div>
            <div className={techItemClass}>
              <img
                className="h-12 w-12 object-contain opacity-80 hover:opacity-100 transition-opacity rounded-lg"
                src="https://elest.io/images/softwares/284/logo.png"
                alt="Supabase"
              />
              <span className="text-[var(--portfolio-text-secondary)] text-xs uppercase tracking-wide">
                Supabase
              </span>
            </div>
            <div className={techItemClass}>
              <img
                className="h-12 w-12 object-contain opacity-80 hover:opacity-100 transition-opacity"
                src="https://brandlogos.net/wp-content/uploads/2025/03/firebase_icon-logo_brandlogos.net_tcvck.png"
                alt="Firebase"
              />
              <span className="text-[var(--portfolio-text-secondary)] text-xs uppercase tracking-wide">
                Firebase
              </span>
            </div>
          </div>
        </div>

        {/* Templating */}
        <div className={cardClass}>
          <h3 className="text-lg text-white font-medium mb-6 uppercase tracking-luxury border-b border-[var(--portfolio-border)] pb-3">
            Templating
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className={techItemClass}>
              <img
                className="h-12 w-12 object-contain opacity-80 hover:opacity-100 transition-opacity"
                src="https://www.thymeleaf.org/images/thymeleaf.png"
                alt="Thymeleaf"
              />
              <span className="text-[var(--portfolio-text-secondary)] text-xs uppercase tracking-wide">
                Thymeleaf
              </span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
