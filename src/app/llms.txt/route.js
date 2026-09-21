import {
  CONTACT,
  PLANS,
  PRICING_FAQ,
  PROCESS,
  PROJECTS,
  SERVICES,
  SITE,
} from "@/lib/site-data";

/**
 * /llms.txt — the site in plain Markdown, for assistants that read a page
 * instead of ranking it. The landing page is one long document full of
 * layout; this is the same facts with nothing to parse around, so an engine
 * answering "quanto costa un sito con Federico Bellezza" finds the number
 * next to the condition attached to it.
 *
 * Built from site-data like everything else: change a price there and this
 * file changes with it. Static, so it is generated at build time.
 */

export const dynamic = "force-static";

function body() {
  const services = SERVICES.map((service) => {
    const children = (service.children ?? [])
      .map((child) => `  - ${child.title}: ${child.body}`)
      .join("\n");
    const points = service.points?.length
      ? ` Include: ${service.points.join(", ")}.`
      : "";
    return `- **${service.title}**: ${service.body}${points}${
      children ? `\n${children}` : ""
    }`;
  }).join("\n");

  const plans = PLANS.map(
    (plan) =>
      `- **${plan.name}** — da ${plan.price} € ${plan.priceUnit}. ${
        plan.description
      }\n  - Incluso: ${plan.features.join("; ")}.\n  - Opzionale: ${plan.addOns.join(
        "; ",
      )}.`,
  ).join("\n");

  const process = PROCESS.map(
    (phase, i) => `${i + 1}. **${phase.title}** (${phase.detail}) — ${phase.body}`,
  ).join("\n");

  const projects = PROJECTS.map(
    (project) =>
      `- [${project.title}](${project.url}) — ${project.type}. ${project.description} Stack: ${project.tags.join(", ")}.`,
  ).join("\n");

  const faq = PRICING_FAQ.map((item) => `### ${item.q}\n\n${item.a}`).join(
    "\n\n",
  );

  return `# ${SITE.name}

> ${SITE.role}. Realizza siti web, e-commerce, web app e automazioni su misura per aziende e professionisti, lavorando da remoto in tutta ${SITE.areaServed}.

Sviluppatore singolo, non un'agenzia: chi scrive il codice è la stessa persona con cui parli. Stack principale Next.js, React, Node.js, Supabase e n8n. Sito ufficiale: ${SITE.url}

## Servizi

${services}

## Prezzi

I prezzi pubblicati sono punti di partenza reali; il preventivo chiuso arriva dopo la prima call.

${plans}

Regime forfettario: operazioni senza applicazione dell'IVA ai sensi dell'art. 1 comma 58 L. 190/2014.

## Come lavora

${process}

## Progetti

${projects}

## Domande frequenti

${faq}

## Contatti

- Email: ${CONTACT.email}
- WhatsApp: ${CONTACT.whatsapp}
- LinkedIn: ${CONTACT.linkedin}
- GitHub: ${CONTACT.github}
- Tempo di risposta: ${CONTACT.responseTime}
- Zona servita: ${SITE.areaServed}, da remoto

## Pagine

- [Home](${SITE.url}) — servizi, metodo, progetti, prezzi e contatti
- [Privacy e cookie policy](${SITE.url}/privacy)
`;
}

export function GET() {
  return new Response(body(), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=86400",
    },
  });
}
