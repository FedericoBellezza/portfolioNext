/**
 * "Come pagare" guides shown before registering an F24. Text is generated from
 * the calendar item (deadline, quarter, tribute code); images and videos are the
 * owner's own files in the private `fiscale-guide` bucket, keyed by `media`.
 */

import type { F24Item } from "./tax-calculator";

export interface GuideLink {
  label: string;
  href: string;
}

export interface GuideStep {
  title: string;
  /** Paragraphs; lines starting with "• " are rendered as a list. */
  body: string[];
  link?: GuideLink;
  /** Media slot in the private bucket (file name without extension). */
  media?: string;
}

export interface Guide {
  id: string;
  title: string;
  steps: GuideStep[];
}

const INPS_CASSETTO =
  "https://www.inps.it/it/it/dettaglio-scheda.it.schede-servizio-strumento.schede-aree-tematiche.cassetto-previdenziale-artigiani-e-commercianti-50241.cassetto-previdenziale-artigiani-e-commercianti.html";
const ADE_AREA_RISERVATA = "https://www.agenziaentrate.gov.it/portale/";
const INAIL_LOGIN = "https://www.inail.it/app/iaa/IAA/public/login?TARGET=https:%2F%2Fwww.inail.it%2Fcs%2FRedirectLogin";

const day = (iso: string) =>
  new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${iso}T00:00:00Z`),
  );
const euro = (cents: number) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", useGrouping: "always" } as Intl.NumberFormatOptions).format(cents / 100);

const STAMP_QUARTERS: Record<string, string> = {
  "stamp:q1": "1° trimestre",
  "stamp:q2": "2° trimestre",
  "stamp:q3": "3° trimestre",
  "stamp:q4": "4° trimestre",
};

function inpsFixed(item: F24Item): Guide {
  return {
    id: "inps-fixed",
    title: "Paga la rata dei contributi INPS",
    steps: [
      {
        title: "Entra nel Cassetto previdenziale Artigiani e Commercianti",
        body: ["Accedi con SPID, CIE o CNS e completa il codice di controllo (CAPTCHA) che ti viene mostrato."],
        link: { label: "Apri il Cassetto previdenziale", href: INPS_CASSETTO },
        media: "inps-1",
      },
      {
        title: "Apri i dati del modello F24",
        body: ["Nel menu a sinistra scegli \"Posizione assicurativa\", poi \"Dati del modello F24\"."],
        media: "inps-2",
      },
      {
        title: "Scarica e paga l'F24",
        body: [
          `Nella tabella trova la riga di "${item.label}" e, nell'ultima colonna, scarica il PDF dell'F24.`,
          `Pagalo dalla tua banca (sezione F24 dell'home banking) entro il ${day(item.dueDate)}. Importo previsto: ${euro(item.amount)}.`,
          "Poi torna qui e registra l'importo effettivamente pagato.",
        ],
        media: "inps-3",
      },
    ],
  };
}

function inpsExcess(item: F24Item): Guide {
  return {
    id: "inps-excess",
    title: "Paga i contributi INPS sul reddito eccedente",
    steps: [
      {
        title: "Questi importi non sono nel Cassetto previdenziale",
        body: [
          "Saldo e acconti sul reddito oltre il minimale si calcolano con la dichiarazione dei redditi (quadro RR) e si pagano con lo stesso F24 dell'imposta sostitutiva.",
          "Se ti segue un commercialista o un servizio, l'F24 te lo prepara lui: controlla che contenga anche la sezione INPS.",
        ],
      },
      {
        title: "Compila la sezione INPS dell'F24",
        body: [
          "• Codice sede: quello della tua sede INPS (lo trovi sull'F24 delle rate fisse)",
          "• Causale contributo: AP (artigiani, contributi oltre il minimale)",
          "• Matricola: la tua posizione INPS artigiani",
          `• Periodo: anno ${item.competenceYear}`,
          `• Importo: ${euro(item.amount)} (stima)`,
        ],
      },
      {
        title: "Paga entro la scadenza",
        body: [
          `Paga dall'home banking entro il ${day(item.dueDate)}, poi torna qui e registra l'importo effettivo.`,
        ],
      },
    ],
  };
}

function substituteTax(item: F24Item): Guide {
  return {
    id: "substitute-tax",
    title: "Paga l'imposta sostitutiva",
    steps: [
      {
        title: "Prepara l'F24 (sezione Erario)",
        body: [
          "Se il modello te lo prepara il commercialista o il servizio che fa la tua dichiarazione, controlla che i dati coincidano con questi:",
          `• Codice tributo: ${item.code}`,
          `• Anno di riferimento: ${item.competenceYear}`,
          `• Importo a debito: ${euro(item.amount)} (stima)`,
        ],
      },
      {
        title: "Paga entro la scadenza",
        body: [
          `Paga dall'home banking (F24 ordinario o semplificato) entro il ${day(item.dueDate)}.`,
          ...(item.note ? [item.note + "."] : []),
          "Poi torna qui e registra l'importo effettivo.",
        ],
      },
    ],
  };
}

