import Link from "next/link";

export const metadata = {
  title: "Privacy Policy & Cookie Policy | Federico Bellezza",
  description:
    "Informativa sulla privacy e sull'utilizzo dei cookie del sito federicobellezza.dev",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <div className="max-w-3xl mx-auto px-6 py-16 sm:py-24">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors mb-10"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Torna alla home
        </Link>

        <h1 className="text-3xl sm:text-4xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-slate-500 text-sm mb-12">
          Ultimo aggiornamento: febbraio 2025
        </p>

        <div className="prose prose-slate max-w-none space-y-10 text-slate-700 leading-relaxed">
          {/* 1 */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">
              1. Titolare del trattamento
            </h2>
            <p>
              Il titolare del trattamento dei dati personali è{" "}
              <strong>Federico Bellezza</strong>, sviluppatore freelance.
              <br />
              Per qualsiasi richiesta relativa alla privacy puoi contattarmi
              all&apos;indirizzo email:{" "}
              <a
                href="mailto:info@federicobellezza.dev"
                className="text-slate-900 underline underline-offset-2"
              >
                info@federicobellezza.dev
              </a>
            </p>
          </section>

          {/* 2 */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">
              2. Dati raccolti e finalità
            </h2>
            <p className="mb-4">
              Questo sito raccoglie i seguenti dati personali:
            </p>
            <ul className="list-disc list-inside space-y-3 ml-2">
              <li>
                <strong>Dati del modulo di contatto</strong> (nome, email,
                messaggio): inviati tramite il servizio{" "}
                <strong>EmailJS</strong> al solo scopo di rispondere alle tue
                richieste. Non vengono conservati su database propri.
              </li>
              <li>
                <strong>Dati di navigazione anonimizzati</strong>: tramite{" "}
                <strong>Vercel Analytics</strong> vengono raccolti dati
                aggregati sulle visite (pagine visitate, provenienza geografica
                approssimativa, tipo di dispositivo). Non è possibile
                identificare il singolo utente.
              </li>
              <li>
                <strong>Dati di autenticazione</strong>: la sezione dashboard
                (accessibile solo al proprietario) utilizza{" "}
                <strong>Supabase</strong> per la gestione delle sessioni tramite
                cookie tecnici.
              </li>
            </ul>
          </section>

          {/* 3 */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">
              3. Base giuridica del trattamento
            </h2>
            <p>
              Il trattamento dei dati avviene sulla base del{" "}
              <strong>consenso dell&apos;interessato</strong> (Art. 6 par. 1
              lett. a GDPR) per l&apos;analytics, e del{" "}
              <strong>legittimo interesse</strong> (Art. 6 par. 1 lett. f GDPR)
              per i cookie tecnici necessari al funzionamento del sito e per la
              gestione delle richieste di contatto.
            </p>
          </section>

          {/* 4 */}
          <section id="cookie">
            <h2 className="text-xl font-semibold text-slate-900 mb-3">
              4. Cookie Policy
            </h2>
            <p className="mb-4">
              Questo sito utilizza le seguenti categorie di cookie:
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="text-left px-4 py-2 font-semibold text-slate-700 border border-slate-200">
                      Cookie
                    </th>
                    <th className="text-left px-4 py-2 font-semibold text-slate-700 border border-slate-200">
                      Tipo
                    </th>
                    <th className="text-left px-4 py-2 font-semibold text-slate-700 border border-slate-200">
                      Scopo
                    </th>
                    <th className="text-left px-4 py-2 font-semibold text-slate-700 border border-slate-200">
                      Durata
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="px-4 py-2 border border-slate-200">
                      <code className="text-xs bg-slate-100 px-1 rounded">
                        sb-*
                      </code>
                    </td>
                    <td className="px-4 py-2 border border-slate-200">
                      Tecnico / Sessione
                    </td>
                    <td className="px-4 py-2 border border-slate-200">
                      Autenticazione Supabase (solo area admin)
                    </td>
                    <td className="px-4 py-2 border border-slate-200">
                      Sessione
                    </td>
                  </tr>
                  <tr className="bg-slate-50">
                    <td className="px-4 py-2 border border-slate-200">
                      <code className="text-xs bg-slate-100 px-1 rounded">
                        _vercel_*
                      </code>
                    </td>
                    <td className="px-4 py-2 border border-slate-200">
                      Analytics
                    </td>
                    <td className="px-4 py-2 border border-slate-200">
                      Statistiche anonime di visita (Vercel Analytics)
                    </td>
                    <td className="px-4 py-2 border border-slate-200">
                      24 ore
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 border border-slate-200">
                      <code className="text-xs bg-slate-100 px-1 rounded">
                        cookie_consent
                      </code>
                    </td>
                    <td className="px-4 py-2 border border-slate-200">
                      Tecnico / Preferenze
                    </td>
                    <td className="px-4 py-2 border border-slate-200">
                      Salva la tua scelta sul consenso cookie
                    </td>
                    <td className="px-4 py-2 border border-slate-200">
                      Persistente (localStorage)
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-sm text-slate-500">
              Puoi revocare il consenso in qualsiasi momento cancellando i dati
              del browser o tramite le impostazioni del tuo browser.
            </p>
          </section>

          {/* 5 */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">
              5. Conservazione dei dati
            </h2>
            <p>
              I dati personali inviati tramite il modulo di contatto sono
              conservati solo nella casella email del titolare per il tempo
              necessario a gestire la richiesta. I dati di analytics sono
              conservati in forma anonima da Vercel secondo la propria{" "}
              <a
                href="https://vercel.com/legal/privacy-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-900 underline underline-offset-2"
              >
                Privacy Policy
              </a>
              .
            </p>
          </section>

          {/* 6 */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">
              6. Diritti dell&apos;interessato
            </h2>
            <p className="mb-3">
              Ai sensi del GDPR (Reg. UE 2016/679) hai il diritto di:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Accedere ai tuoi dati personali</li>
              <li>Richiederne la rettifica o la cancellazione</li>
              <li>Opporti al trattamento o richiederne la limitazione</li>
              <li>Revocare il consenso in qualsiasi momento</li>
              <li>
                Proporre reclamo all&apos;autorità di controllo (Garante Privacy
                italiano:{" "}
                <a
                  href="https://www.garanteprivacy.it"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-900 underline underline-offset-2"
                >
                  garanteprivacy.it
                </a>
                )
              </li>
            </ul>
            <p className="mt-4">
              Per esercitare i tuoi diritti scrivi a:{" "}
              <a
                href="mailto:info@federicobellezza.dev"
                className="text-slate-900 underline underline-offset-2"
              >
                info@federicobellezza.dev
              </a>
            </p>
          </section>

          {/* 7 */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">
              7. Terze parti
            </h2>
            <p className="mb-3">
              Questo sito si avvale dei seguenti servizi di terze parti, ognuno
              con la propria informativa:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>
                <strong>Vercel</strong> (hosting & analytics) —{" "}
                <a
                  href="https://vercel.com/legal/privacy-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-900 underline underline-offset-2"
                >
                  Privacy Policy
                </a>
              </li>
              <li>
                <strong>Supabase</strong> (database & autenticazione) —{" "}
                <a
                  href="https://supabase.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-900 underline underline-offset-2"
                >
                  Privacy Policy
                </a>
              </li>
              <li>
                <strong>EmailJS</strong> (invio email) —{" "}
                <a
                  href="https://www.emailjs.com/legal/privacy-policy/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-900 underline underline-offset-2"
                >
                  Privacy Policy
                </a>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </main>
  );
}
