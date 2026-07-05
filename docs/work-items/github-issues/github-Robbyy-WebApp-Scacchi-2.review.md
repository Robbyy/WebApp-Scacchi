# Revisione: ISSUE-002 — Pulsanti motore fuori viewport (dettaglio variante)

Task: `docs/work-items/github-issues/github-Robbyy-WebApp-Scacchi-2.task.md` (fonte: https://github.com/Robbyy/WebApp-Scacchi/issues/2)
Analisi: `docs/work-items/github-issues/github-Robbyy-WebApp-Scacchi-2.analysis.md`
Report Di Implementazione: nessuno
Repository: `C:\Sviluppo\Workspace - Intellij\WebApp Scacchi`
Sorgente Implementazione: diff 55e5fab..b401f9c (commit `b401f9c` "Fix variant detail engine controls layout")
Data: 2026-07-05
Esito: APPROVED_WITH_NOTES

## Sintesi Esecutiva

L'implementazione fa esattamente ciò che il task e l'analisi prescrivono: sposta i controlli motore da sotto la scacchiera al pannello laterale destro, in un blocco dedicato `.engine-panel`, rimuovendo la causa strutturale dell'overflow verticale. Il diff è minimale, chirurgico e coerente con la direzione validata nell'analisi (blocco dedicato, **non** dentro `.detail-actions`). Nessun file di logica o di test è stato toccato; la suite unit frontend, rieseguita in fase di revisione, resta verde (174/174).

Esito `APPROVED_WITH_NOTES` e non `APPROVED` per due motivi non bloccanti: (1) il criterio di accettazione centrale — "nessuna scrollbar verticale a 1920×1080" — è una proprietà di layout **non coperta da alcun test automatico** e non documentata da un report di implementazione, quindi il gate rimane una verifica manuale; (2) il commit `b401f9c` impacchetta anche il documento di analisi insieme al fix (mix doc+codice nello stesso commit).

## Controllo Ambito

- **Aderente al task.** Il diff tocca solo `variant-detail.html` e `variant-detail.css` (+ il doc di analisi). Nessuna modifica a backend, a `chessboard.css`, alla dimensione della board o a `variant-training` — coerente con l'"Out Of Scope" dell'analisi.
- **Vincolo di dominio preservato.** Nessuna modifica a `variant-training`: Stockfish resta fuori dall'allenamento (vincolo costruttivo del progetto). Confermato dall'assenza di quel path nel range.
- **Lavoro collegato rimasto contestuale.** ISSUE-001 (pattern 2-col `/play`) e ISSUE-010 (pannello varianti a 3 colonne) non sono stati anticipati: nessuna ristrutturazione a colonne, come previsto. Bene.
- **Nota di ambito minore:** il range include `docs/work-items/.../github-Robbyy-WebApp-Scacchi-2.analysis.md` (nuovo file) nello stesso commit del fix. È il documento di analisi di *questa* issue, quindi pertinente, ma mescola artefatto documentale e codice in un unico commit.

## File Modificati

- `frontend/src/app/variants/variant-detail.html`: rimosso il blocco `.engine-bar` + `.engine-note` da dentro `.board-col`; reinserito in un nuovo contenitore `.engine-panel` dentro `<aside class="side">`, subito dopo l'header e prima della CTA `@if (isOpening())`. Tutti i binding (`toggleEngine`, `playVsComputer`, `engineOn`, `showEvalBar`, `toggleEvalBar`, `engineAvailable`, `engineEval`) sono trasferiti identici.
- `frontend/src/app/variants/variant-detail.css`: aggiunta la regola `.engine-panel` (flex column, `gap: 0.5rem`) con commento che cita ISSUE-002; `.engine-bar` passa da `justify-content: center` a `flex-start` per coerenza con l'allineamento a sinistra del pannello.
- `docs/work-items/github-issues/github-Robbyy-WebApp-Scacchi-2.analysis.md`: nuovo documento di analisi (artefatto, non codice).

## Stato Repository

- Working tree **non pulito**: presente `M backend/data/scacchi.mv.db`.
- Questa modifica **non fa parte** del range revisionato (`b401f9c` non tocca il DB) ed è una modifica locale **non correlata** al fix di layout: è il file H2 tracciato, già modificato prima di questo lavoro. Segnalata solo come contesto: chi committa/mergia dovrebbe decidere separatamente se includerla o meno, senza confonderla con ISSUE-002.
- I file del fix (`variant-detail.html`/`.css`) non hanno drift rispetto al commit: ciò che è su disco coincide con `b401f9c`.

## Allineamento Al Task

- **"I due pulsanti nel pannello laterale destro insieme a Modifica variante / Torna allo studio / controlli replay"**: *soddisfatto*. I controlli motore sono ora dentro `<aside class="side">` (`variant-detail.html:30`, `.engine-panel`), nello stesso pannello di `.controls` (replay) e `.detail-actions`.
- **"Board e pannello entrambi visibili senza scrollbar verticale" a 1920×1080**: *soddisfatto per costruzione, ma non evidenziato da test*. La rimozione della `.engine-bar` da sotto la board accorcia strutturalmente `.board-col` (ora contiene solo `.board-with-eval`, `variant-detail.html:5-16`), eliminando la fonte dell'overflow. È però una proprietà di layout che nessun test automatico verifica e per cui non è stato fornito un report di implementazione: vedi Revisione Di Test E Verifiche.
- **"Il comportamento indesiderato (scrollbar) non si verifica più"**: *plausibilmente soddisfatto*, stesso ragionamento del punto precedente.
- **Passo di riproduzione (1920×1080 massimizzato)**: gestito a livello di struttura; conferma pixel-level demandata a verifica manuale.

## Allineamento All'Analisi

- **Direzione "blocco dedicato in `.side`, non in `.detail-actions`"** (Validation Note dell'analisi): *seguita fedelmente*. `.engine-panel` è un contenitore separato, distinto da `.detail-actions` (`variant-detail.html:142`). Le azioni motore non sono mescolate a modifica/statistiche/navigazione.
- **"Nessuna modifica a `variant-detail.ts` (binding e metodi invariati)"**: *rispettata*. Il `.ts` non è nel range; i binding sono preservati nel template.
- **"Evitare vincoli `vh` sulla board / non toccare `chessboard.css`"**: *rispettata*. Il fix non introduce hack di altezza né ridimensiona la board.
- **Rischio "eval-bar orfana" (toggle nel pannello, barra accanto alla board)**: *accettato come da analisi*. Il toggle "Nascondi/Mostra barra" vive ora nel pannello mentre `app-eval-bar` resta in `.board-with-eval`; l'azione resta corretta (segnale condiviso), la relazione visiva è più lasca. Trade-off consapevole, non un difetto.
- **Rischio "motore acceso = 3 pulsanti nel pannello a 380px"**: *gestito*. `.engine-bar` conserva `flex-wrap`, quindi i tre pulsanti vanno a capo senza rompere il pannello.

## Evidenze Dalla Sorgente Revisionata

- `frontend/src/app/variants/variant-detail.html:5-16`: `.board-col` ora contiene esclusivamente `.board-with-eval` (board + eval-bar); nessun controllo motore residuo sotto la board.
- `frontend/src/app/variants/variant-detail.html:30`: nuovo `<div class="engine-panel">` dentro `<aside class="side">`, dopo l'header.
- `frontend/src/app/variants/variant-detail.html:31-54`: `.engine-bar` con "Motore" (toggle), "Nascondi/Mostra barra" (condizionale `engineOn()`), "Gioca contro il computer" — binding identici all'originale.
- `frontend/src/app/variants/variant-detail.html:56`: `.engine-note` (motore non disponibile) spostata dentro `.engine-panel`, condizione `!engineAvailable()` invariata.
- `frontend/src/app/variants/variant-detail.html:60`: la CTA `@if (isOpening())` segue il blocco motore — ordine coerente col layout originale (motore visibile in alto).
- `frontend/src/app/variants/variant-detail.css:31-42`: `.engine-panel` (flex column) + `.engine-bar` con `justify-content: flex-start`.
- Diff `--name-only 55e5fab..b401f9c` su `*variant-detail.ts` e `*variant-detail.spec.ts`: vuoto → file di logica e test **non toccati**.

## Revisione Di Test E Verifiche

- **Suite unit frontend (rieseguita in revisione):** `npm test -- --watch=false` → **26 file, 174 test verdi**. Evidenza verificabile e indipendente: conferma che il template modificato **compila** (Angular compila i template nei test) e che nessun test esistente regredisce. Adeguata a coprire l'integrità dei binding.
- **Criterio di accettazione pixel-level (nessuna scrollbar a 1920×1080):** *non coperto da automazione*. È una proprietà di layout che la suite unit non può verificare. L'analisi aveva classificato un eventuale test DOM come "opzionale" e nessun test di regressione è stato aggiunto: scelta accettabile per il rischio basso, ma resta un gate **manuale**. Non è stato fornito alcun report di implementazione che documenti una verifica manuale a 1920×1080 (motore spento/acceso, motore non disponibile): questa verifica è quindi da eseguire/ripetere prima del merge se non già fatta.
- **Breakpoint intermedi e viewport bassi:** non evidenziata alcuna verifica su larghezze ~800–1280px o su altezze <~800px (l'area "responsive scacchiera" nota nei docs). Rischio residuo minore, coerente con lo scope della issue (mirata a 1080).

## Rilievi

- **[Minore] Nessun test di regressione per la proprietà di layout.** Il fix risolve un bug visivo senza lasciare un guard automatico: una futura reintroduzione della barra sotto la board non verrebbe intercettata dalla CI. Accettabile (l'analisi lo riteneva opzionale), ma vale la pena decidere consapevolmente se aggiungere un'asserzione leggera (es. presenza dei controlli motore dentro `.side`).
- **[Minore] Verifica di accettazione non documentata negli artefatti.** Manca un report che attesti il controllo manuale a 1920×1080; il criterio centrale della issue è quindi supportato solo da ragionamento strutturale + suite unit verde.
- **[Minore/ambito] Commit misto doc+codice.** `b401f9c` include il documento di analisi insieme al fix; separarli avrebbe reso il commit del fix più pulito. Nessun impatto funzionale.

## Rischi Residui

- Comportamento a larghezze intermedie (~800–1280px) e su viewport a bassa altezza non verificato: possibile scroll residuo fuori dallo scenario 1080, non regressivo rispetto a prima.
- Relazione visiva toggle eval-bar ↔ barra allentata (toggle nel pannello, barra accanto alla board): trade-off UX accettato, non un difetto.
- La modifica locale non correlata `backend/data/scacchi.mv.db` nel working tree potrebbe finire inavvertitamente in un commit successivo se non gestita separatamente.

## Raccomandazione

**Committabile/integrabile** così com'è: la modifica è corretta, minimale, aderente a task e analisi, con la suite unit verde e i vincoli di dominio preservati. Il commit `b401f9c` è già presente sul branch; nessuna correzione di codice è richiesta.

Follow-up prima del merge (non bloccanti):
1. eseguire/registrare la **verifica manuale a 1920×1080** (motore spento, acceso, non disponibile) a conferma esplicita del criterio di accettazione, dato che nessun test automatico lo copre;
2. valutare l'aggiunta di un'**asserzione di regressione leggera** (controlli motore presenti nel pannello `.side`);
3. **non includere** `backend/data/scacchi.mv.db` in eventuali commit di questo fix, essendo modifica non correlata;
4. opzionale: in futuro tenere il documento di analisi in un commit separato dal codice.
