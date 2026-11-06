"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** Answers of the fiscal chat: light Markdown in the section's colours. */
export function Markdown({ children }: { children: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        a: ({ href, children: c }) => (
          <a
            href={href}
            target="_blank"
            rel="noreferrer noopener"
            className="break-words text-[var(--fi-action)] underline decoration-[var(--fi-action)]/40 underline-offset-2 hover:decoration-[var(--fi-action)]"
          >
            {c}
          </a>
        ),
        p: ({ children: c }) => <p className="mb-3 text-pretty leading-relaxed last:mb-0">{c}</p>,
        ul: ({ children: c }) => <ul className="mb-3 list-disc space-y-1 pl-5 marker:text-[var(--fi-muted)] last:mb-0">{c}</ul>,
        ol: ({ children: c }) => <ol className="mb-3 list-decimal space-y-1 pl-5 marker:text-[var(--fi-muted)] last:mb-0">{c}</ol>,
        li: ({ children: c }) => <li className="leading-relaxed">{c}</li>,
        h1: ({ children: c }) => <h3 className="mb-2 mt-4 text-[15px] font-semibold first:mt-0">{c}</h3>,
        h2: ({ children: c }) => <h3 className="mb-2 mt-4 text-[15px] font-semibold first:mt-0">{c}</h3>,
        h3: ({ children: c }) => <h4 className="mb-1.5 mt-3 text-sm font-semibold first:mt-0">{c}</h4>,
        h4: ({ children: c }) => <h4 className="mb-1.5 mt-3 text-sm font-semibold first:mt-0">{c}</h4>,
        strong: ({ children: c }) => <strong className="font-semibold text-[var(--fi-ink)]">{c}</strong>,
        blockquote: ({ children: c }) => (
          <blockquote className="mb-3 border-l-2 border-[var(--fi-rule-strong)] pl-3 text-[var(--fi-ink-2)]">{c}</blockquote>
        ),
        hr: () => <hr className="my-4 border-[var(--fi-rule)]" />,
        code: ({ children: c }) => <code className="fi-num rounded bg-[var(--fi-fill)] px-1 py-0.5 text-[0.9em]">{c}</code>,
        pre: ({ children: c }) => (
          <pre className="mb-3 overflow-x-auto rounded-lg bg-[var(--fi-fill)] p-3 text-[13px] [&>code]:bg-transparent [&>code]:p-0">{c}</pre>
        ),
        table: ({ children: c }) => (
          <div className="mb-3 overflow-x-auto rounded-lg border border-[var(--fi-rule)]">
            <table className="fi-num w-full border-collapse text-[13px]">{c}</table>
          </div>
        ),
        th: ({ children: c }) => (
          <th className="border-b border-[var(--fi-rule)] bg-[var(--fi-ground)] px-3 py-2 text-left font-medium text-[var(--fi-ink-2)]">{c}</th>
        ),
        td: ({ children: c }) => <td className="border-b border-[var(--fi-rule)] px-3 py-2 align-top [tr:last-child_&]:border-b-0">{c}</td>,
      }}
    >
      {children}
    </ReactMarkdown>
  );
}
