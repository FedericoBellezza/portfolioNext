"use client";
import { useState, useRef } from "react";
import emailjs from "@emailjs/browser";
import { motion, AnimatePresence } from "motion/react";
import {
  Send,
  Mail,
  User,
  FileText,
  MessageSquare,
  CheckCircle,
  Loader2,
} from "lucide-react";

export default function ContactsPage() {
  const [emailStatus, setEmailStatus] = useState({
    sending: false,
    sent: false,
    error: false,
  });
  const formRef = useRef(null);

  // send email function
  const sendEmail = (e) => {
    e.preventDefault();
    setEmailStatus({ sending: true, sent: false, error: false });

    emailjs
      .sendForm(
        "service_n4qr5hq",
        "template_gdpzsbm",
        e.target,
        "I5U0ciuEcNnc8z7_k"
      )
      .then((result) => {
        console.log(result.text);
        setEmailStatus({ sending: false, sent: true, error: false });
        e.target.reset();

        setTimeout(() => {
          setEmailStatus({ sending: false, sent: false, error: false });
        }, 5000);
      })
      .catch((error) => {
        console.log(error.text);
        setEmailStatus({ sending: false, sent: false, error: true });
      });
  };

  return (
    <div className="min-h-screen py-40 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-900 to-slate-950">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h1 className="text-5xl md:text-6xl font-extrabold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent pb-2">
            Contattami
          </h1>
          <div className="w-24 h-1 bg-gradient-to-r from-green-500 to-blue-500 mx-auto rounded-full mt-6"></div>
          <p className="text-gray-400 mt-6 max-w-2xl mx-auto text-lg ">
            Hai un progetto in mente o vuoi collaborare? <br /> Compila il form
            e ti risponderò al più presto.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 items-start">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="lg:col-span-2 space-y-8"
          >
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-2xl shadow-xl">
              <h3 className="text-2xl font-bold text-white mb-4">
                Informazioni di contatto
              </h3>

              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="bg-green-500/20 p-3 rounded-full">
                    <Mail className="h-6 w-6 text-green-500" />
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Email</p>
                    <p className="text-white font-medium">
                      federico.bellezza2001@gmail.com
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="bg-blue-500/20 p-3 rounded-full">
                    <User className="h-6 w-6 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Disponibilità</p>
                    <p className="text-white font-medium">
                      Full-time / Freelance
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="bg-purple-500/20 p-3 rounded-full">
                    <MessageSquare className="h-6 w-6 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Risposta</p>
                    <p className="text-white font-medium">Entro 24-48 ore</p>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-700">
                <div className="flex gap-4 justify-center">
                  <a
                    href="https://www.linkedin.com/in/federicobellezzadev/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-slate-700 hover:bg-slate-600 p-3 rounded-full transition-colors"
                  >
                    <svg
                      className="h-5 w-5 text-white"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                    </svg>
                  </a>
                  <a
                    href="https://github.com/FedericoBellezza"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-slate-700 hover:bg-slate-600 p-3 rounded-full transition-colors"
                  >
                    <svg
                      className="h-5 w-5 text-white"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="lg:col-span-3"
          >
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-xl p-8 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 to-blue-500"></div>

              <h3 className="text-2xl font-bold text-white mb-6">
                Invia un messaggio
              </h3>

              <form
                ref={formRef}
                onSubmit={sendEmail}
                className="space-y-5 relative z-10"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1">
                    <label
                      htmlFor="from_name"
                      className="text-sm text-gray-400"
                    >
                      Nome
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <User className="h-5 w-5 text-gray-500" />
                      </div>
                      <input
                        required
                        id="from_name"
                        type="text"
                        name="from_name"
                        placeholder="Il tuo nome"
                        className="w-full pl-10 pr-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500 transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label
                      htmlFor="from_email"
                      className="text-sm text-gray-400"
                    >
                      Email
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <Mail className="h-5 w-5 text-gray-500" />
                      </div>
                      <input
                        required
                        id="from_email"
                        type="email"
                        name="from_email"
                        placeholder="La tua email"
                        className="w-full pl-10 pr-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500 transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label htmlFor="object" className="text-sm text-gray-400">
                    Oggetto
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <FileText className="h-5 w-5 text-gray-500" />
                    </div>
                    <input
                      required
                      id="object"
                      type="text"
                      name="object"
                      placeholder="Oggetto del messaggio"
                      className="w-full pl-10 pr-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label htmlFor="message" className="text-sm text-gray-400">
                    Messaggio
                  </label>
                  <div className="relative">
                    <div className="absolute top-3 left-0 flex items-start pl-3 pointer-events-none">
                      <MessageSquare className="h-5 w-5 text-gray-500" />
                    </div>
                    <textarea
                      required
                      id="message"
                      name="message"
                      rows="5"
                      placeholder="Scrivi il tuo messaggio qui..."
                      className="w-full pl-10 pr-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500 transition-all resize-none"
                    ></textarea>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={emailStatus.sending}
                    className={`w-full py-3 px-4 flex items-center justify-center gap-2 rounded-lg text-white font-medium transition-all cursor-pointer ${
                      emailStatus.sending
                        ? "bg-slate-600 cursor-not-allowed"
                        : "bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600"
                    }`}
                  >
                    {emailStatus.sending ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Invio in corso...</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-5 w-5" />
                        <span>Invia messaggio</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Success message */}
              <AnimatePresence>
                {emailStatus.sent && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute bottom-8 left-0 right-0 mx-auto w-5/6 bg-green-500/20 border border-green-500/50 text-green-400 px-4 py-3 rounded-lg flex items-center gap-2"
                  >
                    <CheckCircle className="h-5 w-5 flex-shrink-0" />
                    <p>
                      Messaggio inviato con successo! Ti risponderò al più
                      presto.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Error message */}
              <AnimatePresence>
                {emailStatus.error && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute bottom-8 left-0 right-0 mx-auto w-5/6 bg-red-500/20 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg flex items-center gap-2"
                  >
                    <svg
                      className="h-5 w-5 flex-shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <p>
                      Si è verificato un errore durante l'invio. Riprova più
                      tardi o contattami direttamente via email.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
