/**
 * Single source of truth for every piece of landing-page content.
 * Edit text here, never inside the section components.
 */

export const CONTACT = {
  email: "federico.bellezza.dev@gmail.com",
  whatsapp:
    "https://wa.me/393314508880?text=Ciao%20Federico%2C%20sono%20passato%20dal%20tuo%20sito%2C%20ti%20scrivo%20per%20",
  linkedin: "https://www.linkedin.com/in/federicobellezzadev/",
  github: "https://github.com/FedericoBellezza",
  responseTime: "Entro 24-48 ore",
  availability: "Full-time / Freelance",
};

/**
 * One label per intent. The whole page reuses these strings so there is
 * never a "Contattami" next to a "Parliamone" next to a "Scrivimi".
 */
export const CTA = {
  contact: "Prenota una consulenza",
  work: "Vedi i progetti",
  whatsapp: "Scrivimi su WhatsApp",
};

export const NAV_LINKS = [
  { label: "Servizi", href: "#servizi" },
  { label: "Metodo", href: "#metodo" },
  { label: "Progetti", href: "#progetti" },
  { label: "Prezzi", href: "#prezzi" },
];

export const STACK = [
  { name: "React", src: "/react.svg" },
  { name: "Next.js", src: "/next.svg" },
  { name: "Node.js", src: "/node-js.svg" },
  { name: "Tailwind CSS", src: "/tailwind-css.svg" },
  { name: "n8n", src: "/n8n-logo.png" },
  { name: "Supabase", src: "/supabase.svg" },
  { name: "MySQL", src: "/mysql.svg" },
  { name: "JavaScript", src: "/javascript.svg" },
  { name: "Java", src: "/java.svg" },
  { name: "Motion", src: "/motion.svg" },
];

/**
 * Bento cells. `tone` drives surface variation so the grid is never
 * six identical white cards; `area` drives the asymmetric desktop grid.
 */
export const SERVICES = [
  {
    id: "fullstack",
    title: "Sviluppo full stack",
    body: "Siti, e-commerce e web app costruiti con Next.js, React e Node. Veloci da caricare, semplici da gestire, tuoi al 100%.",
    points: ["Next.js e React", "API e integrazioni", "Deploy su Vercel"],
    tone: "ink",
    area: "lg:col-span-7 lg:row-span-2",
  },
  {
    id: "automation",
    title: "Automazione dei processi",
    body: "Workflow n8n che tolgono di mezzo il lavoro ripetitivo: preventivi, report, email, sincronizzazioni fra gestionali.",
    points: [],
    tone: "dots",
    area: "lg:col-span-5",
  },
  {
    id: "data",
    title: "Database e cloud",
    body: "Supabase, Firebase e MySQL configurati per reggere la crescita, con backup e permessi fatti come si deve.",
    points: [],
    tone: "plain",
    area: "lg:col-span-5",
  },
  {
    id: "ai",
    title: "Integrazione AI",
    body: "Modelli linguistici messi al lavoro dove servono davvero, dentro i tuoi strumenti esistenti.",
    points: [],
    tone: "accent",
    area: "lg:col-span-12",
    children: [
      {
        title: "Chatbot e assistenti",
        body: "Supporto clienti e risposte alle domande ricorrenti, 24 ore su 24.",
      },
      {
        title: "Automazioni intelligenti",
        body: "Lettura documenti, generazione contenuti, smistamento email.",
      },
      {
        title: "AI dentro le tue app",
        body: "OpenAI, Claude e modelli custom integrati nel prodotto.",
      },
      {
        title: "Analisi dei dati",
        body: "Report automatici e dashboard che spiegano cosa sta succedendo.",
      },
    ],
  },
];

/**
 * Verb-first phases. No "Step 1 / Fase 2" labels.
 */
export const PROCESS = [
  {
    id: "ascolto",
    title: "Ascolto",
    body: "Una call di quaranta minuti per capire il problema vero, non quello che sembra. Se non sono la persona giusta te lo dico subito.",
    detail: "Call conoscitiva gratuita",
  },
  {
    id: "progetto",
    title: "Progetto",
    body: "Preventivo scritto con tempi, costi e cosa resta fuori. Niente sorprese a metà lavoro e niente voci vaghe.",
    detail: "Preventivo dettagliato in 3 giorni",
  },
  {
    id: "costruisco",
    title: "Costruisco",
    body: "Sviluppo a blocchi con un link di anteprima sempre aggiornato. Vedi il progetto crescere e correggi il tiro quando serve.",
    detail: "Anteprima live dal primo giorno",
  },
  {
    id: "rilascio",
    title: "Rilascio",
    body: "Messa online, dominio, analytics e una sessione per consegnarti le chiavi. Poi resto raggiungibile per le modifiche.",
    detail: "Assistenza inclusa per 30 giorni",
  },
];

