import {
  ABOUT,
  CONTACT,
  HERO,
  PLANS,
  PRICING_FAQ,
  PROJECTS,
  SEO,
  SERVICES,
  SITE,
  STACK,
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
  logo: `${SITE.url}/#logo`,
  webpage: `${SITE.url}/#webpage`,
  // These two match real element ids on the page, so a link to the @id
  // lands on the section it describes.
  faq: `${SITE.url}/#faq`,
  projects: `${SITE.url}/#progetti`,
};

const abs = (path) => `${SITE.url}${path}`;

// "3.500" is how the price reads on screen; schema.org wants 3500.
const numericPrice = (price) => price.replace(/[^\d]/g, "");

/**
 * Serialises a graph for a <script type="application/ld+json"> tag. "<" is
 * escaped so a "</script>" inside any string can never close the tag early.
 */
export function jsonLd(graph) {
  return JSON.stringify(graph).replace(/</g, "\\u003c");
}

const AREA_SERVED = {
  "@type": "Country",
  name: SITE.areaServed,
};

const SAME_AS = [CONTACT.linkedin, CONTACT.github];

// One sentence that answers "who is this and what does he do", reused by the
// Person and the business so engines read the same claim twice, not two.
const SUMMARY =
  "Sviluppatore web freelance italiano: automazioni dei processi con n8n, assistenti AI, siti web e software su misura per PMI e professionisti, da remoto in tutta Italia.";

const SERVICE_TYPES = [
  "Automazione dei processi aziendali",
  "Integrazione AI e assistenti AI",
  "Sviluppo siti web",
  "Sviluppo e-commerce",
  "Sviluppo web app e gestionali",
];

function offerCatalog() {
  return {
    "@type": "OfferCatalog",
    name: "Servizi di sviluppo web, automazione e AI",
    itemListElement: PLANS.map((plan) => ({
      "@type": "Offer",
      name: plan.name,
      description: plan.description,
      availability: "https://schema.org/InStock",
      areaServed: AREA_SERVED,
      // A plan quoted only after the analysis publishes no price at all:
      // an invented number would contradict the page.
      ...(plan.price
        ? {
            priceSpecification: {
              "@type": "UnitPriceSpecification",
              price: numericPrice(plan.price),
              minPrice: numericPrice(plan.price),
              priceCurrency: "EUR",
              // Flat-rate regime: the FAQ explains why no VAT is charged.
              valueAddedTaxIncluded: false,
              unitText: plan.priceUnit.replace(/^a\s+/, ""),
            },
          }
        : null),
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

/** One Service node per card in the "servizi" section, problem included. */
function services() {
  return SERVICES.map((service) => ({
    "@type": "Service",
    "@id": `${SITE.url}/#servizio-${service.id}`,
    name: service.label,
    description: `${service.body} Esempio: ${service.example}`,
    provider: { "@id": ID.person },
    areaServed: AREA_SERVED,
    availableChannel: {
      "@type": "ServiceChannel",
      serviceUrl: `${SITE.url}/#servizi`,
      availableLanguage: { "@type": "Language", name: "Italian" },
    },
  }));
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
        givenName: "Federico",
        familyName: "Bellezza",
        url: SITE.url,
        image: {
          "@type": "ImageObject",
          url: abs(ABOUT.photo.src),
          caption: ABOUT.photo.alt,
        },
        jobTitle: SITE.role,
        description: SUMMARY,
        email: CONTACT.email,
        telephone: CONTACT.phone,
        knowsLanguage: ["it", "en"],
        sameAs: SAME_AS,
        knowsAbout: [
          ...STACK.map((tech) => tech.name),
          "Automazione dei processi aziendali",
          "Intelligenza artificiale generativa",
          "Assistenti AI e RAG",
          "OpenAI API",
          "Anthropic Claude API",
          "Sviluppo web",
          "E-commerce",
        ],
        worksFor: { "@id": ID.service },
      },
      {
        "@type": "WebSite",
        "@id": ID.website,
        url: SITE.url,
        name: SITE.name,
        alternateName: "federicobellezza.dev",
        description: SEO.description,
        publisher: { "@id": ID.person },
        inLanguage: SITE.lang,
      },
      {
        "@type": "ProfessionalService",
        "@id": ID.service,
        name: `${SITE.name}, sviluppo web, automazioni e AI`,
        alternateName: "Federico Bellezza Web Developer",
        url: SITE.url,
        logo: {
          "@type": "ImageObject",
          "@id": ID.logo,
          url: abs("/logo.svg"),
          contentUrl: abs("/logo.svg"),
          caption: SITE.name,
        },
        image: abs(ABOUT.photo.src),
        description: SUMMARY,
        slogan: `${HERO.headline.lead} ${HERO.headline.accent}`,
        founder: { "@id": ID.person },
        provider: { "@id": ID.person },
        employee: { "@id": ID.person },
        email: CONTACT.email,
        telephone: CONTACT.phone,
        sameAs: SAME_AS,
        priceRange: "€€",
        currenciesAccepted: "EUR",
        // No storefront and no office: the service area is the country, which
        // is also why there is no PostalAddress in this node.
        areaServed: AREA_SERVED,
        serviceArea: AREA_SERVED,
        availableLanguage: { "@type": "Language", name: "Italian" },
        serviceType: SERVICE_TYPES,
        knowsAbout: SERVICES.map((service) => service.label),
        contactPoint: {
          "@type": "ContactPoint",
          contactType: "sales",
          email: CONTACT.email,
          telephone: CONTACT.phone,
          url: `${SITE.url}/#contatti`,
          areaServed: SITE.areaServedCode,
          availableLanguage: ["Italian"],
        },
        makesOffer: services().map((service) => ({
          "@type": "Offer",
          itemOffered: { "@id": service["@id"] },
        })),
        hasOfferCatalog: offerCatalog(),
      },
      ...services(),
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
        name: SEO.title,
        description: SEO.description,
        isPartOf: { "@id": ID.website },
        about: [{ "@id": ID.service }, { "@id": ID.person }],
        mainEntity: { "@id": ID.service },
        primaryImageOfPage: {
          "@type": "ImageObject",
          url: abs(HERO.shots[0].src),
          caption: HERO.shots[0].alt,
        },
        inLanguage: SITE.lang,
        // The page is static, so this is the date of the last deploy: the
        // closest honest answer to "how fresh is this" an engine can get.
        dateModified: new Date().toISOString(),
        // Named so an engine can link a claim to the section it came from.
        hasPart: [{ "@id": ID.faq }, { "@id": ID.projects }],
      },
      {
        "@type": "FAQPage",
        "@id": ID.faq,
        name: "Domande frequenti su costi, tempi, dati e proprietà del progetto",
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
        isPartOf: { "@id": ID.webpage },
        itemListElement: PROJECTS.map((project, index) => ({
          "@type": "ListItem",
          position: index + 1,
          item: {
            "@type": project.appCategory ? "WebApplication" : "WebSite",
            name: project.title,
            description: project.description,
            url: project.url,
            image: abs(project.image),
            inLanguage: SITE.lang,
            creator: { "@id": ID.person },
            ...(project.appCategory
              ? {
                  applicationCategory: project.appCategory,
                  operatingSystem: "Web",
                }
              : null),
            ...(project.status ? { creativeWorkStatus: project.status } : null),
            keywords: project.tags.join(", "),
          },
        })),
      },
    ],
  };
}
