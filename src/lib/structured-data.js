import {
  CONTACT,
  PLANS,
  PRICING_FAQ,
  PROJECTS,
  SERVICES,
  SITE,
} from "./site-data";

/**
 * The JSON-LD graph, built from site-data so the markup can never drift from
 * the copy on screen. Prices, services, projects and FAQ answers are written
 * once and read by both the page and the crawlers.
 *
 * Split in two on purpose: the entities that describe the business are true on
 * every route and live in the root layout, while the ones that describe the
 * landing page itself (its FAQ, its project list) belong to that page only.
 * Declaring an FAQPage on /privacy would be a lie to anything reading it.
 */

const ID = {
  person: `${SITE.url}/#person`,
  website: `${SITE.url}/#website`,
  service: `${SITE.url}/#service`,
  webpage: `${SITE.url}/#webpage`,
  faq: `${SITE.url}/#faq`,
  projects: `${SITE.url}/#progetti`,
};

const abs = (path) => `${SITE.url}${path}`;

// "3.500" is how the price reads on screen; schema.org wants 3500.
const numericPrice = (price) => price.replace(/[^\d]/g, "");

const AREA_SERVED = {
  "@type": "Country",
  name: SITE.areaServed,
};

const SERVICE_TYPES = [
  "Sviluppo siti web",
  "Sviluppo e-commerce",
  "Sviluppo web app e MVP",
  "Automazione dei processi aziendali",
  "Integrazione AI",
];

function offerCatalog() {
  return {
    "@type": "OfferCatalog",
    name: "Servizi di sviluppo web e automazione",
    itemListElement: PLANS.map((plan) => ({
      "@type": "Offer",
      name: plan.name,
      description: plan.description,
      availability: "https://schema.org/InStock",
      areaServed: AREA_SERVED,
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: numericPrice(plan.price),
        minPrice: numericPrice(plan.price),
        priceCurrency: "EUR",
        // Flat-rate regime: the FAQ explains why no VAT is charged.
        valueAddedTaxIncluded: false,
        unitText: plan.priceUnit.replace(/^a\s+/, ""),
      },
      itemOffered: {
        "@type": "Service",
        name: plan.name,
        description: plan.description,
        provider: { "@id": ID.person },
        areaServed: AREA_SERVED,
      },
    })),
  };
}

/** Person, WebSite and the service itself: true on every page of the site. */
export function siteGraph() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Person",
        "@id": ID.person,
        name: SITE.name,
        url: SITE.url,
        image: abs("/foto-profilo.jpg"),
        jobTitle: "Full Stack Developer & Automation Specialist",
        description:
          "Sviluppatore web freelance specializzato in siti web, e-commerce, web app e automazioni per aziende e professionisti, in tutta Italia e da remoto.",
        email: CONTACT.email,
        telephone: CONTACT.phone,
        knowsLanguage: ["it", "en"],
        sameAs: [CONTACT.github, CONTACT.linkedin],
        knowsAbout: [
          "Next.js",
          "React",
          "Node.js",
          "Supabase",
          "n8n",
          "Web Development",
          "E-Commerce",
          "Business Automation",
          "AI Integration",
        ],
        worksFor: { "@id": ID.service },
      },
      {
        "@type": "WebSite",
        "@id": ID.website,
        url: SITE.url,
        name: SITE.name,
        description:
          "Siti web, e-commerce, web app e automazioni su misura per aziende e professionisti italiani.",
        publisher: { "@id": ID.person },
        inLanguage: SITE.lang,
      },
      {
        "@type": "ProfessionalService",
        "@id": ID.service,
        name: `${SITE.name}, sviluppo web e automazioni`,
        alternateName: "Federico Bellezza Web Developer",
        url: SITE.url,
        image: abs("/foto-profilo.jpg"),
        description:
          "Realizzo siti web, e-commerce, web app e automazioni su misura per aziende e professionisti italiani. Lavoro da remoto per clienti in tutta Italia.",
        founder: { "@id": ID.person },
        provider: { "@id": ID.person },
        email: CONTACT.email,
        telephone: CONTACT.phone,
        priceRange: "€€",
        currenciesAccepted: "EUR",
        // No storefront and no office: the service area is the country, which
        // is also why there is no PostalAddress in this node.
        areaServed: AREA_SERVED,
        serviceArea: AREA_SERVED,
        availableLanguage: { "@type": "Language", name: "Italian" },
        serviceType: SERVICE_TYPES,
        knowsAbout: SERVICES.map((service) => service.title),
        contactPoint: {
          "@type": "ContactPoint",
          contactType: "sales",
          email: CONTACT.email,
          telephone: CONTACT.phone,
          areaServed: SITE.areaServedCode,
          availableLanguage: ["Italian"],
        },
        hasOfferCatalog: offerCatalog(),
      },
    ],
  };
}

/**
 * The landing page: what it is about, the questions it answers and the work it
 * shows. Generative engines quote answers far more readily when the question
 * they match is marked up as one.
 */
export function homeGraph() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": ID.webpage,
        url: SITE.url,
        name: `${SITE.name} | Sviluppatore Web & Automazioni`,
        description:
          "Sviluppatore web freelance in Italia: siti, e-commerce, web app e automazioni n8n su misura, con preventivo chiuso dopo la prima call.",
        isPartOf: { "@id": ID.website },
        about: { "@id": ID.person },
        primaryImageOfPage: abs("/foto-profilo.jpg"),
        inLanguage: SITE.lang,
        // Named so an engine can link a claim to the section it came from.
        hasPart: [{ "@id": ID.faq }, { "@id": ID.projects }],
        mainEntity: { "@id": ID.service },
      },
      {
        "@type": "FAQPage",
        "@id": ID.faq,
        name: "Domande frequenti su costi, tempi e proprietà del progetto",
        isPartOf: { "@id": ID.webpage },
        inLanguage: SITE.lang,
        mainEntity: PRICING_FAQ.map((item) => ({
          "@type": "Question",
          name: item.q,
          acceptedAnswer: {
            "@type": "Answer",
            text: item.a,
          },
        })),
      },
      {
        "@type": "ItemList",
        "@id": ID.projects,
        name: "Progetti realizzati da Federico Bellezza",
        numberOfItems: PROJECTS.length,
        itemListOrder: "https://schema.org/ItemListOrderDescending",
        isPartOf: { "@id": ID.webpage },
        itemListElement: PROJECTS.map((project, index) => ({
          "@type": "ListItem",
          position: index + 1,
          item: {
            "@type":
              project.type === "Web app" ? "WebApplication" : "WebSite",
            name: project.title,
            description: project.description,
            url: project.url,
            image: abs(project.image),
            inLanguage: SITE.lang,
            creator: { "@id": ID.person },
            ...(project.type === "Web app"
              ? { applicationCategory: "BusinessApplication" }
              : null),
            keywords: project.tags.join(", "),
          },
        })),
      },
    ],
  };
}
