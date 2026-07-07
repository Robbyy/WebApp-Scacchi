# Revisione: ISSUE-001 — Layout /play errato su Full HD

Task: `docs/work-items/github-issues/github-Robbyy-WebApp-Scacchi-1.task.md` (fonte: https://github.com/Robbyy/WebApp-Scacchi/issues/1)
Analisi: `docs/work-items/github-issues/github-Robbyy-WebApp-Scacchi-1.analysis.md`
Report Di Implementazione: `docs/work-items/github-issues/github-Robbyy-WebApp-Scacchi-1.implementation.md`
Repository: `C:\Sviluppo\Workspace - Intellij\WebApp Scacchi`
Sorgente Implementazione: working tree
Data: 2026-07-08
Esito: APPROVED_WITH_NOTES

## Sintesi Esecutiva

L'implementazione e' allineata al task e all'analisi: `/play` passa a un layout a due colonne con board a sinistra e pannello laterale a destra, spostando titolo e avviso motore dentro `aside.play-side`, rimuovendo il cap errato a 480px sull'host `app-chessboard` e portando il contenitore a 1280px. Il fix e' ristretto ai file del componente `play` e aggiunge anche una regressione DOM leggera.

Esito `APPROVED_WITH_NOTES`: nessuna correzione bloccante richiesta. Le note riguardano solo verifiche visuali residue/fisiche e rischi gia' dichiarati nel report, non difetti del codice.

## Controllo Ambito

- Il diff codice riguarda solo `frontend/src/app/play/play.html`, `frontend/src/app/play/play.css` e `frontend/src/app/play/play.spec.ts`.
- Gli artefatti di lavoro `github-Robbyy-WebApp-Scacchi-1.task.md`, `.analysis.md` e `.implementation.md` sono coerenti con il flusso issue -> task -> analisi -> implementazione.
- Nessuna modifica a `play.ts`, `chessboard.*`, `variant-*`, backend o database: lo scope resta frontend/layout come richiesto.
- ISSUE-002 viene usata solo come pattern di riferimento; non viene modificata.

## File Modificati

- `frontend/src/app/play/play.html`: rimuove header e warning dal livello sopra la griglia e li inserisce dentro `aside.play-side`; mantiene invariati board, binding e ramo FEN non valida.
- `frontend/src/app/play/play.css`: porta `.play` a `max-width: 1280px`, allinea `.play-grid` a gap 2rem/centratura, rimuove il width cap dall'host `app-chessboard`, imposta `.play-side` a `width: min(100%, 380px)` e riduce il titolo a `1.5rem`.
- `frontend/src/app/play/play.spec.ts`: aggiunge un test di regressione che verifica titolo e controlli nel pannello laterale.
- `docs/work-items/github-issues/github-Robbyy-WebApp-Scacchi-1.task.md`: nuovo task generato dalla issue.
- `docs/work-items/github-issues/github-Robbyy-WebApp-Scacchi-1.analysis.md`: analisi tecnica, inclusa chiusura delle decisioni operative.
- `docs/work-items/github-issues/github-Robbyy-WebApp-Scacchi-1.implementation.md`: report di implementazione.

## Stato Repository

- Working tree non pulito per modifiche pertinenti alla sorgente revisionata: tre file codice modificati e tre artefatti Markdown non tracciati.
- Il JSON sorgente della issue e' ignorato da Git come previsto dalla policy `docs/work-items/**/*.source.json`.
- Non risultano modifiche locali non correlate nel working tree al momento della review.

## Allineamento Al Task

- Layout a due colonne: soddisfatto. La griglia contiene board e `aside.play-side`, con il pannello a larghezza definita (`play.html:5-39`, `play.css:36-55`).
- Nessun testo sopra/sotto la board negli stati normali: soddisfatto. `.play-head` e `.play-warn` non sono piu' figli diretti di `.play`, ma vivono dentro l'aside (`play.html:14-24`).
- Pannello destro interamente visibile su Full HD: soddisfatto per struttura e riportato come verificato nel report browser 1920x1080.
- Pulsanti raggiungibili nel pannello: soddisfatto. Il pulsante `Ricomincia` e il link di chiusura restano dentro `aside.play-side` (`play.html:33-34`).
- Scenario 1920x1080: riportato come verificato nel report; non ho ripetuto la prova browser fisica, ma ho rieseguito la suite frontend.

## Allineamento All'Analisi

- Rimozione del cap a 480px sull'host `app-chessboard`: seguita (`play.css:44-48`).
- Contenitore a 1280px e pannello a circa 380px: seguito (`play.css:1-4`, `play.css:50-55`).
- Titolo e warning dentro il pannello laterale: seguito (`play.html:14-24`).
- Decisione di lasciare semplice lo stato FEN non valida: seguita (`play.html:2-4`).
- Decisione di mantenere `.play-grid` come contenitore della riga: seguita (`play.html:5`, `play.css:36-42`).
- Test di regressione leggero raccomandato: aggiunto (`play.spec.ts:71-80`).

## Evidenze Dalla Sorgente Revisionata

- `frontend/src/app/play/play.html:1-4`: nello stato `invalid` resta solo il messaggio semplice con link, senza board.
- `frontend/src/app/play/play.html:5-14`: negli stati validi, `.play-grid` contiene prima `app-chessboard` e poi `aside.play-side`.
- `frontend/src/app/play/play.html:15-24`: header "Stockfish / Gioca contro il computer" e warning motore sono nel pannello laterale.
- `frontend/src/app/play/play.html:26-38`: stato partita, pulsante, link e nota restano nel pannello laterale.
- `frontend/src/app/play/play.css:1-4`: wrapper portato a `max-width: 1280px`.
- `frontend/src/app/play/play.css:36-42`: `.play-grid` usa flex-wrap, gap 2rem, centratura e allineamento alto.
- `frontend/src/app/play/play.css:46-48`: l'host `app-chessboard` non ha piu' width forzata.
- `frontend/src/app/play/play.css:50-55`: pannello laterale a `width: min(100%, 380px)`.
- `frontend/src/app/play/play.spec.ts:71-80`: test dedicato alla regressione strutturale del layout.

## Revisione Di Test E Verifiche

- Eseguito in review: `npm test -- --watch=false` da `frontend` -> 26 file, 175 test verdi. Gli avvisi `HTMLMediaElement play()/pause() not implemented` sono rumore jsdom gia' presente e non falliscono la suite.
- Report di implementazione: dichiara verifica browser a 1920x1080 e 1920x945 senza scrollbar, pannello visibile, nessuna sovrapposizione board/pannello.
- Report di implementazione: dichiara smoke test interattivo su `/play` con mossa utente e risposta motore, senza errori console.
- Non ripetuta da me in questa review: verifica browser/monitor fisico. La considero riportata e coerente con il diff, ma resta una nota finale di accettazione manuale.

## Rilievi

- Nessun rilievo bloccante.
- [Nota] La proprieta' pixel-level "nessuna scrollbar su monitor fisico 1920x1080 massimizzato" resta principalmente una verifica manuale/browser. Il nuovo test copre bene la struttura DOM, non le dimensioni reali.
- [Nota] Il report segnala un overflow orizzontale residuo di circa 2px su viewport molto strette, attribuito alla cornice della scacchiera e fuori scope. Non e' regressivo per ISSUE-001.

## Rischi Residui

- Viewport con altezza utile inferiore a circa 890px possono ancora scrollare per via della board a dimensione intrinseca: limite noto e coerente con il dettaglio variante.
- Lo stato "motore non disponibile" non e' stato osservato live nel report, ma il template colloca il warning nel pannello e la suite compila il binding.
- Eventuali problemi responsive globali della scacchiera sotto i 400px restano fuori scope e andrebbero trattati in una issue dedicata.

## Raccomandazione

Committabile. Suggerisco di includere nello stesso commit i tre file codice del componente `play` e gli artefatti Markdown della ISSUE-001 (`.task.md`, `.analysis.md`, `.implementation.md`, `.review.md`), lasciando ignorato il `.source.json`.

Prima di chiudere la issue, se vuoi massima disciplina, fare un ultimo controllo visuale sul monitor fisico 1920x1080 massimizzato. Non serve rilanciare implementazione: il codice e' approvato con note.
