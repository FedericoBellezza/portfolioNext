'use client'

import { useMemo, useRef, useState } from 'react'
import { Dialog } from 'radix-ui'
import { AlertCircle, CheckCircle2, CopyCheck, Plus, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { MAX_URLS_PER_REQUEST } from '@/lib/leads/constants'
import { parseInstagramInput } from '@/lib/leads/instagram'
import { StatusChip, Spinner } from './Bits'
import { api, displayName } from './helpers'

export default function AddLeadDialog({ open, onOpenChange, container, onAdded, onOpenLead }) {
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)
  const inFlight = useRef(false) // blocca il doppio invio anche tra due render

  // Solo anteprima: il server rifà il parsing e decide.
  const preview = useMemo(() => parseInstagramInput(text), [text])

  const handleOpenChange = (o) => {
    if (!o) {
      setText('')
      setError(null)
      setResult(null)
    }
    onOpenChange(o)
  }

  const submit = async (e) => {
    e?.preventDefault()
    if (inFlight.current) return
    if (!text.trim()) {
      setError('Incolla almeno un link Instagram o un @handle.')
      return
    }
    if (preview.handles.length > MAX_URLS_PER_REQUEST) {
      setError(`Troppi profili in una volta: massimo ${MAX_URLS_PER_REQUEST}.`)
      return
    }

    inFlight.current = true
    setSubmitting(true)
    setError(null)
    try {
      const res = await api('', { method: 'POST', body: { input: text } })
      setResult(res)
      if (res.created.length) onAdded(res.created)

      // Campo svuotato solo se almeno un handle è stato aggiunto o c'era già;
      // le voci non valide restano lì per essere corrette.
      if (res.created.length || res.existing.length) {
        setText(res.invalid.map((r) => r.input).join('\n'))
      }
      if (res.created.length) {
        toast.success(
          res.created.length === 1 ? 'Lead aggiunto' : `${res.created.length} lead aggiunti`
        )
      }
    } catch (err) {
      setError(err.message)
    } finally {
      inFlight.current = false
      setSubmitting(false)
    }
  }

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      submit()
    }
  }

  const { handles, invalid } = preview
  const count = handles.length

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal container={container}>
        <Dialog.Overlay className="ld-overlay" />
        <Dialog.Content className="ld-dialog" aria-describedby="ld-add-desc">
          <div className="flex items-start justify-between gap-4 border-b border-[var(--ld-line)] px-6 pb-4 pt-5">
            <div>
              <p className="ld-eyebrow mb-1">Nuovo</p>
              <Dialog.Title className="ld-display text-2xl font-semibold">Aggiungi lead</Dialog.Title>
              <Dialog.Description id="ld-add-desc" className="mt-1 text-sm text-[var(--ld-ink-2)]">
                Servono solo i profili: nome, città e analisi li compila il workflow.
              </Dialog.Description>
            </div>
            <Dialog.Close className="ld-btn ld-btn-ghost ld-btn-icon ld-btn-sm shrink-0" aria-label="Chiudi">
              <X aria-hidden="true" />
            </Dialog.Close>
          </div>

          <form onSubmit={submit} className="space-y-3 px-6 py-5" noValidate>
            <label className="block">
              <span className="ld-label">Link o handle Instagram</span>
              <textarea
                className="ld-textarea ld-mono"
                rows={5}
                value={text}
                onChange={(e) => {
                  setText(e.target.value)
                  setError(null)
                }}
                onKeyDown={onKeyDown}
                placeholder="Incolla link o @handle, separati da spazio o a capo"
                spellCheck={false}
                autoCapitalize="off"
                autoCorrect="off"
                autoFocus
                aria-invalid={error ? 'true' : undefined}
                aria-describedby={error ? 'ld-add-error' : 'ld-add-hint'}
              />
            </label>

            <div className="flex items-center justify-between gap-3">
              <p id="ld-add-hint" className="text-xs text-[var(--ld-ink-2)]">
                {text.trim()
                  ? `${count} ${count === 1 ? 'profilo rilevato' : 'profili rilevati'}${
                      invalid.length ? ` · ${invalid.length} non ${invalid.length === 1 ? 'valido' : 'validi'}` : ''
                    }`
                  : 'Separatori: spazio, a capo, virgola o punto e virgola.'}
              </p>
              <button
                type="submit"
                className="ld-btn ld-btn-primary shrink-0"
                disabled={submitting || !text.trim()}
                title="Ctrl/Cmd + Invio"
              >
                {submitting ? <Spinner /> : <Plus aria-hidden="true" />}
                {submitting ? 'Aggiungo…' : 'Aggiungi'}
              </button>
            </div>

            {error && (
              <p
                id="ld-add-error"
                role="alert"
                className="flex items-start gap-2 rounded-xl border border-[var(--ld-danger)] bg-[var(--ld-danger-soft)] px-3 py-2.5 text-sm text-[var(--ld-danger)]"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                {error}
              </p>
            )}
          </form>

          {result && <Summary result={result} onOpenLead={(l) => { handleOpenChange(false); onOpenLead(l) }} />}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

/** Riepilogo breve dell'ultimo invio: aggiunti, già presenti, scartati. */
function Summary({ result, onOpenLead }) {
  const { created, existing, invalid } = result
  return (
    <div className="space-y-4 border-t border-[var(--ld-line-soft)] px-6 pb-6 pt-4" role="status" aria-live="polite">
      {created.length > 0 && (
        <div>
          <p className="mb-1.5 flex items-center gap-2 text-sm font-medium text-[#285a3a]">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            {created.length === 1 ? '1 lead aggiunto' : `${created.length} lead aggiunti`}
          </p>
          <p className="ld-mono flex flex-wrap gap-x-3 gap-y-1 text-xs text-[var(--ld-ink-2)]">
            {created.map((l) => (
              <span key={l.id}>@{l.instagram_handle}</span>
            ))}
          </p>
        </div>
      )}

      {existing.length > 0 && (
        <div>
          <p className="mb-1.5 flex items-center gap-2 text-sm font-medium">
            <CopyCheck className="h-4 w-4 text-[var(--ld-accent)]" aria-hidden="true" />
            {existing.length === 1 ? '1 già presente' : `${existing.length} già presenti`}
          </p>
          <ul className="space-y-1.5">
            {existing.map((l) => (
              <li
                key={l.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-[var(--ld-line)] bg-[var(--ld-paper-2)] px-3 py-2"
              >
                <button
                  type="button"
                  onClick={() => onOpenLead(l)}
                  className="ld-mono ld-link min-w-0 truncate text-left text-[0.8125rem]"
                  title={displayName(l)}
                >
                  @{l.instagram_handle}
                </button>
                <StatusChip stato={l.stato} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {invalid.length > 0 && (
        <div>
          <p className="mb-1.5 flex items-center gap-2 text-sm font-medium text-[var(--ld-danger)]">
            <AlertCircle className="h-4 w-4" aria-hidden="true" />
            {invalid.length === 1 ? '1 voce scartata' : `${invalid.length} voci scartate`}
            <span className="font-normal text-[var(--ld-ink-2)]">· restano nel campo, correggile</span>
          </p>
          <ul className="space-y-1.5 text-sm">
            {invalid.map((r, i) => (
              <li key={i} className="rounded-lg bg-[var(--ld-danger-soft)] px-3 py-1.5">
                <span className="ld-mono break-all text-[0.8125rem]">{r.input}</span>
                <span className="block text-xs text-[var(--ld-danger)]">{r.reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
