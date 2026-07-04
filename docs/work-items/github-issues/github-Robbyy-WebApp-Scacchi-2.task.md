# Task: ISSUE-002 — Pulsanti motore fuori viewport (dettaglio variante)

Source: https://github.com/Robbyy/WebApp-Scacchi/issues/2
Repository: Robbyy/WebApp-Scacchi
Issue: #2
State: open
Labels: bug
Fetched: 2026-07-04T20:31:53Z

## Summary

Nel dettaglio variante (`/variants/:id`), i due pulsanti sotto la scacchiera ("Motore" e "Gioca contro il computer") spingono il layout oltre l'altezza visibile e attivano la scrollbar verticale.

## Current Understanding

Nel dettaglio variante (`/variants/:id`), i due pulsanti sotto la scacchiera ("Motore" e "Gioca contro il computer") spingono il layout oltre l'altezza visibile e attivano la scrollbar verticale.

Current behavior: scrollbar verticale per i pulsanti sotto la board.

Expected behavior: i due pulsanti nel pannello laterale destro (con "Modifica variante", "Torna allo studio", controlli replay); board e pannello entrambi visibili senza scrollbar verticale.

No comments were present, so the issue body is the only specification source.

## Requirements

- Address the problem described by the issue: Nel dettaglio variante (`/variants/:id`), i due pulsanti sotto la scacchiera ("Motore" e "Gioca contro il computer") spingono il layout oltre l'altezza visibile e attivano la scrollbar verticale.
- Implement the expected behavior: i due pulsanti nel pannello laterale destro (con "Modifica variante", "Torna allo studio", controlli replay); board e pannello entrambi visibili senza scrollbar verticale.
- Verify the reproduction scenario: aprire un `/variants/:id` su 1920×1080 con finestra massimizzata.
- Consider the issue notes: coordinare con ISSUE-010 (stessa pagina) e col pattern 2-col di ISSUE-001.

## Acceptance Criteria

- The expected behavior is observable: i due pulsanti nel pannello laterale destro (con "Modifica variante", "Torna allo studio", controlli replay); board e pannello entrambi visibili senza scrollbar verticale.
- The current undesired behavior no longer occurs: scrollbar verticale per i pulsanti sotto la board.
- The reproduction steps pass without exposing the issue: aprire un `/variants/:id` su 1920×1080 con finestra massimizzata.

## Discussion Notes

- No comments.

## Open Questions

- Clarify how far to follow related-work notes: coordinare con ISSUE-010 (stessa pagina) e col pattern 2-col di ISSUE-001.

## Source Body

**Backlog:** ISSUE-002 · **Area:** frontend · **Severità:** media

**Descrizione**
Nel dettaglio variante (`/variants/:id`), i due pulsanti sotto la scacchiera ("Motore" e "Gioca contro il computer") spingono il layout oltre l'altezza visibile e attivano la scrollbar verticale.

**Passi per riprodurre:** aprire un `/variants/:id` su 1920×1080 con finestra massimizzata.

**Atteso:** i due pulsanti nel pannello laterale destro (con "Modifica variante", "Torna allo studio", controlli replay); board e pannello entrambi visibili senza scrollbar verticale.

**Attuale:** scrollbar verticale per i pulsanti sotto la board.

**Note:** coordinare con ISSUE-010 (stessa pagina) e col pattern 2-col di ISSUE-001.
