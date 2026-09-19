"use client";

import { useRef, useState } from "react";
import emailjs from "@emailjs/browser";
import toast, { Toaster } from "react-hot-toast";
import {
  PaperPlaneTiltIcon,
  SpinnerGapIcon,
  EnvelopeSimpleIcon,
  ClockIcon,
  CompassIcon,
  WhatsappLogoIcon,
  GithubLogoIcon,
  LinkedinLogoIcon,
  CheckCircleIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { CONTACT } from "@/lib/site-data";

const SERVICE_ID = "service_n4qr5hq";
const TEMPLATE_ID = "template_gdpzsbm";
const PUBLIC_KEY = "XsBnVOzYdqoFAgYBB";

// Field names are unchanged: the EmailJS template maps onto them.
const FIELDS = [
  { name: "from_name", label: "Nome", type: "text", autoComplete: "name" },
  { name: "from_email", label: "Email", type: "email", autoComplete: "email" },
  { name: "object", label: "Oggetto", type: "text", full: true },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function validate(values) {
  const errors = {};
  if (!values.from_name?.trim()) errors.from_name = "Serve un nome per risponderti.";
  if (!values.from_email?.trim()) {
    errors.from_email = "Serve un indirizzo email.";
  } else if (!EMAIL_RE.test(values.from_email.trim())) {
    errors.from_email = "Questo indirizzo non sembra valido.";
  }
  if (!values.object?.trim()) errors.object = "Scrivi di cosa si tratta.";
  if (!values.message?.trim()) {
    errors.message = "Il messaggio è vuoto.";
  } else if (values.message.trim().length < 20) {
    errors.message = "Aggiungi qualche dettaglio in più, almeno 20 caratteri.";
  }
  return errors;
}

const INFO = [
  { Icon: EnvelopeSimpleIcon, label: "Email", value: CONTACT.email },
  { Icon: ClockIcon, label: "Tempi di risposta", value: CONTACT.responseTime },
  { Icon: CompassIcon, label: "Disponibilità", value: CONTACT.availability },
];

export default function Contact() {
  const formRef = useRef(null);
  const [status, setStatus] = useState("idle"); // idle | sending | sent | error
  const [errors, setErrors] = useState({});

  const inputStyle = {
    background: "var(--fb-bg)",
    borderColor: "var(--fb-line-strong)",
    color: "var(--fb-ink)",
  };
  const inputClass =
    "w-full rounded-[var(--fb-r-sm)] border px-4 py-3 text-sm outline-none transition-colors duration-200 placeholder:text-[var(--fb-ink-3)] focus:border-[var(--fb-accent)]";

  const handleSubmit = (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.target).entries());
    const found = validate(data);
    setErrors(found);

    if (Object.keys(found).length > 0) {
      const first = document.getElementById(Object.keys(found)[0]);
      first?.focus();
      return;
    }

    setStatus("sending");
    emailjs
      .sendForm(SERVICE_ID, TEMPLATE_ID, event.target, PUBLIC_KEY)
      .then(() => {
        setStatus("sent");
        formRef.current?.reset();
        toast.success("Messaggio inviato. Ti rispondo presto.");
      })
      .catch(() => {
        setStatus("error");
        toast.error("Invio non riuscito. Riprova tra poco.");
      });
  };

  return (
    <section id="contatti" className="scroll-mt-24 px-5 py-24 sm:px-8 lg:py-32">
      <Toaster position="bottom-right" />

      <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-5">
          <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl lg:text-5xl">
            Raccontami cosa ti serve
          </h2>
          <p
            className="mt-5 max-w-[50ch] text-lg leading-relaxed"
            style={{ color: "var(--fb-ink-2)" }}
          >
            Anche solo due righe. Se il progetto non fa per me te lo dico subito
            e ti indirizzo altrove.
          </p>

          <dl className="mt-12 space-y-7">
            {INFO.map(({ Icon, label, value }) => (
              <div key={label} className="flex items-start gap-4">
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--fb-r-sm)]"
                  style={{
                    background: "var(--fb-accent-soft)",
                    color: "var(--fb-accent)",
                  }}
                >
                  <Icon size={18} weight="duotone" />
                </span>
                <div>
                  <dt className="text-xs" style={{ color: "var(--fb-ink-3)" }}>
                    {label}
                  </dt>
                  <dd className="mt-0.5 text-sm font-medium break-all">
                    {value}
                  </dd>
                </div>
              </div>
            ))}
          </dl>

          <Button asChild variant="quiet" size="fb" className="mt-10 w-full sm:w-auto">
            <a
              href={CONTACT.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
            >
              <WhatsappLogoIcon size={18} />
              Scrivimi su WhatsApp
            </a>
          </Button>

          <div className="mt-8 flex gap-2">
            <a
              href={CONTACT.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Profilo LinkedIn di Federico Bellezza"
              className="flex h-10 w-10 items-center justify-center rounded-[var(--fb-r-sm)] border transition-colors duration-200"
              style={{ borderColor: "var(--fb-line)", color: "var(--fb-ink-2)" }}
            >
              <LinkedinLogoIcon size={18} />
            </a>
            <a
              href={CONTACT.github}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Profilo GitHub di Federico Bellezza"
              className="flex h-10 w-10 items-center justify-center rounded-[var(--fb-r-sm)] border transition-colors duration-200"
              style={{ borderColor: "var(--fb-line)", color: "var(--fb-ink-2)" }}
            >
              <GithubLogoIcon size={18} />
            </a>
          </div>
        </div>

        <div className="lg:col-span-7">
          <div
            className="rounded-[var(--fb-r-lg)] border p-7 sm:p-10"
            style={{
              background: "var(--fb-surface)",
              borderColor: "var(--fb-line)",
            }}
          >
            {status === "sent" ? (
              <div className="py-10 text-center">
                <CheckCircleIcon
                  size={44}
                  weight="duotone"
                  className="mx-auto"
                  style={{ color: "var(--fb-accent)" }}
                />
                <h3 className="mt-5 text-xl font-semibold tracking-tight">
                  Messaggio ricevuto
                </h3>
                <p
                  className="mx-auto mt-3 max-w-[40ch] text-sm leading-relaxed"
                  style={{ color: "var(--fb-ink-2)" }}
                >
                  Ti rispondo entro 24-48 ore. Se hai fretta, WhatsApp è più
                  veloce.
                </p>
                <Button
                  variant="quiet"
                  size="fb"
                  className="mt-7"
                  onClick={() => setStatus("idle")}
                >
                  Scrivi un altro messaggio
                </Button>
              </div>
            ) : (
              <form ref={formRef} onSubmit={handleSubmit} noValidate>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  {FIELDS.map((field) => (
                    <div
                      key={field.name}
                      className={field.full ? "sm:col-span-2" : undefined}
                    >
                      <label
                        htmlFor={field.name}
                        className="mb-2 block text-sm font-medium"
                      >
                        {field.label}
                      </label>
                      <input
                        id={field.name}
                        name={field.name}
                        type={field.type}
                        autoComplete={field.autoComplete}
                        aria-invalid={Boolean(errors[field.name])}
                        aria-describedby={
                          errors[field.name] ? `${field.name}-error` : undefined
                        }
                        className={inputClass}
                        style={{
                          ...inputStyle,
                          borderColor: errors[field.name]
                            ? "var(--fb-danger)"
                            : inputStyle.borderColor,
                        }}
                      />
                      {errors[field.name] && (
                        <p
                          id={`${field.name}-error`}
                          className="mt-2 flex items-center gap-1.5 text-xs"
                          style={{ color: "var(--fb-danger)" }}
                        >
                          <WarningCircleIcon size={13} weight="fill" />
                          {errors[field.name]}
                        </p>
                      )}
                    </div>
                  ))}

                  <div className="sm:col-span-2">
                    <label
                      htmlFor="message"
                      className="mb-2 block text-sm font-medium"
                    >
                      Messaggio
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      rows={6}
                      aria-invalid={Boolean(errors.message)}
                      aria-describedby={
                        errors.message ? "message-error" : undefined
                      }
                      className={`${inputClass} resize-none`}
                      style={{
                        ...inputStyle,
                        borderColor: errors.message
                          ? "var(--fb-danger)"
                          : inputStyle.borderColor,
                      }}
                    />
                    {errors.message && (
                      <p
                        id="message-error"
                        className="mt-2 flex items-center gap-1.5 text-xs"
                        style={{ color: "var(--fb-danger)" }}
                      >
                        <WarningCircleIcon size={13} weight="fill" />
                        {errors.message}
                      </p>
                    )}
                  </div>
                </div>

                {status === "error" && (
                  <p
                    role="alert"
                    className="mt-6 flex items-center gap-2 rounded-[var(--fb-r-sm)] px-4 py-3 text-sm"
                    style={{ background: "var(--fb-danger-soft)", color: "var(--fb-danger-ink)" }}
                  >
                    <WarningCircleIcon size={16} weight="fill" />
                    Invio non riuscito. Riprova, oppure scrivimi su WhatsApp.
                  </p>
                )}

                <Button
                  type="submit"
                  variant="accent"
                  size="fb"
                  disabled={status === "sending"}
                  className="mt-7 w-full"
                >
                  {status === "sending" ? (
                    <>
                      <SpinnerGapIcon size={17} className="animate-spin" />
                      Invio in corso
                    </>
                  ) : (
                    <>
                      <PaperPlaneTiltIcon size={17} />
                      Invia messaggio
                    </>
                  )}
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
