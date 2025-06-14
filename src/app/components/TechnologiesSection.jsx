import { motion } from "motion/react";

export default function TechnologiesSection() {
  return (
    <motion.div
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      initial={{ opacity: 0, y: 100 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="px-4 py-16"
    >
      <h2 className="lg:text-6xl text-4xl text-white text-center font-black mb-12 relative">
        <span className="relative z-10">Tecnologie</span>
        <span className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 h-1 w-24 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></span>
      </h2>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 max-w-7xl mx-auto">
        <div className="bg-gradient-to-br from-slate-700 to-slate-800 p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
          <h3 className="text-3xl text-white font-semibold mb-6 border-b border-slate-500 pb-3 flex items-center">
            <svg
              className="w-6 h-6 mr-2 text-blue-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
              />
            </svg>
            Linguaggi
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="flex flex-col items-center gap-4 p-4 bg-slate-800/50 rounded-xl hover:bg-slate-800 transition-colors">
              <img
                className="h-16 w-16 object-contain"
                src="/html.svg"
                alt="HTML logo"
              />
              <span className="text-white font-medium">HTML</span>
            </div>
            <div className="flex flex-col items-center gap-4 p-4 bg-slate-800/50 rounded-xl hover:bg-slate-800 transition-colors">
              <img
                className="h-16 w-16 object-contain"
                src="/css-alt.svg"
                alt="CSS logo"
              />
              <span className="text-white font-medium">CSS</span>
            </div>
            <div className="flex flex-col items-center gap-4 p-4 bg-slate-800/50 rounded-xl hover:bg-slate-800 transition-colors">
              <img
                className="h-16 w-16 object-contain"
                src="/javascript.svg"
                alt="JavaScript logo"
              />
              <span className="text-white font-medium">JavaScript</span>
            </div>
            <div className="flex flex-col items-center gap-4 p-4 bg-slate-800/50 rounded-xl hover:bg-slate-800 transition-colors">
              <img
                className="h-16 w-16 object-contain"
                src="/java.svg"
                alt="Java logo"
              />
              <span className="text-white font-medium">Java</span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-700 to-slate-800 p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
          <h3 className="text-3xl text-white font-semibold mb-6 border-b border-slate-500 pb-3 flex items-center">
            <svg
              className="w-6 h-6 mr-2 text-green-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
              />
            </svg>
            Framework & Runtime
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="flex flex-col items-center gap-4 p-4 bg-slate-800/50 rounded-xl hover:bg-slate-800 transition-colors">
              <img
                className="h-16 w-16 object-contain"
                src="/react.svg"
                alt="React logo"
              />
              <span className="text-white font-medium">React</span>
            </div>
            <div className="flex flex-col items-center gap-4 p-4 bg-slate-800/50 rounded-xl hover:bg-slate-800 transition-colors">
              <img
                className="h-16 w-16 object-contain"
                src="https://img.icons8.com/fluent-systems-filled/200/FFFFFF/nextjs.png"
                alt="Next.js logo"
              />
              <span className="text-white font-medium">Next.js</span>
            </div>
            <div className="flex flex-col items-center gap-4 p-4 bg-slate-800/50 rounded-xl hover:bg-slate-800 transition-colors">
              <img
                className="h-16 w-16 object-contain p-1"
                src="/node-js.svg"
                alt="Node.js logo"
              />
              <span className="text-white font-medium">Node.js</span>
            </div>
            <div className="flex flex-col items-center gap-4 p-4 bg-slate-800/50 rounded-xl hover:bg-slate-800 transition-colors">
              <img
                className="h-16 w-16 object-contain"
                src="https://netforemost.com/wp-content/uploads/2024/08/1646733543-1.webp"
                alt="Express.js logo"
              />
              <span className="text-white font-medium">Express.js</span>
            </div>
            <div className="flex flex-col items-center gap-4 p-4 bg-slate-800/50 rounded-xl hover:bg-slate-800 transition-colors">
              <img
                className="h-16 w-16 object-contain"
                src="https://www.geekandjob.com/uploads/wiki/3abebb36b664ca8ac4d29397bb9d2705198996a5.png"
                alt="Spring logo"
              />
              <span className="text-white font-medium">Spring</span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-700 to-slate-800 p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
          <h3 className="text-3xl text-white font-semibold mb-6 border-b border-slate-500 pb-3 flex items-center">
            <svg
              className="w-6 h-6 mr-2 text-purple-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
              />
            </svg>
            CSS & Librerie UI
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="flex flex-col items-center gap-4 p-4 bg-slate-800/50 rounded-xl hover:bg-slate-800 transition-colors">
              <img
                className="h-16 w-16 object-contain"
                src="/tailwind-css.svg"
                alt="Tailwind logo"
              />
              <span className="text-white font-medium">Tailwind</span>
            </div>
            <div className="flex flex-col items-center gap-4 p-4 bg-slate-800/50 rounded-xl hover:bg-slate-800 transition-colors">
              <img
                className="h-16 w-16 object-contain rounded-xl"
                src="https://images.seeklogo.com/logo-png/51/1/shadcn-ui-logo-png_seeklogo-519786.png"
                alt="Shadcn UI logo"
              />
              <span className="text-white font-medium">Shadcn UI</span>
            </div>
            <div className="flex flex-col items-center gap-4 p-4 bg-slate-800/50 rounded-xl hover:bg-slate-800 transition-colors">
              <img
                className="h-16 w-16 object-contain p-1"
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/b/b2/Bootstrap_logo.svg/2560px-Bootstrap_logo.svg.png"
                alt="Bootstrap logo"
              />
              <span className="text-white font-medium">Bootstrap</span>
            </div>
            <div className="flex flex-col items-center gap-4 p-4 bg-slate-800/50 rounded-xl hover:bg-slate-800 transition-colors">
              <img
                className="h-16 w-16 object-contain"
                src="/motion.svg"
                alt="Motion logo"
              />
              <span className="text-white font-medium">Motion</span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-700 to-slate-800 p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
          <h3 className="text-3xl text-white font-semibold mb-6 border-b border-slate-500 pb-3 flex items-center">
            <svg
              className="w-6 h-6 mr-2 text-yellow-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"
              />
            </svg>
            Database e BaaS
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="flex flex-col items-center gap-4 p-4 bg-slate-800/50 rounded-xl hover:bg-slate-800 transition-colors">
              <img
                className="h-16 w-16 object-contain"
                src="mysql.svg"
                alt="MySQL logo"
              />
              <span className="text-white font-medium">MySQL</span>
            </div>
            <div className="flex flex-col items-center gap-4 p-4 bg-slate-800/50 rounded-xl hover:bg-slate-800 transition-colors">
              <img
                className="h-16 w-16 object-contain p-2 rounded-xl"
                src="https://elest.io/images/softwares/284/logo.png"
                alt="Supabase logo"
              />
              <span className="text-white font-medium">Supabase</span>
            </div>
            <div className="flex flex-col items-center gap-4 p-4 bg-slate-800/50 rounded-xl hover:bg-slate-800 transition-colors">
              <img
                className="h-16 w-16 object-contain p-1"
                src="https://brandlogos.net/wp-content/uploads/2025/03/firebase_icon-logo_brandlogos.net_tcvck.png"
                alt="Firebase logo"
              />
              <span className="text-white font-medium">Firebase</span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-700 to-slate-800 p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
          <h3 className="text-3xl text-white font-semibold mb-6 border-b border-slate-500 pb-3 flex items-center">
            <svg
              className="w-6 h-6 mr-2 text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
              />
            </svg>
            Templating
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="flex flex-col items-center gap-4 p-4 bg-slate-800/50 rounded-xl hover:bg-slate-800 transition-colors">
              <img
                className="h-16 w-16 object-contain p-1"
                src="https://www.thymeleaf.org/images/thymeleaf.png"
                alt="Thymeleaf logo"
              />
              <span className="text-white font-medium">Thymeleaf</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
