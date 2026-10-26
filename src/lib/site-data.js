/**
 * Single source of truth for every piece of landing-page content.
 * Edit text here, never inside the section components.
 *
 * Who reads this page: owners and managers of Italian SMBs, most of them
 * arriving from a direct message. They think in problems and hours lost, not
 * in frameworks, so the copy leads with their situation and keeps the stack
 * for the people who ask about it.
 */

/**
 * Identity of the site itself. Metadata, sitemap, robots, llms.txt and the
 * JSON-LD graph all read from here, so the canonical host is written once.
 */
export const SITE = {
  url: "https://federicobellezza.dev",
  name: "Federico Bellezza",
  role: "Sviluppatore web freelance e specialista di automazioni",
  locale: "it_IT",
  lang: "it-IT",
  // No office is declared anywhere on the site: the work is remote and the
  // service area is the whole country. Schema and copy must agree on this.
  areaServed: "Italia",
  areaServedCode: "IT",
};

export const CONTACT = {
  email: "federico.bellezza.dev@gmail.com",
  // Same number behind the WhatsApp link, in E.164 for schema.org.
  phone: "+393314508880",
  whatsapp:
    "https://wa.me/393314508880?text=Ciao%20Federico%2C%20sono%20passato%20dal%20tuo%20sito%2C%20ti%20scrivo%20per%20",
  linkedin: "https://www.linkedin.com/in/federicobellezzadev/",
  github: "https://github.com/FedericoBellezza",
  responseTime: "Entro 24-48 ore",
  availability: "Da remoto, in tutta Italia",
};

/**
 * One label per intent. The whole page reuses these strings so there is
 * never a "Contattami" next to a "Parliamone" next to a "Scrivimi".
 * The contact CTA names what the visitor gets (a free call), and says
 * "richiedi" because it opens a form, not a calendar.
 */
export const CTA = {
  contact: "Richiedi una call gratuita",
  work: "Vedi i progetti",
  whatsapp: "Scrivimi su WhatsApp",
};

export const NAV_LINKS = [
  { label: "Servizi", href: "#servizi" },
  { label: "Progetti", href: "#progetti" },
  { label: "Metodo", href: "#metodo" },
  { label: "Prezzi", href: "#prezzi" },
];

export const HERO = {
  eyebrow: "Sviluppatore freelance per PMI",
  // Split so the accent can sit on the benefit, not on the problem.
  headline: {
    lead: "Meno lavoro ripetitivo,",
    accent: "più tempo per i tuoi clienti.",
  },
  sub: "Automazioni, AI e software su misura che lavorano con gli strumenti che usi già. Un solo interlocutore, preventivo chiuso.",
  // Real screenshots of shipped work stand where the portrait used to be:
  // proof that the page is about results, not about the person.
  shots: [
    {
      src: "/ai-bandi-screenshot.png",
      alt: "AI.Bandi, piattaforma che abbina le aziende ai bandi pubblici",
      width: 1900,
      height: 908,
    },
    {
      src: "/alma-screenshot.png",
      alt: "Alma, assistente nutrizionale con intelligenza artificiale",
      width: 1900,
      height: 934,
    },
  ],
};

/**
 * Hard facts, directly under the hero. Every number here is a commitment
 * also written in the process and in the FAQ, so they can never disagree.
 */
export const PROOF = [
  { value: "30 min", label: "di call gratuita per capire se e come posso aiutarti" },
  { value: "3 giorni", label: "per ricevere un preventivo scritto, con una cifra sola" },
  { value: "2-6 sett.", label: "dalla firma alla messa online, per la maggior parte dei progetti" },
  { value: "30 giorni", label: "di assistenza inclusa dopo il rilascio" },
];

/**
 * Services, written as the problem the visitor recognises.
 * `label` is the service name (also used by schema.org and llms.txt),
 * `title` is the situation, `body` the fix, `example` one concrete case.
 * `tone` drives surface variation, `area` the asymmetric desktop grid.
 */
