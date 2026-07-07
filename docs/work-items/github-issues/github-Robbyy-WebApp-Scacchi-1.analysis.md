# Analysis: ISSUE-001 — Layout /play errato su Full HD

Task: `docs/work-items/github-issues/github-Robbyy-WebApp-Scacchi-1.task.md` (fonte: https://github.com/Robbyy/WebApp-Scacchi/issues/1)
Repository: `C:\Sviluppo\Workspace - Intellij\WebApp Scacchi`
Date: 2026-07-07

## Executive Summary

Bug di layout **solo frontend** sulla pagina `/play` ("Gioca contro il computer", componente `PlayVsComputer`, nato col Prototipo 16 in `b16a4c6` e mai ritoccato da allora). La pagina non segue il pattern a due colonne del dettaglio variante: il titolo sta **sopra** la griglia board+pannello, il contenitore è largo al massimo 900px e — punto centrale — il CSS della pagina prova a limitare la scacchiera a 480px agendo sull'host `app-chessboard`, ma la board interna si dimensiona da sola con `width: min(90vw, 720px)` (unità viewport, non percentuali del contenitore). Su 1920×1080 la cornice della scacchiera è quindi ~760px reali dentro un host di 480px: trabocca a destra sopra il pannello laterale, che risulta coperto/quasi invisibile, mentre titolo + board superano l'altezza utile e compare la scrollbar verticale.

La correzione richiesta è **strutturale e già collaudata**: replicare su `/play` il layout a due colonne di `/variants/:id` (ISSUE-002, commit `b401f9c`, review APPROVED_WITH_NOTES) — board a sinistra a dimensione naturale, colonna destra a larghezza definita (~380px) con titolo, stato partita, pulsante "Ricomincia", link di chiusura e nota. L'intervento è concentrato in `play.html` (spostamento di header e avviso motore dentro l'aside) e `play.css` (contenitore a 1280px, rimozione del cap 480px sull'host, larghezza definita del pannello). Nessuna modifica a `play.ts`, a `chessboard.*` o al backend.

## Task Understanding

- **Comportamento attuale (da correggere):** a 1920×1080 massimizzato la scacchiera occupa quasi tutta la larghezza, il titolo "STOCKFISH / Gioca contro il computer" sopra la board spinge il contenuto oltre l'altezza visibile (scrollbar verticale), i pulsanti di controllo finiscono sotto/dietro la board e il pannello destro è tagliato/quasi invisibile.
- **Comportamento atteso:** layout a due colonne come nel dettaglio variante — board a sinistra; colonna destra con titolo, heading, pulsanti e info partita; nessun testo sopra/sotto la board; nessuna scrollbar verticale; pannello destro interamente visibile.
- **Passo di riproduzione (accettazione):** aprire `/play` su 1920×1080 con finestra massimizzata.
- **Nota della issue:** stesso pattern "2 colonne" di ISSUE-002 — che nel frattempo **è stata implementata e revisionata** (`b401f9c`): il dettaglio variante è ora il riferimento concreto, non più solo un'intenzione.
- **Dal backlog (`docs/backlog/bug.md:34-35`):** "enumerare i pulsanti reali leggendo il componente `play`". Fatto: la colonna destra reale contiene il box di stato (`.play-status`: "Tocca a te / Il computer sta pensando / esito"), il pulsante **"Ricomincia"**, il link **"Chiudi e torna agli studi"** e la nota sulla tab separata. Non ci sono controlli di replay né controlli motore su questa pagina.
- **Vincolo di dominio (contesto, non toccato dal fix):** Stockfish mai in allenamento; `/play` è una pagina autonoma aperta in nuova tab con la FEN nell'URL — il fix è di solo layout e non deve cambiare questo comportamento.

## Relevant Code Map

- `frontend/src/app/play/play.html`: template della pagina — header sopra la griglia, avviso motore sopra la griglia, `.play-grid` con board + `.play-side`. File centrale del fix.
- `frontend/src/app/play/play.css`: stili di `.play` (max-width 900px), `app-chessboard` (cap a 480px), `.play-side` (`flex: 1` senza larghezza definita). Secondo file del fix.
- `frontend/src/app/play/play.ts`: logica (FEN da query param, turni, motore). **Invariata**: nessun binding cambia, solo la collocazione dei nodi nel template.
- `frontend/src/app/play/play.spec.ts`: 5 test di sola logica (stato, orientamento, mosse); nessuna asserzione sulla posizione DOM di titolo/pulsanti.
- `frontend/src/app/variants/variant-detail.html` + `variant-detail.css`: **pattern di riferimento** post ISSUE-002 — `.detail` (flex, wrap, max-width 1280px, gap 2rem, centrato), board a dimensione naturale a sinistra, `.side` a `width: min(100%, 380px)` con header (`.side-head`) e controlli.
- `frontend/src/app/chessboard/chessboard.css`: dimensionamento reale della board — `:host` inline-block, `.board-grid` a `min(90vw, 720px)`, cornice `.board-frame` con tracce coordinate da 1rem e padding 4px (~760px totali su Full HD). Spiega perché il cap a 480px dell'host non funziona.
- `frontend/src/app/app.css`: `.topbar` (~64px) — contesto per il budget verticale.
- `frontend/src/styles.css`: `box-sizing: border-box` globale (righe 28-30) — rilevante per i conti sulle larghezze.
- `docs/work-items/github-issues/github-Robbyy-WebApp-Scacchi-2.analysis.md` e `.review.md`: analisi e review di ISSUE-002 — decisioni e lezioni da riusare (verifica manuale documentata, asserzione di regressione leggera).

## Current Behavior

Su `/play`, il template rende in sequenza verticale: `<header class="play-head">` (kicker "Stockfish" + h2 "Gioca contro il computer"), l'eventuale `.play-warn` (motore non disponibile), poi `.play-grid` (flex, wrap, gap 1.5rem) con `app-chessboard` e `<aside class="play-side">` (stato, "Ricomincia", link di chiusura, nota). Il tutto dentro `.play` con `max-width: 900px` centrato.

I numeri su viewport 1920×1080 (con `box-sizing: border-box` globale):

- Contenuto utile di `.play`: 900 − 2×1.5rem = **852px**.
- Board reale: `.board-grid` = min(90vw=1728px, 720px) = **720px**, quadrata; con tracce coordinate (2×1rem) e padding (2×4px) la cornice `.board-frame` è ~**760×760px**.
- L'host `app-chessboard` è però forzato da `play.css` a `display: block; width: min(100%, 480px)` = **480px**: la cornice interna (inline-grid non riducibile, dimensionata in vw) **trabocca di ~280px a destra** dell'host.
- `.play-side` (`flex: 1`, basis 0%, min-width 220px) resta sulla stessa riga e occupa i ~348px rimanenti (da x≈504 a 852): la board traboccante la **sovrappone** fino a x≈760, lasciandone visibile una striscia di ~90px.

Effetti riportati dalla issue, tutti coerenti con questa struttura: la board da 760px è l'~89% del contenitore da 852px ("quasi tutta la larghezza"); pannello e pulsanti sono coperti dalla board traboccante (l'esatta resa di chi copre chi dipende dall'ordine di painting, ma il risultato — pulsanti inaccessibili, pannello quasi invisibile — è quello osservato); in verticale, topbar (~64px) + padding (2rem) + header pagina (~80px) + board (~760px) + padding inferiore superano l'altezza utile di una finestra massimizzata a 1080 (~900-950px tolto il chrome del browser), da cui la scrollbar verticale. Il confronto col dettaglio variante conferma la diagnosi: lì il contenitore è 1280px, l'host della board **non è dimensionato** (resta all'intrinseco ~760px) e `.side` ha larghezza definita 380px → 760 + 32 + 380 = 1172 ≤ 1232 di contenuto utile, tutto in una riga senza overflow.

