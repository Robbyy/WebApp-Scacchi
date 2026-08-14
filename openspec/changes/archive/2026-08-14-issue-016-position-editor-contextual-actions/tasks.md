## 1. Formalizzazione e contesto

- [x] 1.1 Confermare il perimetro posizionale `MIDDLEGAME`/`ENDGAME` e la regressione completa
  delle Aperture senza modificare `Study.phase`, `Variant`, API o persistenza.
- [x] 1.2 Riesaminare il template condiviso e identificare i blocchi condizionati da
  `positionMode`/fase senza iniziare l'implementazione prima dell'approvazione della change.

## 2. Editor posizionale contestuale

- [x] 2.1 Rendere il breadcrumb del solo editor posizionale testuale e non focalizzabile, con
  semantica accessibile della pagina corrente.
- [x] 2.2 Rimuovere nel contesto posizionale kicker «MODIFICA POSIZIONE», comando «Posizioni» e
  label «posizione iniziale».
- [x] 2.3 Rimuovere «Motore» dall'editor posizionale e portare «Mosse & rami» nella stessa posizione
  gerarchica, preservando replay, contatore, ramo, azioni, Salva e Annulla.
- [x] 2.4 Lasciare invariato il percorso editor delle Aperture e documentare eventuali differenze
  deliberate rispetto al contratto posizionale.

## 3. Verifica e compatibilità Finale

- [x] 3.1 Aggiornare test frontend di presenza/assenza, ordine DOM, accessibilità, guard e
  regressione Aperture.
- [x] 3.2 Verificare browser su H2 temporaneo a 1600/1440/1024/768/375/320 px, inclusi tab order,
  assenza di overflow, Salva, Annulla, replay e azioni sui nodi.
- [x] 3.3 Verificare che il dettaglio posizionale conservi il motore e che R28 non venga anticipata.
- [x] 3.4 Registrare nella matrice di accettazione della futura change R27 l'evidenza equivalente
  con dati `ENDGAME`; il riuso del codice non chiude il requisito da solo.

## 4. Chiusura

- [x] 4.1 Aggiornare checklist, stato corrente, backlog, roadmap, piano rilasci e README con lo
  stato reale del gate e delle evidenze, senza anticipare la chiusura formale della change.
- [x] 4.2 Eseguire `openspec validate --all --strict`, review finale e archiviazione solo dopo
  implementazione, test, verifica browser e accettazione.

---

## Note di esecuzione (2026-08-14)

- **2.1–2.3** sono realizzate in `frontend/src/app/variants/variant-editor.html` e nel commento di
  contratto di `variant-editor.ts`. La condizione è `isPosition()`, cioè la fase dello studio
  padre: vale quindi per `MIDDLEGAME` e `ENDGAME` e anche quando l'editor è montato da una route
  generica. `variant-editor.css` perde le regole di link del breadcrumb, ora inutili.
  L'albero è un unico `ng-template` riusato in due posizioni con `NgTemplateOutlet`
  (`@angular/common`, già dipendenza diretta): non c'è duplicazione di markup e l'ordine cambia nel
  DOM, non via CSS.
- **2.4** non ha prodotto differenze deliberate: l'editor Aperture conserva kicker, «Varianti»,
  campo colore, barra motore con «Gioca contro il computer», label «posizione iniziale» e albero
  dopo le azioni sui nodi. La condizione `@if (isOpening())` interna alla barra motore è stata
  rimossa perché ora provabilmente ridondante (la barra esiste solo nel ramo non posizionale).
- **3.1**: `variant-editor.spec.ts` passa da 455 a 461 test frontend, con un blocco dedicato
  «editor posizionale contestuale (R26.2)» che copre breadcrumb senza voci focalizzabili, assenza
  dei quattro elementi con posizioni sorelle comunque disponibili, ordine DOM del pannello,
  operazioni di editing e regressione Aperture.
- **3.2**: verifica su `H2_DB_PATH` temporaneo alle sei larghezze; nessun overflow orizzontale,
  nessun elemento focalizzabile nel breadcrumb, replay/guard/salvataggio/annullamento operativi,
  console senza errori. Il database condiviso `backend/data/scacchi.mv.db` è rimasto invariato
  (`86016` byte, SHA-256 `144FD67C…61C943`).
- **3.3**: il dettaglio posizionale conserva il motore, la navigazione fra posizioni e l'analisi
  inizialmente nascosta, e continua a non esporre «Gioca contro il computer» (R28 non anticipata).
- **3.4**: la change R27 (`issue-016-endgame-section`) non esiste ancora. La consegna di R26.2 è
  chiusa perché l'obbligo è registrato nella matrice «Gate futuro R27 — editor posizionale
  contestuale R26.2» di `docs/checklist-e2e.md`; R27 dovrà recepirlo e numerarlo nei propri
  artefatti. Il test automatico su uno studio `ENDGAME` dimostra solo che il contratto dipende
  dalla fase e non sostituisce quel gate.
- **4.2**: review finale completata, `openspec validate --all --strict` verde e change archiviata
  senza `--skip-specs` il 2026-08-14.