export const SERVICES = [
  {
    id: "automation",
    label: "Automazione dei processi",
    title: "Copiate gli stessi dati in tre programmi diversi.",
    body: "Collego gestionale, CRM, fogli Excel ed email con workflow n8n. Il dato si inserisce una volta e arriva ovunque serva, senza errori di battitura.",
    example: "Un ordine online crea il cliente, prepara la fattura e avvisa il magazzino.",
    tone: "dots",
    area: "lg:col-span-7",
  },
  {
    id: "ai",
    label: "Assistenti AI",
    title: "Rispondete ogni giorno alle stesse domande.",
    body: "Un assistente AI che legge i vostri documenti e risponde a clienti o colleghi citando la fonte. Le domande difficili passano a una persona.",
    example: "Un assistente interno su manuali, listini e procedure.",
    tone: "accent",
    area: "lg:col-span-5",
  },
  {
    id: "documents",
    label: "AI sui documenti",
    title: "Preventivi e report vi portano via ore.",
    body: "Li preparo in automatico a partire dai vostri dati e dai vostri modelli. Voi controllate, correggete se serve e inviate.",
    example: "Il report vendite della settimana pronto il lunedì mattina.",
    tone: "plain",
    area: "lg:col-span-5",
  },
  {
    id: "web",
    label: "Siti web ed e-commerce",
    title: "Il sito c'è, ma non porta contatti.",
    body: "Un sito veloce, chiaro e trovato su Google, con form e WhatsApp che finiscono dritti nel vostro CRM invece che in una casella dimenticata.",
    example: "Ogni richiesta dal sito diventa un contatto da seguire.",
    tone: "plain",
    area: "lg:col-span-7",
  },
  {
    id: "software",
    label: "Software su misura",
    title: "Lo strumento che vi serve non esiste.",
    body: "Gestionali, portali clienti e web app costruiti sul vostro modo di lavorare, con accessi per ruolo e dati che restano vostri.",
    example: "Un portale dove i clienti seguono le pratiche senza telefonare.",
    tone: "muted",
    area: "lg:col-span-12",
  },
];

/**
 * Verb-first phases. No "Step 1 / Fase 2" labels.
 */
export const PROCESS = [
  {
    id: "ascolto",
    title: "Ascolto",
    body: "Una call di trenta minuti per capire il problema vero. Se non sono la persona giusta te lo dico subito.",
    detail: "Call gratuita",
  },
  {
    id: "progetto",
    title: "Progetto",
    body: "Preventivo scritto con tempi, costi e cosa resta fuori. Niente voci vaghe e niente sorprese a metà lavoro.",
    detail: "Entro 3 giorni",
  },
  {
    id: "costruisco",
    title: "Costruisco",
    body: "Sviluppo a blocchi con un link di anteprima sempre aggiornato. Vedi il lavoro crescere e correggi il tiro quando serve.",
    detail: "Anteprima live",
  },
  {
    id: "rilascio",
    title: "Rilascio",
    body: "Messa online, formazione a chi lo userà e consegna di accessi e documentazione. Poi resto raggiungibile.",
    detail: "30 giorni di assistenza",
  },
];

/**
 * Ordered by how much they say to a company: AI products first, then
 * corporate work. The first one is shown large.
 */
