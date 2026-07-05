# Analysis: ISSUE-002 — Pulsanti motore fuori viewport (dettaglio variante)

Task: `docs/work-items/github-issues/github-Robbyy-WebApp-Scacchi-2.task.md` (fonte: https://github.com/Robbyy/WebApp-Scacchi/issues/2)
Repository: `C:\Sviluppo\Workspace - Intellij\WebApp Scacchi`
Date: 2026-07-05

## Executive Summary

Bug di layout **solo frontend** sulla pagina di dettaglio variante (`/variants/:id`, componente `VariantDetail`). Sotto la scacchiera, nella colonna sinistra `.board-col`, è presente la barra `.engine-bar` con i pulsanti "Motore" e "Gioca contro il computer". Poiché la scacchiera ha altezza sostanzialmente fissa (larghezza `min(90vw, 720px)`, quindi ~720px su Full HD, board quadrata), la colonna board + barra motore supera l'altezza utile del viewport a 1920×1080 e compare la scrollbar verticale.

La correzione richiesta dalla issue è **strutturale, non solo estetica**: spostare i due pulsanti motore dalla colonna board al **pannello laterale destro** `.side` (dove già vivono "Modifica variante", "Statistiche", "Torna allo studio" e i controlli di replay), così che board e pannello restino entrambi visibili senza scroll verticale. L'intervento è concentrato quasi interamente in `variant-detail.html` (spostamento nodi) + qualche aggiustamento in `variant-detail.css`.

## Validation Note

Analisi validata come base di lavoro. La direzione consigliata è spostare i controlli motore in un **blocco dedicato del pannello destro**, non dentro `.detail-actions`, così da non mescolare azioni motore/studio con link di modifica, statistiche e navigazione.

## Task Understanding

- **Comportamento attuale (da correggere):** i pulsanti motore sotto la board producono una scrollbar verticale su 1920×1080 massimizzato.
- **Comportamento atteso:** i due pulsanti ("Motore", "Gioca contro il computer") collocati nel pannello laterale destro insieme a "Modifica variante", "Torna allo studio" e ai controlli di replay; board e pannello entrambi visibili senza scrollbar verticale.
- **Passo di riproduzione (accettazione):** aprire un `/variants/:id` su 1920×1080 con finestra massimizzata.
- **Vincolo di dominio (non regredire):** Stockfish è aiuto allo studio, **mai** in allenamento — la relocazione riguarda solo il dettaglio variante, non deve toccare `variant-training`.
- **Nota di coordinamento (dalla issue):** allinearsi con ISSUE-010 (stessa pagina, pannello varianti a 3 colonne) e col pattern 2-col di ISSUE-001 (`/play` su Full HD). Vedi Open Questions.

## Relevant Code Map

- `frontend/src/app/variants/variant-detail.html`: template della pagina. Contiene sia la sorgente (`.engine-bar` in `.board-col`) sia la destinazione (`.side` / `.detail-actions`). È il file centrale del fix.
- `frontend/src/app/variants/variant-detail.css`: stili di `.detail` (flex-wrap), `.board-col`, `.engine-bar`, `.side`, `.detail-actions`. Nessuna media query presente: il layout si affida al solo `flex-wrap`.
- `frontend/src/app/variants/variant-detail.ts`: logica del componente. I metodi/segnali dei pulsanti (`toggleEngine`, `playVsComputer`, `engineOn`, `showEvalBar`, `toggleEvalBar`, `engineAvailable`, `engineEval`, `engineThinking`) restano invariati; cambia solo dove sono renderizzati i controlli.
- `frontend/src/app/chessboard/chessboard.css`: `width: min(90vw, 720px)` sulla board — è la causa della dimensione (quasi) fissa che innesca l'overflow verticale.
- `frontend/src/app/app.css`: `.topbar` (header ~64px) sottrae altezza al viewport; contesto per il budget verticale.
- `frontend/src/app/variants/variant-detail.spec.ts`: test unitari del componente. Non asseriscono la posizione DOM dei pulsanti motore (usano metodi/segnali), quindi lo spostamento non dovrebbe romperli — da riverificare.

## Current Behavior

Su `/variants/:id`, `VariantDetail` rende un contenitore `.detail` in `display:flex; flex-wrap:wrap` con due figli:

1. `.board-col` (colonna sinistra): `.board-with-eval` (eval-bar opzionale + `app-chessboard`), poi `.engine-bar` con:
   - pulsante **"Motore"** (`.engine-toggle`);
   - pulsante **"Nascondi/Mostra barra"** (`.engine-sub`) — condizionale, solo quando il motore è acceso;
   - pulsante **"Gioca contro il computer"** (`.engine-sub`);
   - `.engine-note` ("Motore non disponibile…") condizionale.
2. `.side` (colonna destra, `width: min(100%, 380px)`): intestazione, CTA allena (se apertura), pannello mosse/PGN, `.controls` (replay), contatore semimossa, `.detail-actions` (Modifica variante, Statistiche, Torna allo studio).

A 1920×1080 la board occupa ~720px di lato; sommando cornice, `gap` e `.engine-bar`, la `.board-col` è più alta della `.side` e supera l'altezza utile (viewport − header − padding `.detail` di 2rem sopra/sotto), generando la scrollbar verticale. La `.side` da sola sarebbe più corta; è la barra motore appesa sotto la board a spingere l'overflow.

## Evidence

- `frontend/src/app/variants/variant-detail.html:5`: apertura di `.board-col` (colonna sinistra board).
- `frontend/src/app/variants/variant-detail.html:17-40`: `.engine-bar` con "Motore" (17-31), "Nascondi/Mostra barra" condizionale (32-36), "Gioca contro il computer" (37-39).
- `frontend/src/app/variants/variant-detail.html:41-43`: `.engine-note` condizionale (motore non disponibile).
- `frontend/src/app/variants/variant-detail.html:46`: apertura di `.side` (pannello destro, destinazione proposta).
- `frontend/src/app/variants/variant-detail.html:140-158`: `.detail-actions` con "Modifica variante", "Statistiche" (condizionale `isOpening()`), "Torna allo studio".
- `frontend/src/app/variants/variant-detail.css:1-10`: `.detail` `display:flex; flex-wrap:wrap; padding: 2rem 1.5rem`.
- `frontend/src/app/variants/variant-detail.css:12-17`: `.board-col` colonna flex, `gap:1rem`.
- `frontend/src/app/variants/variant-detail.css:31-36`: `.engine-bar` flex con wrap e `justify-content:center`.
- `frontend/src/app/variants/variant-detail.css:176-181`: `.side` `width: min(100%, 380px)`, colonna flex `gap:1rem`.
- `frontend/src/app/chessboard/chessboard.css:59`: `width: min(90vw, 720px)` — board a lato ~fisso su desktop.
- `frontend/src/app/variants/variant-detail.css` (intero file, 421 righe): **nessuna** `@media` query — il responsive dipende solo da `flex-wrap` su `.detail`.
- `frontend/src/app/app.css:1-9`: `.topbar` con `padding: 0.9rem 1.5rem` — header che riduce il budget verticale.

## Likely Change Areas

- `frontend/src/app/variants/variant-detail.html`: **spostare** il blocco `.engine-bar` (e la relativa `.engine-note`) da dentro `.board-col` a dentro `.side`, in un blocco dedicato ai controlli motore. La `.board-col` resta con la sola board (+ eval-bar).
- `frontend/src/app/variants/variant-detail.css`: adeguare gli stili di `.engine-bar` al contesto verticale del pannello (es. `justify-content` da `center` a `flex-start`, eventuale allineamento a colonna/coerenza coi bottoni `.edit-link`); eventuale ritocco a `.board-col`/`.detail` se serve. Valutare se aggiungere un `align-items:flex-start` o larghezza coerente.
- (Eventuale, da valutare) `frontend/src/app/variants/variant-detail.css`: piccola regola per garantire che la board non ecceda l'altezza, ma la relocazione dovrebbe già bastare; evitare vincoli `vh` sulla board che romperebbero le proporzioni quadrate.

Nessuna modifica prevista a `variant-detail.ts` (binding e metodi invariati). Nessuna modifica backend.

## Implementation Plan

1. Nel template, tagliare il blocco `.engine-bar` (righe ~17-40) e la `.engine-note` (~41-43) dalla `.board-col` e incollarli dentro `.side`, creando un blocco dedicato ai controlli motore. Mantenere invariati tutti i binding (`toggleEngine`, `playVsComputer`, `engineOn`, `showEvalBar`, `toggleEvalBar`, `engineAvailable`, ecc.).
2. Verificare che `.board-col` contenga ora solo `.board-with-eval`; se resta un contenitore vuoto o un `gap` superfluo, semplificarlo.
3. Adeguare gli stili di `.engine-bar` al nuovo contesto (pannello a colonna, larghezza ~380px): rivedere `justify-content`/`flex-wrap`/allineamento per coerenza con gli altri controlli del pannello (`.controls`, `.detail-actions`, `.edit-link`).
4. Controllare l'interazione con l'eval-bar: quando il motore è acceso, `app-eval-bar` resta affiancata alla board in `.board-with-eval` (invariata); assicurarsi che spostare il toggle "Nascondi/Mostra barra" nel pannello resti sensato per l'utente.
5. Verifica visiva a 1920×1080 massimizzato: board + pannello senza scrollbar verticale; poi ricontrollo su larghezze intermedie (~800–1280px, l'area delicata "responsive scacchiera" nota nei docs) e su mobile per il wrap.
6. Eseguire i test frontend e la verifica manuale (sotto).

## Test And Verification Plan

- **Test unitari (Vitest):** eseguire `npm test -- --watch=false` da `frontend`. I test esistenti in `variant-detail.spec.ts` non dipendono dalla posizione DOM dei pulsanti; confermare che restano verdi. Opzionale: aggiungere un'asserzione leggera che i controlli motore siano presenti nel pannello laterale (query per testo/classe), se si vuole blindare la regressione — senza introdurre fragilità sul layout.
- **Verifica manuale (accettazione della issue):** aprire `/variants/:id` su 1920×1080 con finestra massimizzata; confermare assenza di scrollbar verticale e presenza dei due pulsanti nel pannello destro. Ripetere con motore ACCESO (compare "Nascondi/Mostra barra" + eval-bar) e con motore non disponibile (compare `.engine-note`).
- **Regressione layout:** verificare larghezze intermedie e mobile (wrap del `.detail`), e che la pagina di allenamento (`variant-training`) resti priva di controlli motore (vincolo di dominio).

## Risks And Edge Cases

- **Eval-bar orfana:** "Nascondi/Mostra barra" agisce su `showEvalBar`, ma l'eval-bar è renderizzata nella colonna board (`.board-with-eval`). Spostando il toggle nel pannello, l'azione resta corretta (segnale condiviso) ma la relazione visiva pulsante↔barra si allontana: valutare UX.
- **Motore acceso = 3 pulsanti:** quando `engineOn` è true, la barra ha "Motore acceso" + "Nascondi/Mostra barra" + "Gioca contro il computer"; nel pannello a 380px lo stacking verticale va gestito per non allungare troppo la `.side` (in teoria comunque più corta della board).
- **Board a dimensione fissa:** finché la board resta `min(90vw, 720px)` senza vincolo `vh`, su viewport bassi (<~800px di altezza) potrebbe comunque servire scroll; la issue mira a 1080, ma non introdurre un fix che rompa le proporzioni quadrate della board.
- **Assenza di media query:** il layout dipende solo da `flex-wrap`; modifiche agli stili di `.engine-bar` non devono compromettere il wrapping su mobile.
- **Coordinamento con ISSUE-010:** se il pannello varianti diventa una terza colonna, la collocazione dei pulsanti motore potrebbe essere rivista; evitare scelte che confliggano (vedi Open Questions).

## Open Questions

- **Quanto vincolarsi a ISSUE-001/ISSUE-010 ora?** La issue chiede "coordinare", ma le due referenziate non esistono come task file nel repo (`docs/work-items/github-issues/` contiene solo la #2). Ipotesi operativa: implementare ISSUE-002 in modo autonomo e minimale (spostamento nei `.detail-actions`/pannello), lasciando la ristrutturazione a colonne alle rispettive issue. Da confermare con l'utente se si vuole invece anticipare il pattern 2-col.
- **Posizione esatta nel pannello:** scelta validata a livello di direzione: usare un blocco dedicato per i controlli motore dentro `.side`, evitando di inserirli in `.detail-actions`.
- **Destino del toggle eval-bar:** mantenerlo tra i controlli motore nel pannello o lasciarlo agganciato visivamente alla board? Da decidere.

## Out Of Scope

- Backend (nessun impatto): la issue è puramente di layout frontend.
- Ristrutturazione completa a 2/3 colonne del dettaglio (ISSUE-001 / ISSUE-010): fuori da questa issue salvo diversa indicazione.
- Modifica del dimensionamento della board (`chessboard.css`) o introduzione di un layout responsive basato su altezza viewport, oltre al minimo necessario.
- Qualsiasi intervento su `variant-training` o sul perimetro Stockfish in allenamento (vincolo di dominio invariato).
- Modifiche al DB locale `backend/data/scacchi.mv.db` (non pertinente).