## Evidence

- `frontend/src/app/play/play.html:2-5`: `.play-head` (kicker + titolo) renderizzato **sopra** la griglia board+pannello.
- `frontend/src/app/play/play.html:10-14`: `.play-warn` (motore non disponibile) anch'esso sopra la griglia — testo sopra la board, vietato dal comportamento atteso.
- `frontend/src/app/play/play.html:16-40`: `.play-grid` con `app-chessboard` e `aside.play-side`; nell'aside: stato (26-32), "Ricomincia" (33), "Chiudi e torna agli studi" (34), nota (35-38).
- `frontend/src/app/play/play.css:1-5`: `.play { max-width: 900px }` — troppo stretto per board ~760px + pannello.
- `frontend/src/app/play/play.css:45-49`: `app-chessboard { flex: 0 0 auto; display: block; width: min(100%, 480px) }` — il cap che la board interna ignora.
- `frontend/src/app/play/play.css:51-57`: `.play-side { flex: 1; min-width: 220px }` — nessuna larghezza definita, a differenza del pattern di riferimento.
- `frontend/src/app/chessboard/chessboard.css:59-60`: `.board-grid { width: min(90vw, 720px); aspect-ratio: 1/1 }` — la board si dimensiona sul viewport, **non** sul contenitore.
- `frontend/src/app/chessboard/chessboard.css:1-11`: `:host { display: inline-block }`; `.board-frame` inline-grid con tracce `1rem auto 1rem` e padding 4px → ~760px esterni.
- `frontend/src/app/variants/variant-detail.css:1-10`: `.detail` — `flex; wrap; gap: 2rem; justify-content: center; align-items: flex-start; max-width: 1280px` (pattern bersaglio).
- `frontend/src/app/variants/variant-detail.css:184-189`: `.side { width: min(100%, 380px) }` (larghezza definita del pannello nel pattern bersaglio).
- `frontend/src/app/variants/variant-detail.html:18-28`: `.side-head` (kicker + titolo + badge) **dentro** l'aside — dove su `/play` dovrà finire "STOCKFISH / Gioca contro il computer".
- `frontend/src/app/variants/variant-detail.css` (nessun match per `app-chessboard`): nel dettaglio variante l'host della board **non è dimensionato** → dimensione intrinseca.
- `frontend/src/app/app.css:1-9`: `.topbar` con `padding: 0.9rem 1.5rem` — riduce il budget verticale (~64px).
- `frontend/src/styles.css:28-30`: `* { box-sizing: border-box }`.
- `frontend/src/app/play/play.spec.ts:34-83`: test solo su logica (status/orientation/mosse) — nessun vincolo sulla struttura DOM del layout.
- `git log -- frontend/src/app/play/`: unico commit `b16a4c6` (P16) — nessuna modifica concorrente in corso; working tree pulito sul componente.
- `docs/stato-corrente.md:71`: area delicata "Responsive scacchiera" — board fissa ~720px tra ~800–1280px, pannello sotto la piega su laptop: limite noto da **non** affrontare qui.
- `docs/checklist-e2e.md:55`: flusso manuale 31 ("Gioca contro il computer") — base per la verifica funzionale post-fix.

