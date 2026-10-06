// Domande sull'archivio stesso ("quali documenti ho?", "ci sono file duplicati?"): si risolvono
// dall'elenco dei materiali, senza cercare estratti. Evita un prompt enorme (e il timeout) per
// una risposta che non ha bisogno del contenuto dei file.

const DOC_NOUN = "(?:documenti|documento|file|materiali|materiale|dispense|slide|pdf|lezioni)";
const DUPLICATE_WORDS = /\b(?:ripet\w*|duplicat\w*|doppion\w*|doppi|ridondan\w*|sovrappost\w*|identic\w*|uguali|stess[oi]\s+(?:file|documenti?))\b/i;
const LISTING = new RegExp(
  `\\b(?:quali|quanti|elenc\\w*|lista|mostrami|dimmi)\\b[^?.!]{0,40}\\b${DOC_NOUN}\\b[^?.!]{0,30}\\b(?:ho|hai|ci sono|sono caricat\\w*|caricat\\w*|present\\w*|disponibil\\w*)\\b`,
  "i",
);
const DOC_NOUN_RE = new RegExp(`\\b${DOC_NOUN}\\b`, "i");

export function isCatalogQuestion(message) {
  const text = String(message ?? "");
  if (text.length > 300) return false;
  return (DUPLICATE_WORDS.test(text) && DOC_NOUN_RE.test(text)) || LISTING.test(text);
}

function normalizeName(name) {
  return name
    .toLowerCase()
    .replace(/\.[a-z0-9]{2,5}$/, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/**
 * Gruppi di documenti dello stesso corso con nome (senza estensione) o dimensione e tipo identici.
 * Sono solo indizi: il contenuto non viene confrontato.
 */
export function findDuplicateCandidates(documents) {
  const groups = [];
  const seen = new Set();
  const collect = (keyOf, reason) => {
    const buckets = new Map();
    for (const doc of documents) {
      const key = keyOf(doc);
      if (!key) continue;
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(doc);
    }
    for (const docs of buckets.values()) {
      if (docs.length < 2) continue;
      const signature = docs
        .map((doc) => doc.id)
        .sort()
        .join("|");
      if (seen.has(signature)) continue;
      seen.add(signature);
      groups.push({ reason, docs });
    }
  };
  collect((doc) => `${doc.course}\u0000${normalizeName(doc.name)}`, "stesso nome");
  collect(
    (doc) => (doc.file_size ? `${doc.course}\u0000${doc.file_type}\u0000${doc.file_size}` : null),
    "stessa dimensione e tipo",
  );
  return groups;
}

export function formatDuplicateCandidates(documents) {
  const groups = findDuplicateCandidates(documents);
  if (!groups.length) {
    return "Controllo automatico su nome e dimensione: nessun file con nome o dimensione identici.";
  }
  const lines = groups.map(
    ({ reason, docs }) => `- ${reason}: ${docs.map((doc) => `"${doc.name}" (${doc.course})`).join(", ")}`,
  );
  return `Controllo automatico su nome e dimensione, possibili duplicati:\n${lines.join("\n")}`;
}
