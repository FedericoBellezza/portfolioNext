import Link from "next/link";
import {
  GithubLogoIcon,
  LinkedinLogoIcon,
  EnvelopeSimpleIcon,
} from "@phosphor-icons/react/dist/ssr";
import { NAV_LINKS, CONTACT } from "@/lib/site-data";

const SOCIALS = [
  { href: CONTACT.linkedin, Icon: LinkedinLogoIcon, label: "LinkedIn" },
  { href: CONTACT.github, Icon: GithubLogoIcon, label: "GitHub" },
  { href: `mailto:${CONTACT.email}`, Icon: EnvelopeSimpleIcon, label: "Email" },
];

export default function SiteFooter() {
  return (
    <footer
      className="border-t px-5 py-14 sm:px-8"
      style={{ borderColor: "var(--fb-line)" }}
    >
      <div className="mx-auto max-w-[1400px]">
        <div className="flex flex-col gap-10 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="font-mono text-[15px] font-medium tracking-tight">
              federico<span style={{ color: "var(--fb-accent)" }}>.</span>
              bellezza
            </p>
            <p
              className="mt-2 max-w-[38ch] text-sm leading-relaxed"
              style={{ color: "var(--fb-ink-2)" }}
            >
              Sviluppo web e automazioni per aziende e professionisti in Italia.
            </p>
          </div>

          <nav
            aria-label="Footer"
            className="flex flex-wrap gap-x-6 gap-y-3 sm:gap-x-8"
          >
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm transition-colors duration-200"
                style={{ color: "var(--fb-ink-2)" }}
              >
                {link.label}
              </a>
            ))}
          </nav>

          <ul className="flex gap-2">
            {SOCIALS.map(({ href, Icon, label }) => (
              <li key={label}>
                <a
                  href={href}
                  target={href.startsWith("mailto:") ? undefined : "_blank"}
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="flex h-10 w-10 items-center justify-center rounded-[var(--fb-r-sm)] border transition-colors duration-200"
                  style={{
                    borderColor: "var(--fb-line)",
                    color: "var(--fb-ink-2)",
                  }}
                >
                  <Icon size={18} />
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div
          className="mt-12 flex flex-col gap-3 border-t pt-7 sm:flex-row sm:items-center sm:justify-between"
          style={{ borderColor: "var(--fb-line)" }}
        >
          <p className="text-xs" style={{ color: "var(--fb-ink-3)" }}>
            &copy; {new Date().getFullYear()} Federico Bellezza. Tutti i diritti
            riservati.
          </p>
          <div className="flex gap-5">
            <Link
              href="/privacy"
              className="text-xs"
              style={{ color: "var(--fb-ink-3)" }}
            >
              Privacy policy
            </Link>
            <Link
              href="/privacy#cookie"
              className="text-xs"
              style={{ color: "var(--fb-ink-3)" }}
            >
              Cookie policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
