import { embed, embedMany } from "ai";
import { openai } from "@ai-sdk/openai";

// text-embedding-3-small: 1536 dimensioni, come la colonna vector(1536) della migrazione.
const model = openai.embedding("text-embedding-3-small");

export async function embedQuery(text) {
  const { embedding } = await embed({ model, value: text });
  return embedding;
}

// embedMany spezza da solo in più richieste quando serve.
export async function embedTexts(values) {
  if (!values.length) return [];
  const { embeddings } = await embedMany({ model, values, maxParallelCalls: 2 });
  return embeddings;
}

// PostgREST accetta il tipo vector come stringa "[0.1,0.2,...]".
export function toVectorLiteral(vector) {
  return `[${vector.map((n) => n.toFixed(6)).join(",")}]`;
}