## Likely Change Areas

- `frontend/src/app/play/play.html`: spostare `.play-head` (kicker + titolo) **dentro** `aside.play-side` come primo blocco (equivalente di `.side-head`); spostare `.play-warn` dentro l'aside (equivalente della `.engine-note` di ISSUE-002); lasciare il ramo `@if (status() === 'invalid')` com'è (in quello stato la board non è renderizzata e il messaggio semplice basta — cfr. `.detail-error` nel dettaglio variante). Attenzione: oggi `.play-head` sta fuori dall'`@if/@else`, quindi spostandolo nell'aside il titolo sparisce dallo stato "FEN non valida" — decidere se va bene (vedi Open Questions).
- `frontend/src/app/play/play.css`: allineare il contenitore al pattern `.detail` — `max-width: 1280px` e, sulla riga flex (`.play-grid` o direttamente `.play`), `gap: 2rem; justify-content: center; align-items: flex-start`; **rimuovere** la regola `app-chessboard { width: min(100%, 480px) }` (host a dimensione intrinseca, come nel dettaglio variante); `.play-side` da `flex: 1; min-width: 220px` a `width: min(100%, 380px)`; eventuale ritocco tipografico di kicker/titolo per coerenza col pannello (vedi Open Questions).
- `frontend/src/app/play/play.spec.ts` (opzionale, lezione della review ISSUE-002): un'asserzione leggera di regressione — es. il titolo/le azioni stanno dentro `.play-side` e nessun `.play-head` precede la griglia — senza asserzioni fragili su pixel.

