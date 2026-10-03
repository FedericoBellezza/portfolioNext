'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertDialog, Dialog } from 'radix-ui'
import {
  ArrowLeft,
  ArrowRight,
  Ban,
  ExternalLink,
  Mail,
  Phone,
  RotateCcw,
  Save,
  Send,
  Trash2,
  Undo2,
  X,
} from 'lucide-react'
import toast from 'react-hot-toast'
import {
  STATI,
  STATO_LABEL,
  ESITI,
  ESITO_LABEL,
  CANALI,
  CANALE_LABEL,
  TAG_LABEL,
} from '@/lib/leads/constants'
import { StatusChip, ScoreMeter, FollowupStamp, PendingLabel, CopyButton, Spinner } from './Bits'
import LdSelect from './LdSelect'
import {
  api,
  displayName,
  fmtDate,
  fmtDateTime,
  followupState,
  isAwaitingAnalysis,
  isoToLocalInput,
  localInputToIso,
  safeHttpUrl,
} from './helpers'

const EMAIL_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/

function toDraft(lead) {
  const neverSent = !lead.canale_invio && !lead.messaggio_inviato_il
  return {
    messaggio_proposto: lead.messaggio_proposto ?? '',
    stato: lead.stato,
    esito: lead.esito ?? '',
    // Preselezione comoda: la maggior parte degli invii è un DM Instagram.
    canale_invio: lead.canale_invio ?? (neverSent ? 'instagram_dm' : ''),
    messaggio_inviato_il: isoToLocalInput(lead.messaggio_inviato_il),
    risposto_il: isoToLocalInput(lead.risposto_il),
    data_followup: lead.data_followup ?? '',
    note: lead.note ?? '',
  }
}

const TIMESTAMP_FIELDS = new Set(['messaggio_inviato_il', 'risposto_il'])

/** Campi cambiati rispetto alla base, già nel formato atteso dall'API. */
function diffDraft(draft, base) {
  const out = {}
  for (const key of Object.keys(draft)) {
    if (draft[key] === base[key]) continue
    const v = draft[key]
    out[key] = TIMESTAMP_FIELDS.has(key) ? localInputToIso(v) || null : v === '' ? null : v
  }
  return out
}