export const PROJECTS = [
  {
    title: "Alma",
    description:
    "Foto, voce o testo diventano un diario alimentare compilato in automatico, condiviso con il nutrizionista.",
    image: "/alma-screenshot.jpg",
    alt: "Interfaccia di Alma, assistente nutrizionale per professionisti",
    url: "https://alma-sandy.vercel.app/",
    tags: ["Next.js", "Supabase", "OpenAI", "Stripe"],
    type: "Web app con AI",
  },
  {
    title: "AI.Bandi",
    description:
      "Abbina il profilo di un'azienda ai bandi e ai finanziamenti pubblici più adatti, con suggerimenti generati dall'AI e abbonamenti gestiti in autonomia.",
    image: "/ai-bandi-screenshot.png",
    alt: "Interfaccia di AI.Bandi, ricerca di bandi e finanziamenti",
    url: "https://ai-bandi.com/",
    tags: ["Next.js", "Supabase", "OpenAI", "Stripe"],
    type: "Piattaforma SaaS con AI",
  },
  {
    title: "Knit",
    description:
      "Sito per una start-up sportiva che offre consulenza, formazione e networking ad atleti e club.",
    image: "/knit2-screenshot.png",
    alt: "Sito di Knit, consulenza e formazione per atleti e organizzazioni sportive",
    url: "https://www.knit-networks.com/",
    tags: ["Next.js", "Tailwind", "GSAP"],
    type: "Sito corporate",
  },
  {
    title: "Anduma",
    description:
      "Trasforma tappe, foto e ricordi di un viaggio in un sito con mappa da condividere.",
    image: "/anduma-screenshot.jpg",
    alt: "Interfaccia di Anduma, racconti di viaggio pubblicati come sito",
    url: "https://anduma-cyan.vercel.app/",
    tags: ["Next.js", "Supabase", "Leaflet", "Stripe"],
    type: "Web app",
  },
  {
    title: "Federica Autretto",
    description:
      "Sito per una biologa nutrizionista, pensato per trasformare le visite in richieste di appuntamento.",
    image: "/federica-autretto.com-screenshot.png",
    alt: "Sito di Federica Autretto, biologa nutrizionista",
    url: "https://federica-autretto.com/",
    tags: ["Next.js", "Tailwind", "Resend"],
    type: "Sito per professionisti",
  },
];

/**
 * Testimonials. Left empty on purpose: the section only renders once there
 * is at least one real quote with a real name. Shape:
 * { quote: "...", name: "Nome Cognome", role: "Ruolo, Azienda" }
 */
export const TESTIMONIALS = [];

export const ABOUT = {
  title: "Parli sempre con chi scrive il codice",
  body: [
    "Sono Federico, sviluppatore full stack. Niente account manager e niente passaggi di mano: la persona della prima call è la stessa che costruisce, consegna e risponde dopo.",
    "Uso strumenti diffusi e documento quello che faccio, così il progetto non dipende da me. Codice, account e dati sono intestati a te dal primo giorno.",
  ],
  photo: {
    src: "/foto-profilo.jpg",
    alt: "Federico Bellezza, sviluppatore web freelance",
  },
};

export const STACK = [
  { name: "Next.js", src: "/next.svg" },
  { name: "React", src: "/react.svg" },
  { name: "Node.js", src: "/node-js.svg" },
  { name: "n8n", src: "/n8n-logo.png" },
  { name: "Supabase", src: "/supabase.svg" },
  { name: "MySQL", src: "/mysql.svg" },
  { name: "Tailwind CSS", src: "/tailwind-css.svg" },
  { name: "Directus", src: "/directus-logo.svg" },
];

/**
 * `price: null` means there is no honest starting number to publish: the
 * card shows `priceNote` instead and schema.org gets no price for it.
 */
