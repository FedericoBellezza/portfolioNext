'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

// I riferimenti [F1] diventano pulsanti: cliccandoli si apre la fonte.
function linkCitations(text) {
  return text.replace(/\[F(\d+)\]/g, '[F$1](#fonte-$1)')
}

export default function Markdown({ children, onSourceClick }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        a({ href, children: label }) {
          const match = /^#fonte-(\d+)$/.exec(href ?? '')
          if (match) {
            const n = Number(match[1])
            return (
              <button
                type="button"
                onClick={() => onSourceClick?.(n)}
                className="mx-0.5 inline-flex items-center rounded-md bg-[var(--dashboard-accent)]/10 px-1.5 py-0.5 align-baseline text-xs font-semibold tabular-nums text-[var(--dashboard-accent)] transition-colors hover:bg-[var(--dashboard-accent)] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dashboard-accent)]/40"
              >
                F{n}
              </button>
            )
          }
          return (
            <a
              href={href}
              target="_blank"
              rel="noreferrer noopener"
              className="text-[var(--dashboard-accent)] underline underline-offset-2"
            >
              {label}
            </a>
          )
        },
        p: ({ children: c }) => <p className="mb-3 text-pretty leading-relaxed last:mb-0">{c}</p>,
        ul: ({ children: c }) => <ul className="mb-3 list-disc space-y-1 pl-5 marker:text-[var(--dashboard-accent-light)]">{c}</ul>,
        ol: ({ children: c }) => <ol className="mb-3 list-decimal space-y-1 pl-5 marker:font-medium marker:text-[var(--dashboard-accent)]">{c}</ol>,
        li: ({ children: c }) => <li className="leading-relaxed">{c}</li>,
        h1: ({ children: c }) => <h3 className="mb-2 mt-4 text-balance font-serif text-xl font-semibold tracking-tight first:mt-0">{c}</h3>,
        h2: ({ children: c }) => <h3 className="mb-2 mt-4 text-balance font-serif text-lg font-semibold tracking-tight first:mt-0">{c}</h3>,
        h3: ({ children: c }) => <h4 className="mb-2 mt-3 font-serif text-base font-semibold first:mt-0">{c}</h4>,
        h4: ({ children: c }) => <h4 className="mb-1 mt-3 text-sm font-semibold first:mt-0">{c}</h4>,
        strong: ({ children: c }) => <strong className="font-semibold">{c}</strong>,
        blockquote: ({ children: c }) => (
          <blockquote className="mb-3 border-l-2 border-[var(--dashboard-accent-light)] pl-3 text-[var(--dashboard-text-secondary)]">
            {c}
          </blockquote>
        ),
        hr: () => <hr className="my-4 border-[var(--dashboard-border)]" />,
        pre: ({ children: c }) => (
          <pre className="mb-3 overflow-x-auto rounded-lg bg-[var(--dashboard-bg-secondary)] p-3 text-sm [&>code]:bg-transparent [&>code]:p-0">
            {c}
          </pre>
        ),
        code: ({ children: c }) => (
          <code className="rounded bg-[var(--dashboard-bg-secondary)] px-1 py-0.5 font-mono text-[0.9em]">{c}</code>
        ),
        table: ({ children: c }) => (
          <div className="mb-3 overflow-x-auto">
            <table className="w-full border-collapse text-sm tabular-nums">{c}</table>
          </div>
        ),
        th: ({ children: c }) => (
          <th className="border border-[var(--dashboard-border)] bg-[var(--dashboard-bg-secondary)] px-2 py-1 text-left font-semibold">
            {c}
          </th>
        ),
        td: ({ children: c }) => <td className="border border-[var(--dashboard-border)] px-2 py-1 align-top">{c}</td>,
      }}
    >
      {linkCitations(children)}
    </ReactMarkdown>
  )
}
