# Task: ISSUE-002 — Pulsanti motore fuori viewport (dettaglio variante)

Fonte: https://github.com/Robbyy/WebApp-Scacchi/issues/2
Repository: Robbyy/WebApp-Scacchi
Issue: #2
Stato: open
Label: bug
Scaricato: 2026-07-04T21:10:07Z

## Sintesi

Nel dettaglio variante (`/variants/:id`), i due pulsanti sotto la scacchiera ("Motore" e "Gioca contro il computer") spingono il layout oltre l'altezza visibile e attivano la scrollbar verticale.

## Comprensione attuale

Nel dettaglio variante (`/variants/:id`), i due pulsanti sotto la scacchiera ("Motore" e "Gioca contro il computer") spingono il layout oltre l'altezza visibile e attivano la scrollbar verticale.

Comportamento attuale: scrollbar verticale per i pulsanti sotto la board.

Comportamento atteso: i due pulsanti nel pannello laterale destro (con "Modifica variante", "Torna allo studio", controlli replay); board e pannello entrambi visibili senza scrollbar verticale.

Non risultano commenti, quindi il corpo della issue e' l'unica fonte di specifica.

## Requisiti

- Risolvere il problema descritto dalla issue: Nel dettaglio variante (`/variants/:id`), i due pulsanti sotto la scacchiera ("Motore" e "Gioca contro il computer") spingono il layout oltre l'altezza visibile e attivano la scrollbar verticale.
- Implementare il comportamento atteso: i due pulsanti nel pannello laterale destro (con "Modifica variante", "Torna allo studio", controlli replay); board e pannello entrambi visibili senza scrollbar verticale.
- Verificare lo scenario di riproduzione: aprire un `/variants/:id` su 1920×1080 con finestra massimizzata.
- Considerare le note della issue: coordinare con ISSUE-010 (stessa pagina) e col pattern 2-col di ISSUE-001.

## Criteri di accettazione

- Il comportamento atteso e' osservabile: i due pulsanti nel pannello laterale destro (con "Modifica variante", "Torna allo studio", controlli replay); board e pannello entrambi visibili senza scrollbar verticale.
- Il comportamento indesiderato attuale non si verifica piu': scrollbar verticale per i pulsanti sotto la board.
- I passi di riproduzione non mostrano piu' il problema: aprire un `/variants/:id` su 1920×1080 con finestra massimizzata.

## Note dalla discussione

- Nessun commento.

## Domande aperte

- Chiarire quanto seguire le note di lavoro collegato: coordinare con ISSUE-010 (stessa pagina) e col pattern 2-col di ISSUE-001.

## Corpo originale

**Backlog:** ISSUE-002 · **Area:** frontend · **Severità:** media

**Descrizione**
Nel dettaglio variante (`/variants/:id`), i due pulsanti sotto la scacchiera ("Motore" e "Gioca contro il computer") spingono il layout oltre l'altezza visibile e attivano la scrollbar verticale.

**Passi per riprodurre:** aprire un `/variants/:id` su 1920×1080 con finestra massimizzata.

**Atteso:** i due pulsanti nel pannello laterale destro (con "Modifica variante", "Torna allo studio", controlli replay); board e pannello entrambi visibili senza scrollbar verticale.

**Attuale:** scrollbar verticale per i pulsanti sotto la board.

**Note:** coordinare con ISSUE-010 (stessa pagina) e col pattern 2-col di ISSUE-001.