function stampDuty(item: F24Item): Guide {
  const prefix = item.key.replace(/:\d{4}$/, "");
  const quarter = STAMP_QUARTERS[prefix] ?? "trimestre";
  return {
    id: "stamp-duty",
    title: "Paga l'imposta di bollo delle fatture",
    steps: [
      {
        title: "Entra in Fatture e Corrispettivi",
        body: [
          "• Accedi all'area riservata dell'Agenzia delle Entrate",
          "• Apri \"Servizi\"",
          "• Cerca il servizio per la fatturazione elettronica ed entra in \"Fatture e Corrispettivi\"",
        ],
        link: { label: "Area riservata Agenzia delle Entrate", href: ADE_AREA_RISERVATA },
        media: "bollo-1",
      },
      {
        title: "Apri il pagamento dell'imposta di bollo",
        body: [
          "• Scorri in fondo ed entra in \"Fatture elettroniche e altri dati IVA\"",
          "• Scegli \"Pagamento imposta di bollo\"",
        ],
        media: "bollo-2",
      },
      {
        title: `Paga il ${quarter} ${item.competenceYear}`,
        body: [
          `• Nei filtri cerca il ${quarter} del ${item.competenceYear}, apri il dettaglio e premi "Procedi al pagamento"`,
          "• Spunta i consensi richiesti",
          `• Scegli una data di addebito entro il ${day(item.dueDate)}`,
          "• Inserisci l'IBAN per l'addebito",
          "• Premi \"Inoltra pagamento\" e poi \"Conferma\"",
          `L'importo valido è quello calcolato dal portale (stima qui: ${euro(item.amount)}). Registra quello che paghi.`,
          "Ogni trimestre si paga a parte, anche quando la scadenza è rinviata: se ne hai più di uno da pagare, ripeti per ciascuno.",
          "Scarica subito l'attestazione di prenotazione e caricala come provvisoria: quella di pagamento arriva dopo qualche giorno.",
        ],
        media: "bollo-3",
      },
    ],
  };
}

function chamberFee(item: F24Item): Guide {
  return {
    id: "chamber-fee",
    title: "Paga il diritto annuale della Camera di commercio",
    steps: [
      {
        title: "Verifica l'importo",
        body: [
          "Per un'impresa individuale iscritta nella sezione speciale (artigiani) l'importo base è fisso, più l'eventuale maggiorazione decisa dalla tua Camera di commercio.",
          `Qui è stimato in ${euro(item.amount)}: puoi verificarlo con il calcolatore ufficiale su dirittoannuale.camcom.it.`,
        ],
      },
      {
        title: "Compila l'F24 (sezione IMU e altri tributi locali)",
        body: [
          "• Codice ente: la sigla della provincia della sede (es. TO)",
          "• Codice tributo: 3850",
          `• Anno di riferimento: ${item.competenceYear}`,
          `Paga entro il ${day(item.dueDate)} (stessa scadenza del saldo delle imposte), poi registra l'importo qui.`,
        ],
      },
    ],
  };
}

function inail(item: F24Item): Guide {
  const year = item.competenceYear;
  return {
    id: "inail",
    title: "Paga il premio INAIL (autoliquidazione)",
    steps: [
      {
        title: "Accedi ai servizi online INAIL",
        body: [
          "Entra con SPID o CIE.",
          "• Quando ti chiede il profilo, scegli \"Legale rappresentante\" (per la tua ditta individuale sei tu)",
        ],
        link: { label: "Accedi a MyINAIL", href: INAIL_LOGIN },
        media: "inail-1",
      },
      {
        title: "Apri l'autoliquidazione",
        body: [
          "• In \"Servizi per te\" trova il riquadro \"Autoliquidazione\" e premi \"Vai al servizio\"",
          "• Scegli \"Alpi online\"",
        ],
        media: "inail-2",
      },
      {
        title: "Calcola il premio e scarica l'F24",
        body: [
          "Nel menu a sinistra apri \"Calcola il premio e invia le retribuzioni\". Se l'F24 non è ancora stato generato:",
          "• Premi \"Calcola premio\", poi \"Continua\"",
          "• Conferma di avere i requisiti richiesti",
          "• Scegli se pagare in un'unica soluzione o a rate",
          "• Premi \"Continua\": viene generato l'F24, scaricalo",
          item.unknownAmount
            ? "L'importo da pagare è quello indicato sull'F24."
            : `Stima basata sull'ultimo premio pagato: ${euro(item.amount)}. Fa fede l'importo dell'F24.`,
        ],
        media: "inail-3",
      },
      {
        title: "Trasmetti la dichiarazione e paga",
        body: [
          "• Dopo aver scaricato l'F24, scorri in fondo e premi \"Trasmetti\": così invii la dichiarazione delle retribuzioni",
          `• Paga l'F24 dall'home banking entro il ${day(item.dueDate)}`,
          `Se ti accorgi di un errore nei dati inviati, puoi rifare l'invio entro il 28 febbraio ${year}; la scadenza del pagamento però resta la stessa.`,
          "Poi torna qui e registra l'importo pagato.",
        ],
        media: "inail-4",
      },
    ],
  };
}

/** Guide for a calendar item, chosen by category. */
export function guideFor(item: F24Item): Guide {
  switch (item.category) {
    case "inps_fixed":
      return inpsFixed(item);
    case "inps_excess":
      return inpsExcess(item);
    case "substitute_tax":
      return substituteTax(item);
    case "stamp_duty":
      return stampDuty(item);
    case "chamber_fee":
      return chamberFee(item);
    case "inail":
      return inail(item);
  }
}

/** All media slots used by the guides (for the upload page and storage lookups). */
export const GUIDE_MEDIA_SLOTS = [
  "inps-1", "inps-2", "inps-3",
  "bollo-1", "bollo-2", "bollo-3",
  "inail-1", "inail-2", "inail-3", "inail-4",
] as const;
export type GuideMediaSlot = (typeof GUIDE_MEDIA_SLOTS)[number];

export type GuideMedia = Partial<Record<string, { url: string; kind: "image" | "video" }>>;
