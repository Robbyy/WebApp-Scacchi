# Task: ISSUE-001 — Layout /play errato su Full HD

Fonte: https://github.com/Robbyy/WebApp-Scacchi/issues/1
Repository: Robbyy/WebApp-Scacchi
Issue: #1
Stato: open
Label: bug
Scaricato: 2026-07-07T21:31:37Z

## Sintesi

Il layout di `/play` (gioca contro il computer) è rotto a schermo intero: la scacchiera occupa quasi tutta la larghezza, il titolo "STOCKFISH / Gioca contro il computer" sta sopra la board e la spinge oltre l'altezza visibile, i pulsanti di controllo finiscono sotto la board e il pannello destro è tagliato a destra.

## Comprensione attuale

Il layout di `/play` (gioca contro il computer) è rotto a schermo intero: la scacchiera occupa quasi tutta la larghezza, il titolo "STOCKFISH / Gioca contro il computer" sta sopra la board e la spinge oltre l'altezza visibile, i pulsanti di controllo finiscono sotto la board e il pannello destro è tagliato a destra.

Comportamento attuale: scrollbar verticale; pulsanti sotto la board irraggiungibili; pannello destro quasi invisibile.

Comportamento atteso: layout a due colonne come nel dettaglio variante (board a sinistra; colonna destra con titolo, heading, pulsanti, info partita); nessun testo sopra/sotto la board; nessuna scrollbar verticale; pannello destro interamente visibile.

Non risultano commenti, quindi il corpo della issue e' l'unica fonte di specifica.

## Requisiti

- Risolvere il problema descritto dalla issue: Il layout di `/play` (gioca contro il computer) è rotto a schermo intero: la scacchiera occupa quasi tutta la larghezza, il titolo "STOCKFISH / Gioca contro il computer" sta sopra la board e la spinge oltre l'altezza visibile, i pulsanti di controllo finiscono sotto la board e il pannello destro è tagliato a destra.
- Implementare il comportamento atteso: layout a due colonne come nel dettaglio variante (board a sinistra; colonna destra con titolo, heading, pulsanti, info partita); nessun testo sopra/sotto la board; nessuna scrollbar verticale; pannello destro interamente visibile.
- Verificare lo scenario di riproduzione: aprire `/play` su 1920×1080 con finestra massimizzata.
- Considerare le note della issue: stesso pattern "2 colonne" di ISSUE-002.

## Criteri di accettazione

- Il comportamento atteso e' osservabile: layout a due colonne come nel dettaglio variante (board a sinistra; colonna destra con titolo, heading, pulsanti, info partita); nessun testo sopra/sotto la board; nessuna scrollbar verticale; pannello destro interamente visibile.
- Il comportamento indesiderato attuale non si verifica piu': scrollbar verticale; pulsanti sotto la board irraggiungibili; pannello destro quasi invisibile.
- I passi di riproduzione non mostrano piu' il problema: aprire `/play` su 1920×1080 con finestra massimizzata.

## Note dalla discussione

- Nessun commento.

## Domande aperte

- Nessuna domanda aperta identificata dal corpo della issue e dai commenti.

## Corpo originale

**Backlog:** ISSUE-001 · **Area:** frontend · **Severità:** media

**Descrizione**
Il layout di `/play` (gioca contro il computer) è rotto a schermo intero: la scacchiera occupa quasi tutta la larghezza, il titolo "STOCKFISH / Gioca contro il computer" sta sopra la board e la spinge oltre l'altezza visibile, i pulsanti di controllo finiscono sotto la board e il pannello destro è tagliato a destra.

**Passi per riprodurre:** aprire `/play` su 1920×1080 con finestra massimizzata.

**Atteso:** layout a due colonne come nel dettaglio variante (board a sinistra; colonna destra con titolo, heading, pulsanti, info partita); nessun testo sopra/sotto la board; nessuna scrollbar verticale; pannello destro interamente visibile.

**Attuale:** scrollbar verticale; pulsanti sotto la board irraggiungibili; pannello destro quasi invisibile.

**Note:** stesso pattern "2 colonne" di ISSUE-002.
