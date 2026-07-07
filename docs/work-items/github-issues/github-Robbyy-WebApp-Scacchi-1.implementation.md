# Implementazione: ISSUE-001 — Layout /play errato su Full HD

Task: `docs/work-items/github-issues/github-Robbyy-WebApp-Scacchi-1.task.md` (fonte: https://github.com/Robbyy/WebApp-Scacchi/issues/1)
Analisi: `docs/work-items/github-issues/github-Robbyy-WebApp-Scacchi-1.analysis.md`
Review Precedente: nessuna
Repository: `C:\Sviluppo\Workspace - Intellij\WebApp Scacchi`
Data: 2026-07-07
Esito: COMPLETATA

## Sintesi

La pagina `/play` ("Gioca contro il computer") è stata portata al layout a due colonne del dettaglio variante (pattern ISSUE-002): scacchiera a dimensione intrinseca a sinistra, pannello laterale a larghezza definita (380px) a destra con titolo ("STOCKFISH / Gioca contro il computer"), stato partita, pulsante "Ricomincia", link "Chiudi e torna agli studi" e nota. Sopra e sotto la board non resta alcun testo; l'eventuale avviso "motore non disponibile" vive anch'esso nel pannello.

Le tre cause individuate dall'analisi sono state rimosse: il cap a 480px sull'host `app-chessboard` (la board interna si dimensiona da sola con `min(90vw, 720px)` e traboccava sul pannello), il contenitore a 900px (ora 1280px come `.detail`), e il titolo sopra la griglia (ora primo blocco del pannello). Verifica browser a 1920×1080: nessuna scrollbar verticale né orizzontale, board (760×760) e pannello (380px) affiancati senza sovrapposizione e interamente visibili. Suite frontend verde: 175 test (174 preesistenti + 1 nuovo di regressione). Nessun commit creato: le modifiche sono nel working tree.

## File Modificati

- `frontend/src/app/play/play.html`: l'header (`.play-head`: kicker + titolo) e l'avviso `.play-warn` sono stati spostati da sopra `.play-grid` a dentro `aside.play-side`, come primi blocchi del pannello (equivalente di `.side-head` + `.engine-note` del dettaglio variante). Il ramo `@if (status() === 'invalid')` è invariato (messaggio semplice senza board). Tutti i binding (`status`, `resultText`, `restart`, `fen`, `interactive`, `orientation`, `onUserMove`, `engineUnavailable`) sono trasferiti identici.
- `frontend/src/app/play/play.css`: `.play` da `max-width: 900px` a `1280px`; `.play-grid` con `gap: 2rem` e `justify-content: center` (parità con `.detail`); rimossa la regola `app-chessboard { display: block; width: min(100%, 480px) }` (resta solo `flex: 0 0 auto`), con commento che spiega perché l'host non va dimensionato; `.play-side` da `flex: 1; min-width: 220px` a `width: min(100%, 380px)` (parità con `.side`); `.play-title` da `1.8rem` a `1.5rem`; azzerati i margini esterni di `.play-head` (regola rimossa) e `.play-warn` (il `gap` del pannello gestisce la spaziatura).
- `frontend/src/app/play/play.spec.ts`: aggiunto un test di regressione leggero ("renders title and controls inside the side panel"): nessun `.play-head` figlio diretto di `.play`, titolo dentro `.play-side`, pulsante "Ricomincia" dentro `.play-side`. Nessuna asserzione su dimensioni in pixel.

Nessuna modifica a `play.ts`, `chessboard.*`, `variant-*`, backend o documenti di architettura (nessun endpoint/entità toccati; il fix non cambia lo stato funzionale descritto in `docs/stato-corrente.md`).

## Dettaglio Implementazione

- Ordine dei blocchi nel pannello: header → avviso motore (condizionale) → stato partita → "Ricomincia" → link di chiusura → nota. L'avviso subito dopo l'header replica la posizione della `.engine-note` nel pattern ISSUE-002.
- Il commento CSS su `app-chessboard` documenta il vincolo non evidente che ha causato il bug: la board interna usa unità viewport (`min(90vw, 720px)`), quindi un cap di larghezza sull'host non la riduce, la fa solo traboccare.
- Conti di layout confermati a runtime (vedi verifiche): contenuto utile 1232px = board 760 + gap 32 + pannello 380 = 1172 su una riga, coppia centrata; in verticale topbar + padding + board ≈ 888px.

## Allineamento Con L'Analisi

- **Piano (passi 1–4) seguito integralmente**: header e warn nel pannello, contenitore a 1280px, host board senza dimensionamento, pannello a `min(100%, 380px)`.
- **Decisione "tipografia"**: applicata — titolo a `1.5rem` come `.side-title`.
- **Decisione "FEN non valida"**: applicata — messaggio semplice senza intestazione (parità con `.detail-error`).
- **Decisione "contenitore"**: applicata — `.play` resta wrapper, adeguato `.play-grid` (diff minimo, `.detail`-parity sui valori).
- **Test di regressione leggero**: aggiunto come raccomandato (lezione della review ISSUE-002).
- **Deviazioni**: nessuna sostanziale. Unica aggiunta oltre il piano: i due commenti CSS che fissano il vincolo del pattern (posizione prevista dalla disciplina del repo, stile del commento ISSUE-002 in `variant-detail.css`).

## Verifiche Eseguite

- `npm test -- --watch=false` (frontend, Vitest headless): **26 file, 175 test verdi** (174 preesistenti + 1 nuovo). Gli avvisi `HTMLMediaElement play()/pause() not implemented` sono rumore jsdom preesistente, non errori.
- **Browser (dev server `ng serve`, viewport emulata 1920×1080, dpr 1)** su `/play`: `scrollHeight = 1080` = viewport → **nessuna scrollbar verticale**; nessuna scrollbar orizzontale; board 760×760 a x=374 (bordo inferiore a y=855), pannello 380px a x=1166; sovrapposizione board/pannello = 0; coppia centrata; titolo dentro `.play-side`; nessun `.play-head` fuori dalla griglia.
- **Browser a 1920×945** (altezza utile realistica di una finestra massimizzata a 1080 tolto il chrome del browser): nessuna scrollbar verticale (board termina a y=855).
- **Stato FEN non valida** (`/play?fen=not-a-fen`): messaggio "Posizione non valida" con link, nessuna board, nessuna scrollbar.
- **Viewport 1024×768** (fascia delicata ~800–1280px): pannello sotto la board, nessuna scrollbar orizzontale — comportamento noto documentato, parità col dettaglio variante.
- **Viewport mobile 375×812**: pannello sotto la board; overflow orizzontale di ~2px dovuto alla cornice della scacchiera (90vw + ~40px di cornice/coordinate), tratto preesistente di `chessboard.css` — prima del fix l'overflow su `/play` era maggiore (~26px, board non centrata), quindi migliorativo e fuori scope.
- **Smoke test interattivo** a 1920×1080: 1.e4 via click sulle case (e2→e4), il motore ha risposto 1...d5, stato tornato a "Tocca a te." — flusso utente→motore→utente integro dopo lo spostamento dei nodi. (Nota strumentale: i click sintetici del tool di preview a viewport emulata mancavano il bersaglio per un artefatto di scala; il test è stato eseguito con click DOM dall'interno della pagina.)
- **Console browser**: nessun errore né warning durante tutte le prove.
- `git status` / `git diff --stat`: modifiche limitate ai tre file del componente `play` (32 inserzioni, 23 rimozioni); working tree altrimenti pulito (solo i documenti di lavoro non tracciati). `backend/data/scacchi.mv.db` non toccato.

## Verifiche Non Eseguite

- **Motore non disponibile su `/play`**: nel dev server Stockfish carica sempre, quindi il caso `.play-warn` non è stato osservato live; la collocazione dentro il pannello è garantita dal template (l'`@if` è dentro l'aside) e compilata dai test. Riverificabile forzando `StockfishService.available()` a `false`.
- **Partita conclusa (`.play-status--over`) e orientamento Nero live**: logica invariata e coperta dai test unitari; non riprodotti in browser (solo variazioni di colore/orientamento dentro layout già verificato).
- **Monitor fisico 1920×1080 con finestra massimizzata**: la verifica è avvenuta con viewport emulata (1080 e 945 di altezza); il controllo sul monitor reale resta il passo finale di accettazione della issue (flusso 31 della checklist E2E come percorso d'ingresso).

## Rischi Residui

- **Viewport con meno di ~890px di altezza utile**: la board da 760px + topbar produce ancora scroll — limite noto, identico al dettaglio variante post ISSUE-002, fuori dallo scenario della issue.
- **Overflow orizzontale ~2px a viewport strettissime (<~400px)**: intrinseco alla cornice della scacchiera (`chessboard.css`), preesistente e comune a tutte le pagine con board; eventuale fix appartiene a un intervento dedicato sulla scacchiera, esplicitamente fuori scope.
- **Nessun guard automatico sul criterio pixel-level**: il nuovo test blinda la struttura (titolo/controlli nel pannello), ma "nessuna scrollbar a 1920×1080" resta una proprietà verificata manualmente/via browser, come per ISSUE-002.

## Blocchi O Follow-Up

- Nessun blocco. Follow-up suggeriti: (1) conferma visiva sul monitor fisico 1920×1080 massimizzato prima della chiusura della issue; (2) al commit, includere i soli tre file del componente `play` (+ eventuali documenti di lavoro), senza toccare `backend/data/scacchi.mv.db`; (3) valutare in una issue dedicata l'overflow ~2px della cornice board su viewport <400px.
