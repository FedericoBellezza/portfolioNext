"use client";

import { useRef, useState } from "react";
import emailjs from "@emailjs/browser";
import toast, { Toaster } from "react-hot-toast";
import {
  PaperPlaneTiltIcon,
  SpinnerGapIcon,
  EnvelopeSimpleIcon,
  WhatsappLogoIcon,
  GithubLogoIcon,
  LinkedinLogoIcon,
  CheckCircleIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { CONTACT, CTA, NEEDS, NEXT_STEPS } from "@/lib/site-data";

const SERVICE_ID = "service_n4qr5hq";
const TEMPLATE_ID = "template_gdpzsbm";
const PUBLIC_KEY = "XsBnVOzYdqoFAgYBB";

// Field names are unchanged: the EmailJS template maps onto them.
// `object` is now picked from NEEDS instead of typed, same field name.
const FIELDS = [
  { name: "from_name", label: "Nome", type: "text", autoComplete: "name" },
  { name: "from_email", label: "Email", type: "email", autoComplete: "email" },
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
  if (!values.object) errors.object = "Scegli l'opzione più vicina, anche indicativa.";
  if (!values.message?.trim()) {
    errors.message = "Il messaggio è vuoto.";
  } else if (values.message.trim().length < 10) {
    errors.message = "Aggiungi qualche parola in più.";
  }
  return errors;
}

function FieldError({ id, text }) {
  if (!text) return null;
  return (
    <p
      id={id}
      className="mt-2 flex items-center gap-1.5 text-xs"
      style={{ color: "var(--fb-danger)" }}
    >
      <WarningCircleIcon size={13} weight="fill" />
      {text}
    </p>
  );
}

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
      const key = Object.keys(found)[0];
      const first =
        document.getElementById(key) ??
        document.querySelector(`input[name="${key}"]`);
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
            Raccontami dove perdi tempo
          </h2>
          <p
            className="mt-5 max-w-[50ch] text-lg leading-relaxed"
            style={{ color: "var(--fb-ink-2)" }}
          >
            Bastano due righe. Se il progetto non fa per me te lo dico subito e
            ti indirizzo altrove.
          </p>

          <h3 className="mt-12 text-sm font-semibold">Cosa succede dopo</h3>
          <ol className="mt-5 space-y-4">
            {NEXT_STEPS.map((step, index) => (
              <li key={step} className="flex items-start gap-4">
                <span
                  className="fb-nums flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--fb-r-sm)] text-sm font-semibold"
                  style={{
                    background: "var(--fb-accent-soft)",
                    color: "var(--fb-accent)",
                  }}
                >
                  {index + 1}
                </span>
                <span className="pt-1 text-sm leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>

          <div
            className="mt-10 border-t pt-8"
            style={{ borderColor: "var(--fb-line)" }}
          >
            <p className="text-sm" style={{ color: "var(--fb-ink-2)" }}>
              Preferisci scrivere direttamente?
            </p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <Button asChild variant="quiet" size="fb">
                <a href={CONTACT.whatsapp} target="_blank" rel="noopener noreferrer">
                  <WhatsappLogoIcon size={18} />
                  {CTA.whatsapp}
                </a>
              </Button>
              <Button asChild variant="quiet" size="fb">
                <a href={`mailto:${CONTACT.email}`}>
                  <EnvelopeSimpleIcon size={18} />
                  Email
                </a>
              </Button>
            </div>

            <div className="mt-6 flex gap-2">
              <a
                href={CONTACT.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Profilo LinkedIn di Federico Bellezza"
                className="flex h-10 w-10 items-center justify-center rounded-[var(--fb-r-sm)] border transition-colors duration-200 hover:bg-[var(--fb-surface-2)]"
                style={{ borderColor: "var(--fb-line)", color: "var(--fb-ink-2)" }}
              >
                <LinkedinLogoIcon size={18} />
              </a>
              <a
                href={CONTACT.github}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Profilo GitHub di Federico Bellezza"
                className="flex h-10 w-10 items-center justify-center rounded-[var(--fb-r-sm)] border transition-colors duration-200 hover:bg-[var(--fb-surface-2)]"
                style={{ borderColor: "var(--fb-line)", color: "var(--fb-ink-2)" }}
              >
                <GithubLogoIcon size={18} />
              </a>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7">
          <div
            className="rounded-[var(--fb-r-lg)] border p-7 sm:p-10"
            style={{
              background: "var(--fb-surface)",
              borderColor: "var(--fb-line)",
              boxShadow: "var(--fb-shadow)",
            }}
          >
            {status === "sent" ? (
              <div className="py-10 text-center" role="status">
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
                  Ti rispondo entro 24-48 ore per fissare la call. Se hai
                  fretta, WhatsApp è più veloce.
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
                    <div key={field.name}>
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
                      <FieldError
                        id={`${field.name}-error`}
                        text={errors[field.name]}
                      />
                    </div>
                  ))}

                  <fieldset
                    className="sm:col-span-2"
                    aria-describedby={errors.object ? "object-error" : undefined}
                  >
                    <legend className="mb-3 block text-sm font-medium">
                      Di cosa hai bisogno?
                    </legend>
                    <div className="flex flex-wrap gap-2">
                      {NEEDS.map((need) => (
                        <label key={need} className="cursor-pointer">
                          <input
                            type="radio"
                            name="object"
                            value={need}
                            className="peer sr-only"
                            onChange={() =>
                              setErrors((prev) => ({ ...prev, object: undefined }))
                            }
                          />
                          <span
                            className={`inline-flex items-center rounded-[var(--fb-r-sm)] border px-3.5 py-2 text-sm transition-colors duration-200 hover:border-[var(--fb-ink-3)] peer-checked:border-[var(--fb-accent)] peer-checked:bg-[var(--fb-accent-soft)] peer-checked:text-[var(--fb-accent)] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--fb-accent)] ${
                              errors.object
                                ? "border-[var(--fb-danger)]"
                                : "border-[var(--fb-line-strong)]"
                            }`}
                          >
                            {need}
                          </span>
                        </label>
                      ))}
                    </div>
                    <FieldError id="object-error" text={errors.object} />
                  </fieldset>

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
                      rows={5}
                      placeholder="Es. ogni settimana passiamo mezza giornata a copiare gli ordini dal sito al gestionale."
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
                    <FieldError id="message-error" text={errors.message} />
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
                      {CTA.contact}
                    </>
                  )}
                </Button>
                <p
                  className="mt-4 text-center text-xs"
                  style={{ color: "var(--fb-ink-3)" }}
                >
                  Gratis e senza impegno. Uso i tuoi dati solo per risponderti.
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