export const PROJECTS = [
  {
    title: "Alma",
    description:
      "Assistente nutrizionale privato e collaboratore del professionista.",
    image: "/alma-screenshot.png",
    alt: "Interfaccia di Alma, assistente nutrizionale per professionisti",
    url: "https://alma-sandy.vercel.app/",
    tags: ["Next.js", "Supabase", "OpenAI", "Stripe"],
    type: "Web app",
  },
  {
    title: "Anduma",
    description:
      "Trasforma i ricordi di un viaggio in un sito da condividere.",
    image: "/anduma-screenshot.jpg",
    alt: "Interfaccia di Anduma, racconti di viaggio pubblicati come sito",
    url: "https://anduma-cyan.vercel.app/",
    tags: ["Next.js", "Supabase", "Leaflet", "Stripe"],
    type: "Web app",
  },
  {
    title: "AI.Bandi",
    description:
      "Ricerca di bandi e finanziamenti per startup, PMI e professionisti, con suggerimenti generati su misura.",
    image: "/ai-bandi-screenshot.png",
    alt: "Interfaccia di AI.Bandi, ricerca di bandi e finanziamenti",
    url: "https://ai-bandi.com/",
    tags: ["Next.js", "Supabase", "OpenAI", "Stripe"],
    type: "Web app",
  },
  {
    title: "Knit",
    description:
      "Piattaforma per una start-up sportiva: consulenza strategica, formazione e networking per atleti e club.",
    image: "/knit2-screenshot.png",
    alt: "Sito di Knit, consulenza e formazione per atleti e organizzazioni sportive",
    url: "https://www.knit-networks.com/",
    tags: ["Next.js", "Tailwind", "GSAP"],
    type: "Sito corporate",
  },
  {
    title: "Federica Autretto",
    description:
      "Landing page per una biologa nutrizionista, con form di contatto, redirect WhatsApp e mappa integrata.",
    image: "/federica-autretto.com-screenshot.png",
    alt: "Sito di Federica Autretto, biologa nutrizionista",
    url: "https://federica-autretto.com/",
    tags: ["Next.js", "Tailwind", "Resend"],
    type: "Landing page",
  },
  {
    title: "Weather App",
    description:
      "Converte un indirizzo in coordinate e mostra le previsioni in tempo reale.",
    image: "/weatherApp.jpg",
    alt: "Interfaccia della Weather App con previsioni in tempo reale",
    url: "https://weatherapp-federicobellezza.web.app/",
    tags: ["React", "Vite", "Firebase"],
    type: "Web app",
  },
];

export const PLANS = [
  {
    id: "sito",
    name: "Sito web",
    price: "400",
    priceUnit: "a pagina",
    description:
      "Dalla singola landing page al sito multipagina completo, pronto a portarti contatti.",
    featured: false,
    features: [
      "Sviluppo in Next.js",
      "Design responsive, mobile first",
      "Ottimizzazione SEO tecnica",
      "Form di contatto integrato",
      "Hosting su Vercel configurato",
    ],
    addOns: ["Brand identity", "CMS per i contenuti", "Analytics e cookie policy"],
  },
  {
    id: "webapp",
    name: "Web app e MVP",
    price: "3.500",
    priceUnit: "a progetto",
    description:
      "Gestionali, SaaS e applicazioni su misura con logica di business tua e dati tuoi.",
    featured: true,
    features: [
      "Stack Next.js e Supabase",
      "Autenticazione utenti e ruoli",
      "Database e dashboard di gestione",
      "Pagamenti con Stripe",
      "Sviluppo API e integrazioni",
    ],
    addOns: ["Automazioni n8n", "Integrazione AI", "Manutenzione mensile"],
  },
];

export const PRICING_FAQ = [
  {
    q: "Perché un prezzo di partenza e non uno fisso?",
    a: "Perché due siti da cinque pagine possono costare il doppio l'uno dell'altro a seconda di cosa devono fare. Il numero che vedi è il punto di partenza reale: dopo la prima call ti mando un preventivo chiuso, con una cifra sola e nessuna voce a sorpresa.",
  },
  {
    q: "Quanto tempo serve?",
    a: "Una landing page richiede circa due settimane. Un sito multipagina dalle tre alle cinque. Una web app parte da sei settimane e dipende da quante funzioni servono al lancio. Le date finiscono nel preventivo, non restano a voce.",
  },
  {
    q: "Come mai non c'è l'IVA?",
    a: "Lavoro in regime forfettario, quindi le operazioni sono senza applicazione dell'IVA ai sensi dell'art. 1 comma 58 L. 190/2014. Sul totale risparmi il 22% rispetto a un fornitore in regime ordinario.",
  },
  {
    q: "Il sito resta mio?",
    a: "Sì. Codice, dominio e account di hosting sono intestati a te dal primo giorno. Se un domani vuoi cambiare fornitore porti via tutto senza chiedere permesso a nessuno.",
  },
  {
    q: "E dopo il rilascio?",
    a: "Trenta giorni di assistenza sono già compresi per correzioni e piccole modifiche. Dopo puoi lavorare a ore oppure attivare un canone mensile per aggiornamenti e monitoraggio.",
  },
];