export const PLANS = [
  {
    id: "sito",
    name: "Sito web",
    price: "400",
    priceUnit: "a pagina",
    description:
      "Dalla singola landing page al sito multipagina, pensato per portarti contatti.",
    featured: false,
    features: [
      "Design responsive, mobile first",
      "Ottimizzazione SEO tecnica",
      "Form e WhatsApp collegati",
      "Hosting configurato",
    ],
    addOns: ["Brand identity", "CMS per i contenuti", "Analytics e cookie policy"],
  },
  {
    id: "automazioni",
    name: "Automazioni e AI",
    price: null,
    priceNote: "Prezzo chiuso dopo l'analisi",
    priceUnit: "a progetto",
    description:
      "Si parte da un'analisi gratuita dei processi: ti dico cosa conviene automatizzare e cosa no.",
    featured: true,
    badge: "Analisi gratuita",
    features: [
      "Mappa dei processi da automatizzare",
      "Workflow n8n fra i tuoi strumenti",
      "Assistenti e agenti AI sui tuoi dati",
      "Monitoraggio e avvisi se qualcosa si ferma",
    ],
    addOns: ["Manutenzione mensile", "Formazione del team"],
  },
  {
    id: "webapp",
    name: "Web app e gestionali",
    price: "3.500",
    priceUnit: "a progetto",
    description:
      "Gestionali, portali clienti e SaaS con la tua logica di business e i tuoi dati.",
    featured: false,
    features: [
      "Accessi utenti e ruoli",
      "Database e dashboard di gestione",
      "Pagamenti con Stripe",
      "API e integrazioni",
    ],
    addOns: ["Automazioni n8n", "Integrazione AI", "Manutenzione mensile"],
  },
];

export const PRICING_FAQ = [
  {
    q: "Dobbiamo cambiare i programmi che usiamo?",
    a: "Quasi mai. Parto da quello che avete già: gestionale, CRM, Excel, email. Se un programma non permette di collegarsi lo scopriamo nella prima call, prima di qualsiasi preventivo.",
  },
  {
    q: "E i dati dei nostri clienti, con l'AI?",
    a: "Decidiamo insieme quali dati può vedere ogni automazione. Uso le API di OpenAI e Anthropic, che non usano i dati inviati per addestrare i modelli, e dove serve scelgo servizi con server in Europa.",
  },
  {
    q: "Lavori da solo: e se un giorno non ci sei?",
    a: "Codice, account e documentazione sono vostri dal primo giorno. Uso strumenti molto diffusi, quindi qualsiasi altro sviluppatore può riprendere il progetto senza ripartire da zero.",
  },
  {
    q: "Perché un prezzo di partenza e non uno fisso?",
    a: "Perché due progetti simili possono costare il doppio l'uno dell'altro a seconda di cosa devono fare. Dopo la prima call ti mando un preventivo chiuso, con una cifra sola e nessuna voce a sorpresa.",
  },
  {
    q: "Quanto tempo serve?",
    a: "Una landing page circa due settimane, un sito multipagina dalle tre alle cinque. Una prima automazione spesso è attiva in una o due settimane. Una web app parte da sei settimane. Le date finiscono nel preventivo, non restano a voce.",
  },
  {
    q: "Come mai non c'è l'IVA?",
    a: "Lavoro in regime forfettario, quindi le operazioni sono senza applicazione dell'IVA ai sensi dell'art. 1 comma 58 L. 190/2014. Sul totale risparmi il 22% rispetto a un fornitore in regime ordinario.",
  },
  {
    q: "E dopo il rilascio?",
    a: "Trenta giorni di assistenza sono già compresi per correzioni e piccole modifiche. Dopo puoi lavorare a ore oppure attivare un canone mensile per aggiornamenti e monitoraggio.",
  },
  {
    q: "Il progetto resta nostro?",
    a: "Sì. Codice, dominio e account sono intestati a voi dal primo giorno. Se un domani volete cambiare fornitore portate via tutto senza chiedere permesso a nessuno.",
  },
];

/**
 * Options for "Di cosa hai bisogno" in the contact form. They replace the old
 * free-text subject, so the value still travels in the `object` field the
 * EmailJS template reads.
 */
export const NEEDS = [
  "Automatizzare un processo",
  "Assistente AI",
  "Sito web",
  "Web app o gestionale",
  "Non lo so ancora",
];

/** What happens after the form is sent: removes the "and then?" doubt. */
export const NEXT_STEPS = [
  "Ti rispondo entro 24-48 ore, di persona.",
  "Fissiamo una call gratuita di 30 minuti.",
  "Entro 3 giorni ricevi un preventivo chiuso.",
];
