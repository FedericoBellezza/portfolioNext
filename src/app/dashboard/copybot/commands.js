// Stessa lista del workflow n8n "Trader AI - Comandi Dashboard" (nodo "Prepara Comando"):
// "copy-<x>" esegue `python -m copybot <x>`. Se ne aggiungi uno, aggiornali entrambi.
export const COPY_COMMANDS = ['copy-status', 'copy-cycle', 'copy-check', 'copy-refresh', 'copy-stop', 'copy-resume']

export const COPY_LABELS = {
  'copy-status': 'Aggiorna',
  'copy-cycle': 'Esegui un giro',
  'copy-check': 'Controlla i collegamenti',
  'copy-refresh': 'Rileggi 13F e dichiarazioni',
  'copy-stop': 'Ferma il bot',
  'copy-resume': 'Riattiva il bot',
}
