**Design Requirements:**

- The layout should be a 3-column grid on desktop, stacking on mobile.
- Use `framer-motion` for subtle hover effects (if available, otherwise use CSS transitions).
- Add a badge "Most Popular" to the middle tier.
- Add a "FAQ" or "Notes" section at the bottom explaining that these are starting prices ("A partire da").

**Content Requirements (Must be in Italian):**

Please use exactly these 3 Tiers for the cards:

1. **Card 1: "Landing Page"**
   - Price: "da € 700"
   - Description: "Ideale per convertire visitatori in clienti o lanciare un prodotto."
   - Features list (Checkmarks):
     - Sviluppo in Next.js (Ultra veloce)
     - Design Responsive & Mobile First
     - SEO Tecnico di base
     - Integrazione Form contatti
     - Hosting su Vercel configurato

2. **Card 2: "Sito Corporate" (Highlight as Most Popular)**
   - Price: "da € 1.800"
   - Description: "Sito multipagina per aziende che vogliono una presenza solida e scalabile."
   - Features list (Checkmarks):
     - Fino a 5-8 pagine
     - CMS per gestione contenuti (opzionale)
     - Ottimizzazione Performance (Core Web Vitals)
     - Brand Identity base (Colori/Font)
     - Google Analytics & Cookie Policy setup

3. **Card 3: "Web App / MVP"**
   - Price: "da € 4.500"
   - Description: "Applicazioni complesse, SaaS o Gestionali su misura con logica custom."
   - Features list (Checkmarks):
     - Stack: Next.js + Supabase
     - Autenticazione Utenti & Ruoli
     - Database & Dashboard Admin
     - Pagamenti (Stripe integration)
     - API Development

**Call to Action:**
The button on each card should say "Richiedi Preventivo" and link to `#contact`.

**Technical constraints:**

- Create a clean data array for the pricing plans so I can easily edit text later.
