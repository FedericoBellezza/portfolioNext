import { SITE } from "@/lib/site-data";

/**
 * Crawlers that answer questions instead of returning links are listed one by
 * one and allowed on purpose: a bot that cannot fetch the page cannot cite it.
 * They are separate from the search crawlers because the trade-off is
 * different — allowing them means the content can also feed model training.
 * Remove a user agent from this list to opt out of that engine.
 */
const AI_AGENTS = [
  "GPTBot", // OpenAI crawler
  "OAI-SearchBot", // ChatGPT search index
  "ChatGPT-User", // ChatGPT fetching a page on request
  "ClaudeBot", // Anthropic crawler
  "Claude-User",
  "Claude-SearchBot",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended", // Gemini and AI Overviews grounding
  "Applebot-Extended",
  "meta-externalagent",
  "Amazonbot",
  "DuckAssistBot",
  "MistralAI-User",
  "cohere-ai",
];

const PRIVATE = ["/dashboard/", "/login", "/api/"];

export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: PRIVATE,
      },
      ...AI_AGENTS.map((userAgent) => ({
        userAgent,
        allow: "/",
        disallow: PRIVATE,
      })),
    ],
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  };
}