export default function LeadDrawer({
  lead,
  today,
  container,
  onClose,
  onSaved,
  onDeleted,
  onNavigate,
  hasPrev,
  hasNext,
}) {
  // Durante l'animazione di chiusura `lead` è già null: si mostra l'ultimo noto.
  const last = useRef(lead)
  if (lead) last.current = lead
  const L = lead ?? last.current

  return (
    <Dialog.Root open={Boolean(lead)} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal container={container}>
        <Dialog.Overlay className="ld-overlay" />
        <Dialog.Content
          className="ld-drawer"
          aria-describedby={undefined}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          {L && (
            <DrawerBody
              key={L.id}
              lead={L}
              today={today}
              container={container}
              onClose={onClose}
              onSaved={onSaved}
              onDeleted={onDeleted}
              onNavigate={onNavigate}
              hasPrev={hasPrev}
              hasNext={hasNext}
            />
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function DrawerBody({ lead, today, container, onClose, onSaved, onDeleted, onNavigate, hasPrev, hasNext }) {
  const base = useMemo(() => toDraft(lead), [lead])
  const [draft, setDraft] = useState(base)
  const [busy, setBusy] = useState(null) // 'save' | 'send' | 'scarta' | 'riapri' | 'delete'
  const [confirmDelete, setConfirmDelete] = useState(false)

  // Quando il server restituisce una versione nuova del lead, la bozza riparte da quella.
  useEffect(() => {
    setDraft(base)
  }, [base])

  const changes = useMemo(() => diffDraft(draft, base), [draft, base])
  const dirty = Object.keys(changes).length > 0
  const messageDirty = 'messaggio_proposto' in changes
  const fu = followupState(lead, today)
  const set = (patch) => setDraft((d) => ({ ...d, ...patch }))

  const commit = async (key, extra = {}, okMessage = 'Modifiche salvate') => {
    if (busy) return
    setBusy(key)
    try {
      const { lead: updated } = await api(`/${lead.id}`, {
        method: 'PATCH',
        body: { ...changes, ...extra },
      })
      onSaved(updated)
      toast.success(okMessage)
    } catch (e) {
      toast.error(e.message)
    } finally {
      setBusy(null)
    }
  }

  const sendNow = () =>
    commit(
      'send',
      {
        stato: 'contattato',
        canale_invio: draft.canale_invio,
        messaggio_inviato_il: new Date().toISOString(),
      },
      'Segnato come inviato'
    )

  const remove = async () => {
    setBusy('delete')
    try {
      await api(`/${lead.id}`, { method: 'DELETE' })
      toast.success('Lead eliminato')
      setConfirmDelete(false)
      onDeleted(lead.id)
    } catch (e) {
      toast.error(e.message)
      setBusy(null)
    }
  }

  const igHref = safeHttpUrl(lead.instagram_url) ?? `https://www.instagram.com/${lead.instagram_handle}/`
  const siteHref = safeHttpUrl(lead.sito_url)
  const mailOk = lead.email_pubblica && EMAIL_RE.test(lead.email_pubblica.trim())
  const tel = lead.telefono ? lead.telefono.replace(/[^\d+]/g, '') : ''

  return (
    <>
      {/* intestazione */}
      <header className="flex items-start gap-3 border-b border-[var(--ld-line)] px-5 pb-4 pt-5">
        <div className="min-w-0 flex-1">
          <p className="ld-eyebrow mb-1">Scheda lead</p>
          <Dialog.Title className="ld-display text-[1.75rem] font-semibold leading-tight [overflow-wrap:anywhere]">
            {displayName(lead)}
          </Dialog.Title>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
            <a
              href={igHref}
              target="_blank"
              rel="noopener noreferrer"
              className="ld-mono ld-link inline-flex items-center gap-1 text-sm"
            >
              @{lead.instagram_handle}
              <ExternalLink className="h-3 w-3 opacity-60" aria-hidden="true" />
              <span className="sr-only">(si apre in una nuova scheda)</span>
            </a>
            <StatusChip stato={lead.stato} />
            <ScoreMeter value={lead.punteggio} />
          </div>
          {(fu || isAwaitingAnalysis(lead)) && (
            <div className="mt-3 flex flex-wrap gap-2">
              {isAwaitingAnalysis(lead) && <PendingLabel />}
              <FollowupStamp state={fu} />
            </div>
          )}
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            className="ld-btn ld-btn-ghost ld-btn-icon ld-btn-sm"
            onClick={() => onNavigate(-1)}
            disabled={!hasPrev}
            aria-label="Lead precedente"
          >
            <ArrowLeft aria-hidden="true" />
          </button>
          <button
            type="button"
            className="ld-btn ld-btn-ghost ld-btn-icon ld-btn-sm"
            onClick={() => onNavigate(1)}
            disabled={!hasNext}
            aria-label="Lead successivo"
          >
            <ArrowRight aria-hidden="true" />
          </button>
          <Dialog.Close className="ld-btn ld-btn-ghost ld-btn-icon ld-btn-sm" aria-label="Chiudi">
            <X aria-hidden="true" />
          </Dialog.Close>
        </div>
      </header>

      {/* corpo scorrevole */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {/* messaggio */}
        <section className="px-5 py-5" aria-labelledby="ld-msg">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 id="ld-msg" className="ld-label !mb-0">Messaggio proposto</h3>
            <span className="ld-mono text-xs text-[var(--ld-ink-2)]">
              {draft.messaggio_proposto.length} car.
            </span>
          </div>
          <textarea
            className="ld-textarea"
            rows={8}
            value={draft.messaggio_proposto}
            onChange={(e) => set({ messaggio_proposto: e.target.value })}
            placeholder="Nessun messaggio proposto: scrivilo qui."
            aria-labelledby="ld-msg"
          />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <CopyButton getText={() => draft.messaggio_proposto} className="ld-btn-primary" />
            {messageDirty && (
              <>
                <button
                  type="button"
                  className="ld-btn"
                  onClick={() => commit('save')}
                  disabled={busy !== null}
                >
                  {busy === 'save' ? <Spinner /> : <Save aria-hidden="true" />}
                  Salva messaggio
                </button>
                <button
                  type="button"
                  className="ld-btn ld-btn-ghost"
                  onClick={() => set({ messaggio_proposto: base.messaggio_proposto })}
                >
                  <Undo2 aria-hidden="true" /> Ripristina
                </button>
              </>
            )}
          </div>
          {messageDirty && (
            <p className="mt-2 text-xs text-[var(--ld-accent-ink)]">
              Modifiche non salvate: la copia usa il testo che vedi qui sopra.
            </p>
          )}
        </section>

        {/* tracciamento */}
        <section className="ld-section" aria-labelledby="ld-track">
          <h3 id="ld-track" className="ld-label">Tracciamento</h3>

          <div className="rounded-xl border border-[var(--ld-line)] bg-[var(--ld-paper-2)] p-3">
            <div className="flex flex-wrap items-end gap-3">
              <label className="min-w-[10rem] flex-1">
                <span className="ld-label">Canale di invio</span>
                <LdSelect
                  container={container}
                  value={draft.canale_invio}
                  onChange={(v) => set({ canale_invio: v })}
                  placeholder="Scegli il canale"
                  options={CANALI.map((c) => ({ value: c, label: CANALE_LABEL[c] }))}
                />
              </label>
              <button
                type="button"
                className="ld-btn ld-btn-primary"
                onClick={sendNow}
                disabled={busy !== null || !draft.canale_invio}
                title={!draft.canale_invio ? 'Scegli prima il canale' : undefined}
              >
                {busy === 'send' ? <Spinner /> : <Send aria-hidden="true" />}
                Segna come inviato
              </button>
            </div>
            <p className="mt-2 text-xs text-[var(--ld-ink-2)]">
              {lead.messaggio_inviato_il
                ? `Ultimo invio: ${fmtDateTime(lead.messaggio_inviato_il)}${
                    lead.canale_invio ? ` via ${CANALE_LABEL[lead.canale_invio]}` : ''
                  }.`
                : 'Imposta data di invio a ora e stato su “Contattato”.'}
            </p>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label>
              <span className="ld-label">Stato</span>
              <LdSelect
                container={container}
                value={draft.stato}
                onChange={(v) => set({ stato: v })}
                options={STATI.map((s) => ({ value: s, label: STATO_LABEL[s] }))}
              />
            </label>
            <label>
              <span className="ld-label">Esito</span>
              <LdSelect
                container={container}
                value={draft.esito}
                onChange={(v) => set({ esito: v })}
                allLabel="Nessuno"
                options={ESITI.map((s) => ({ value: s, label: ESITO_LABEL[s] }))}
              />
            </label>
            <label>
              <span className="ld-label">Inviato il</span>
              <input
                type="datetime-local"
                className="ld-input"
                value={draft.messaggio_inviato_il}
                onChange={(e) => set({ messaggio_inviato_il: e.target.value })}
              />
            </label>
            <label>
              <span className="ld-label">Risposto il</span>
              <input
                type="datetime-local"
                className="ld-input"
                value={draft.risposto_il}
                onChange={(e) => set({ risposto_il: e.target.value })}
              />
            </label>
            <label className="sm:col-span-2">
              <span className="ld-label">Data follow-up</span>
              <div className="flex gap-2">
                <input
                  type="date"
                  className="ld-input"
                  value={draft.data_followup}
                  onChange={(e) => set({ data_followup: e.target.value })}
                />
                {draft.data_followup && (
                  <button
                    type="button"
                    className="ld-btn ld-btn-ghost ld-btn-icon"
                    onClick={() => set({ data_followup: '' })}
                    aria-label="Rimuovi data follow-up"
                  >
                    <X aria-hidden="true" />
                  </button>
                )}
              </div>
            </label>
            <label className="sm:col-span-2">
              <span className="ld-label">Note</span>
              <textarea
                className="ld-textarea"
                rows={4}
                value={draft.note}
                onChange={(e) => set({ note: e.target.value })}
                placeholder="Appunti su contatti, risposte, prossimi passi…"
              />
            </label>
          </div>
        </section>

        {/* analisi */}
        <section className="ld-section" aria-labelledby="ld-an">
          <h3 id="ld-an" className="ld-label">Analisi del workflow</h3>

          {lead.punti_carenti?.length > 0 ? (
            <ul className="mb-4 space-y-2">
              {lead.punti_carenti.map((p, i) => (
                <li key={i} className="flex gap-2 text-sm">
                  <span
                    aria-hidden="true"
                    className="mt-[0.45rem] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--ld-accent)]"
                  />
                  <span>{String(p)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mb-4 text-sm text-[var(--ld-ink-2)]">Nessun punto carente registrato.</p>
          )}

          {lead.tag?.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-1.5">
              {lead.tag.map((t) => (
                <span key={t} className="ld-tag">{TAG_LABEL[t] ?? t}</span>
              ))}
            </div>
          )}

          <dl className="ld-dl">
            <Row label="Settore" value={lead.settore} />
            <Row label="Città" value={lead.citta} />
            <Row label="Follower" value={lead.followers != null ? lead.followers.toLocaleString('it-IT') : null} />
            <Row label="Ultimo post" value={lead.ultimo_post ? fmtDate(lead.ultimo_post) : null} />
            <Row label="Bio" value={lead.bio} pre />
            <Row
              label="Sito"
              value={
                lead.sito_url || lead.ha_sito != null ? (
                  <span>
                    {siteHref ? (
                      <a
                        href={siteHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ld-link inline-flex items-center gap-1"
                      >
                        {lead.sito_url}
                        <ExternalLink className="h-3 w-3 opacity-60" aria-hidden="true" />
                      </a>
                    ) : (
                      lead.sito_url
                    )}
                    {lead.ha_sito === false && !lead.sito_url && 'Nessun sito'}
                  </span>
                ) : null
              }
            />
            <Row label="Note sul sito" value={lead.sito_note} pre />
            <Row
              label="Email"
              value={
                lead.email_pubblica ? (
                  mailOk ? (
                    <a href={`mailto:${lead.email_pubblica.trim()}`} className="ld-link inline-flex items-center gap-1">
                      <Mail className="h-3 w-3" aria-hidden="true" />
                      {lead.email_pubblica}
                    </a>
                  ) : (
                    lead.email_pubblica
                  )
                ) : null
              }
            />
            <Row
              label="Telefono"
              value={
                lead.telefono ? (
                  tel ? (
                    <a href={`tel:${tel}`} className="ld-link inline-flex items-center gap-1">
                      <Phone className="h-3 w-3" aria-hidden="true" />
                      {lead.telefono}
                    </a>
                  ) : (
                    lead.telefono
                  )
                ) : null
              }
            />
            <Row label="Analizzato il" value={lead.analizzato_il ? fmtDateTime(lead.analizzato_il) : null} />
            <Row label="Creato il" value={fmtDateTime(lead.created_at)} />
            <Row label="Aggiornato il" value={fmtDateTime(lead.updated_at)} />
          </dl>
        </section>

        {/* altre azioni */}
        <section className="ld-section" aria-labelledby="ld-more">
          <h3 id="ld-more" className="ld-label">Altre azioni</h3>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="ld-btn"
              onClick={() => commit('scarta', { stato: 'scartato' }, 'Lead scartato')}
              disabled={busy !== null || lead.stato === 'scartato'}
            >
              {busy === 'scarta' ? <Spinner /> : <Ban aria-hidden="true" />}
              Scarta
            </button>
            <button
              type="button"
              className="ld-btn"
              onClick={() =>
                commit('riapri', { stato: 'nuovo' }, 'Rimesso in “Nuovo”: il workflow rifarà l’analisi')
              }
              disabled={busy !== null || lead.stato === 'nuovo'}
              title="Rimette lo stato su Nuovo per far rifare l'analisi al workflow"
            >
              {busy === 'riapri' ? <Spinner /> : <RotateCcw aria-hidden="true" />}
              Rimetti in nuovo
            </button>
            <button
              type="button"
              className="ld-btn ld-btn-danger"
              onClick={() => setConfirmDelete(true)}
              disabled={busy !== null}
            >
              <Trash2 aria-hidden="true" />
              Elimina
            </button>
          </div>
        </section>
      </div>

      {/* barra di salvataggio */}
      {dirty && (
        <footer
          className="ld-rise flex flex-wrap items-center justify-between gap-3 border-t border-[var(--ld-line)] bg-[var(--ld-paper-2)] px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
        >
          <span className="text-sm text-[var(--ld-accent-ink)]">Hai modifiche non salvate</span>
          <div className="flex gap-2">
            <button type="button" className="ld-btn" onClick={() => setDraft(base)} disabled={busy !== null}>
              Annulla
            </button>
            <button type="button" className="ld-btn ld-btn-primary" onClick={() => commit('save')} disabled={busy !== null}>
              {busy === 'save' ? <Spinner /> : <Save aria-hidden="true" />}
              Salva modifiche
            </button>
          </div>
        </footer>
      )}

      {/* conferma eliminazione */}
      <AlertDialog.Root open={confirmDelete} onOpenChange={(o) => busy !== 'delete' && setConfirmDelete(o)}>
        <AlertDialog.Portal container={container}>
          <AlertDialog.Overlay className="ld-overlay !z-[90]" />
          <AlertDialog.Content className="ld-dialog !z-[91] p-6">
            <AlertDialog.Title className="ld-display text-xl font-semibold">
              Eliminare questo lead?
            </AlertDialog.Title>
            <AlertDialog.Description className="mt-2 text-sm text-[var(--ld-ink-2)]">
              <strong className="text-[var(--ld-ink)]">{displayName(lead)}</strong> (@{lead.instagram_handle})
              verrà cancellato definitivamente, con messaggio e note. L’azione non si può annullare.
              Se vuoi solo metterlo da parte, usa “Scarta”.
            </AlertDialog.Description>
            <div className="mt-6 flex justify-end gap-2">
              <AlertDialog.Cancel className="ld-btn" disabled={busy === 'delete'}>
                Annulla
              </AlertDialog.Cancel>
              <button
                type="button"
                className="ld-btn ld-btn-danger-solid"
                onClick={remove}
                disabled={busy === 'delete'}
              >
                {busy === 'delete' ? <Spinner /> : <Trash2 aria-hidden="true" />}
                Elimina definitivamente
              </button>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </>
  )
}

function Row({ label, value, pre = false }) {
  if (value == null || value === '') return null
  return (
    <>
      <dt>{label}</dt>
      <dd className={pre ? 'whitespace-pre-line' : undefined}>{value}</dd>
    </>
  )
}
