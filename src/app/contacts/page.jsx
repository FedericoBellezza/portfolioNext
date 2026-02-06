"use client";
import { useState, useRef } from "react";
import emailjs from "@emailjs/browser";
import { motion } from "motion/react";
import toast, { Toaster } from "react-hot-toast";
import {
  Send,
  Mail,
  User,
  FileText,
  MessageSquare,
  Loader2,
} from "lucide-react";

export default function ContactsPage() {
  const [emailStatus, setEmailStatus] = useState({
    sending: false,
    sent: false,
    error: false,
  });
  const formRef = useRef(null);

  const sendEmail = (e) => {
    e.preventDefault();
    setEmailStatus({ sending: true, sent: false, error: false });

    emailjs
      .sendForm(
        "service_n4qr5hq",
        "template_gdpzsbm",
        e.target,
        "XsBnVOzYdqoFAgYBB"
      )
      .then(
        (result) => {
          console.log(result.text);
          setEmailStatus({ sending: false, sent: true, error: false });
          e.target.reset();
          toast.success("Messaggio inviato con successo!");
        },
        (error) => {
          console.log(error.text);
          setEmailStatus({ sending: false, sent: false, error: true });
          toast.error(
            "Si è verificato un errore durante l'invio. Riprova più tardi."
          );
        }
      );
  };

  const inputClass =
    "w-full px-4 py-3 bg-transparent border border-[var(--portfolio-border)] text-white placeholder:text-[var(--portfolio-text-muted)] focus:border-[var(--portfolio-accent)] focus:outline-none transition-colors duration-300";

  return (
    <div className="min-h-screen pt-32 pb-20 px-4 sm:px-6 lg:px-8">
      <Toaster position="bottom-right" reverseOrder={false} />
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h1 className="font-serif text-6xl lg:text-8xl text-white mb-4">
            Contatti
          </h1>
          <div className="w-16 h-px bg-[var(--portfolio-accent)] mx-auto mb-8" />
          <p className="text-[var(--portfolio-text-secondary)] max-w-2xl mx-auto text-lg">
            Hai un progetto in mente o vuoi collaborare? <br /> Compila il form
            e ti risponderò al più presto.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 items-start">
          {/* Contact Info */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="lg:col-span-2"
          >
            <div className="bg-[var(--portfolio-bg-card)] border border-[var(--portfolio-border)] p-8">
              <h3 className="font-serif text-2xl text-white mb-8">
                Informazioni di contatto
              </h3>

              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 border border-[var(--portfolio-border)] flex items-center justify-center">
                    <Mail className="h-5 w-5 text-[var(--portfolio-accent)]" />
                  </div>
                  <div>
                    <p className="text-[var(--portfolio-text-muted)] text-xs uppercase tracking-wide">
                      Email
                    </p>
                    <p className="text-white">federico.bellezza2001@gmail.com</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 border border-[var(--portfolio-border)] flex items-center justify-center">
                    <User className="h-5 w-5 text-[var(--portfolio-accent)]" />
                  </div>
                  <div>
                    <p className="text-[var(--portfolio-text-muted)] text-xs uppercase tracking-wide">
                      Disponibilità
                    </p>
                    <p className="text-white">Full-time / Freelance</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 border border-[var(--portfolio-border)] flex items-center justify-center">
                    <MessageSquare className="h-5 w-5 text-[var(--portfolio-accent)]" />
                  </div>
                  <div>
                    <p className="text-[var(--portfolio-text-muted)] text-xs uppercase tracking-wide">
                      Risposta
                    </p>
                    <p className="text-white">Entro 24-48 ore</p>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-[var(--portfolio-border)]">
                <div className="flex gap-4 justify-center">
                  <a
                    href="https://www.linkedin.com/in/federicobellezzadev/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-12 h-12 border border-[var(--portfolio-border)] flex items-center justify-center text-[var(--portfolio-text-muted)] hover:text-[var(--portfolio-accent)] hover:border-[var(--portfolio-accent)] transition-colors duration-300"
                  >
                    <svg
                      className="h-5 w-5"
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
                    className="w-12 h-12 border border-[var(--portfolio-border)] flex items-center justify-center text-[var(--portfolio-text-muted)] hover:text-[var(--portfolio-accent)] hover:border-[var(--portfolio-accent)] transition-colors duration-300"
                  >
                    <svg
                      className="h-5 w-5"
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

          {/* Contact Form */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="lg:col-span-3"
          >
            <div className="bg-[var(--portfolio-bg-card)] border border-[var(--portfolio-border)] p-8">
              <h3 className="font-serif text-2xl text-white mb-8">
                Invia un messaggio
              </h3>

              <form ref={formRef} onSubmit={sendEmail} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label
                      htmlFor="from_name"
                      className="text-[var(--portfolio-text-muted)] text-xs uppercase tracking-wide"
                    >
                      Nome
                    </label>
                    <input
                      required
                      id="from_name"
                      type="text"
                      name="from_name"
                      placeholder="Il tuo nome"
                      className={inputClass}
                    />
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="from_email"
                      className="text-[var(--portfolio-text-muted)] text-xs uppercase tracking-wide"
                    >
                      Email
                    </label>
                    <input
                      required
                      id="from_email"
                      type="email"
                      name="from_email"
                      placeholder="La tua email"
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="object"
                    className="text-[var(--portfolio-text-muted)] text-xs uppercase tracking-wide"
                  >
                    Oggetto
                  </label>
                  <input
                    required
                    id="object"
                    type="text"
                    name="object"
                    placeholder="Oggetto del messaggio"
                    className={inputClass}
                  />
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="message"
                    className="text-[var(--portfolio-text-muted)] text-xs uppercase tracking-wide"
                  >
                    Messaggio
                  </label>
                  <textarea
                    required
                    id="message"
                    name="message"
                    rows="5"
                    placeholder="Scrivi il tuo messaggio qui..."
                    className={`${inputClass} resize-none`}
                  ></textarea>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={emailStatus.sending}
                    className={`w-full py-4 flex items-center justify-center gap-2 uppercase tracking-luxury text-sm font-medium transition-all duration-300 cursor-pointer ${
                      emailStatus.sending
                        ? "bg-[var(--portfolio-bg-secondary)] text-[var(--portfolio-text-muted)] cursor-not-allowed border border-[var(--portfolio-border)]"
                        : "border border-[var(--portfolio-accent)] text-[var(--portfolio-accent)] hover:bg-[var(--portfolio-accent)] hover:text-black"
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
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