Nessuna modifica prevista a `play.ts` (binding `status`, `restart`, `fen`, `orientation`, `engineUnavailable` invariati), a `chessboard.*` (il dimensionamento `min(90vw, 720px)` resta: è il comportamento su cui si basa anche il dettaglio variante), a `variant-*`, al backend o ai documenti di architettura (nessun endpoint/entità toccati).

## Implementation Plan

1. In `play.html`, spostare il blocco kicker+titolo dentro `aside.play-side` come primo elemento (markup analogo a `.side-head` del dettaglio variante), seguito dallo stato partita, dai controlli ("Ricomincia", link di chiusura) e dalla nota. Spostare `.play-warn` dentro l'aside. Dopo la modifica, dentro `@else` la struttura deve essere: `.play-grid` → board + aside, nient'altro sopra o sotto la board.
2. In `play.css`, portare il contenitore al pattern del dettaglio variante: `max-width: 1280px`; sulla riga flex `gap: 2rem`, `justify-content: center`, `align-items: flex-start` (oggi `.play-grid` ha già flex+wrap: si può promuovere `.play` a contenitore flex unico come `.detail`, o tenere `.play-grid` adeguandone i valori — scelta implementativa libera, l'importante è la parità dei numeri).
3. Sempre in `play.css`, eliminare il dimensionamento dell'host (`app-chessboard { width: … }`): la board torna alla dimensione intrinseca (~760px su Full HD), identica al dettaglio variante. Se serve mantenere la regola per il flex, limitarla a `flex: 0 0 auto`.
4. Dare al pannello una larghezza definita: `.play-side { width: min(100%, 380px); display: flex; flex-direction: column; gap: … }` (rimuovere `flex: 1` e `min-width: 220px`), aggiungendo/adattando gli stili dell'header spostato (dimensioni coerenti con `.side-kicker`/`.side-title` o mantenendo quelle attuali — vedi Open Questions).
5. Verifica dei conti a 1920×1080: contenuto utile 1232px ≥ 760 (board) + 32 (gap) + 380 (pannello) = 1172 → una riga; in verticale ~64 (topbar) + 32 (padding) + 760 (board) + 32 = ~888px ≤ altezza utile → niente scrollbar. Stessi numeri del dettaglio variante già validato con ISSUE-002.
6. Ricontrollare i tre stati alternativi: FEN non valida (messaggio con link, senza board), motore non disponibile (`.play-warn` ora nel pannello), partita conclusa (`.play-status--over` nel pannello); poi larghezze intermedie (~800–1280px) e mobile per il wrap (il pannello scende sotto la board, come nel dettaglio variante — parità accettata, non regressione).
7. Eseguire la suite frontend e la verifica manuale (sotto); per la lezione di ISSUE-002, **documentare** l'esito della verifica a 1920×1080 (motore disponibile/non disponibile, partita in corso/conclusa) in un report di implementazione.

## Test And Verification Plan

- **Test unitari (Vitest):** da `frontend`, `npm test -- --watch=false`. I 5 test esistenti di `play.spec.ts` sono di sola logica e non dipendono dalla struttura DOM: devono restare verdi (suite attuale: 174 test). La compilazione dei template nei test copre l'integrità dei binding spostati.
- **Asserzione di regressione leggera (opzionale ma raccomandata dalla review ISSUE-002):** dopo il render con stato `your-turn`, verificare che il titolo "Gioca contro il computer" sia dentro `.play-side` e che non esista un header fuori dalla griglia. Niente asserzioni su dimensioni in pixel.
- **Verifica manuale (accettazione della issue):** aprire `/play` (anche via "Gioca contro il computer" dal dettaglio variante, flusso 31 della checklist E2E) su 1920×1080 massimizzato: due colonne affiancate, nessun testo sopra/sotto la board, nessuna scrollbar verticale, pannello destro interamente visibile; "Ricomincia" e link raggiungibili e funzionanti. Ripetere con: motore non disponibile (avviso nel pannello), FEN non valida (`/play?fen=not-a-fen`), FEN col Nero al tratto (orientamento board), partita conclusa (stato verde nel pannello).
- **Regressione layout:** ricontrollo rapido a ~1024px e su viewport mobile (wrap del pannello sotto la board, parità col dettaglio variante); confermare che il dettaglio variante non sia stato toccato.

## Risks And Edge Cases

- **Il cap a 480px non va "riparato" ma rimosso.** La tentazione di far scalare la board dentro un host più piccolo richiederebbe di toccare `chessboard.css` (passare da vw a percentuali/container query): fuori scope, coerente con l'Out Of Scope di ISSUE-002. Il pattern validato usa la board a dimensione intrinseca.
- **Stato "FEN non valida" senza titolo:** spostando `.play-head` nell'aside (dentro `@else`), il ramo errore resta senza intestazione. Il dettaglio variante si comporta allo stesso modo (`.detail-error` nudo), quindi è parità di pattern, ma va deciso consapevolmente.
- **Avviso motore nel pannello:** `.play-warn` compare/scompare in base a `engineUnavailable()`; nel pannello a colonna non deve spostare la board (colonne indipendenti in flex row: ok per costruzione).
- **Viewport bassi (<~900px utili):** board ~760px + topbar: possibile scroll residuo fuori dallo scenario 1080 — limite già noto e accettato per il dettaglio variante (review ISSUE-002, "rischi residui"), non regressivo.
- **Larghezze ~800–1280px:** area delicata documentata ("Responsive scacchiera", `docs/stato-corrente.md:71`): il pannello scenderà sotto la piega come nel dettaglio variante. Non tentare il fix globale qui: c'è una proposta UX in archivio da validare prima.
- **ISSUE-005 (mosse del motore mute) vive su `/play`:** non toccarne il perimetro (nessuna modifica a `MoveSoundService` o alla logica motore) per non intrecciare i due bug.
- **Collaborazione Claude/Codex:** il componente `play` non ha modifiche pendenti (`git status` pulito, unico commit storico `b16a4c6`), ma ricontrollare lo stato del repo prima di implementare, come da istruzioni di progetto.

## Decisions

- **Tipografia del titolo nel pannello:** allineare il titolo al pattern del dettaglio variante, usando una dimensione piu' vicina a `1.5rem` rispetto agli attuali `1.8rem`. La scelta riduce l'ingombro verticale del pannello ed evita un titolo sproporzionato dentro la colonna laterale.
- **Titolo nello stato "FEN non valida":** lasciare il messaggio semplice senza reintrodurre un'intestazione dedicata. Questa scelta mantiene la parita' con il dettaglio variante (`.detail-error`) e non aggiunge testo sopra la board negli stati normali.
- **Contenitore unico o annidato:** mantenere `.play` come wrapper e adeguare `.play-grid`, invece di promuovere `.play` a flex container unico. Le due soluzioni sono equivalenti per il risultato, ma mantenere `.play-grid` minimizza il diff e riduce il rischio di regressioni non necessarie.

## Open Questions

- Nessuna domanda aperta bloccante dopo le decisioni sopra.

## Out Of Scope

- Backend e API (bug puramente di layout frontend); nessun aggiornamento a `docs/architettura.md` richiesto.
- Modifiche a `chessboard.css`/`chessboard.html` (dimensionamento board, cornice, coordinate): la board resta `min(90vw, 720px)` come nel resto dell'app.
- Rework responsive globale per larghezze ~800–1280px o viewport bassi (area delicata nota con proposta UX in archivio da validare).
- ISSUE-005 (suono mosse del motore su `/play`) e ogni altra issue del backlog che tocca la stessa pagina.
- Dettaglio variante (`variant-*`): già sistemato con ISSUE-002, qui è solo riferimento.
- `variant-training` e perimetro Stockfish in allenamento (vincolo di dominio, non toccato).
- Database locale `backend/data/scacchi.mv.db` (non pertinente; non includerlo in eventuali commit del fix).
