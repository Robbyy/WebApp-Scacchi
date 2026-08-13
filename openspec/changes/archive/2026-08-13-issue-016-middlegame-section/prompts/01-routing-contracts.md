# Prompt AI esterna — R26, blocco 1: contratti frontend e routing

## Contesto

Stai lavorando nel repository `WebApp Scacchi` per la change OpenSpec
`issue-016-middlegame-section`.

Prima di modificare file, leggi integralmente:

- `openspec/changes/archive/2026-08-13-issue-016-middlegame-section/proposal.md`
- `openspec/changes/archive/2026-08-13-issue-016-middlegame-section/design.md`
- `openspec/changes/archive/2026-08-13-issue-016-middlegame-section/specs/middlegame-study-section/spec.md`
- `openspec/changes/archive/2026-08-13-issue-016-middlegame-section/tasks.md`
- `frontend/src/app/app.routes.ts`
- `frontend/src/app/app.routes.spec.ts`
- `frontend/src/app/core/study.model.ts`
- `frontend/src/app/core/study.service.ts`
- `frontend/src/app/core/study.service.spec.ts`
- `frontend/src/app/core/study-sections.ts`
- `frontend/src/app/core/study-sections.spec.ts`
- `frontend/src/app/app.spec.ts`

Il modello a fasi e l’editor/FEN di R25 sono già stabilizzati. R26 deve mantenere
`Study.phase` immutabile, riusare `Study -> Variant` e lasciare invariati i flussi
Aperture. Non usare l’harness: esegui solo il lavoro richiesto in questo prompt.

## Scope autorizzato

Completa esclusivamente i task OpenSpec `1.1`, `1.2`, `1.3` e `1.4`:

1. aggiungere al `StudyService` la lettura filtrata per `GamePhase`, con query
   HTTP `phase=MIDDLEGAME`, lasciando invariato il comportamento di `getStudies()`;
2. introdurre un helper/contesto tipizzato per le route di sezione, con fase attesa,
   base canonica e percorsi di studio/posizione;
3. sostituire il mount del segnaposto `/middlegame` con una route strutturale e
   dichiarare le route canoniche Mediogioco, nell’ordine corretto:

   - `/middlegame`
   - `/middlegame/studies/new`
   - `/middlegame/studies/:id`
   - `/middlegame/positions/new?studyId=:id`
   - `/middlegame/positions/:id/setup`
   - `/middlegame/positions/:id/edit`
   - `/middlegame/positions/:id`

4. aggiornare i test di routing/topbar per verificare componenti, precedenza delle
   route statiche, conservazione di `studyId`, tab Mediogioco attivo sulle sotto-route
   e regressione Aperture/Finale.

## Decisioni vincolanti

- Le route Mediogioco devono usare il prefisso `/middlegame`; non usare in questo
  blocco i percorsi generici `/studies/...`, `/positions/...` o `/variants/...` per
  i link della sezione.
- Puoi montare temporaneamente i componenti condivisi già esistenti (`StudyList`,
  `StudyDetail`, `PositionEditor`, `VariantDetail`, `VariantEditor`) passando un
  contesto tipizzato nei `data` della route. Non implementare ancora lista filtrata,
  form manuale, controllo fase, breadcrumb o redirect: appartengono ai blocchi 2–5.
- Non creare copie `Middlegame*` dei componenti e non aggiungere stub duplicati.
- `/endgame` deve rimanere montato su `ComingSoon` con il comportamento esistente.
- Non aggiungere endpoint backend, migration Liquibase, dipendenze npm o Java.
- Non modificare `backend/data/scacchi.mv.db` in alcun modo; non avviare il backend
  contro quel database per test o preview.
- Non modificare proposal, design o spec. Puoi aggiornare le sole checkbox `1.1–1.4`
  in `tasks.md` dopo avere verificato tutti i criteri sotto.
- Usa `apply_patch` per le modifiche.

## Aspettative tecniche

- Mantieni `StudyService.getStudies()` senza parametri per la home Aperture.
- Aggiungi un metodo esplicito, ad esempio `getStudiesByPhase(phase: GamePhase)`,
  che usi `HttpParams` e produca esattamente `GET /api/studies?phase=MIDDLEGAME`.
- Il contesto route deve essere riusabile da R27 e non deve cambiare la funzione
  già esistente `sectionFromUrl`: quella funzione deve continuare a riconoscere
  `/middlegame/...`, `/endgame/...` e a classificare le route generiche come Aperture.
- Dati route consigliati: identificatore sezione, `GamePhase`, base canonica e
  modalità posizione. Scegli nomi coerenti con il codice esistente e documentali
  con un commento breve.
- Le route statiche `studies/new` e `positions/new` devono precedere le dinamiche;
  le route `setup`/`edit` devono essere dichiarate prima di `positions/:id`.
- I test non devono dipendere da un backend reale: usa `HttpTestingController`,
  `provideRouter` e gli stub già presenti nelle spec.

## Verifiche obbligatorie

Esegui almeno:

```powershell
git diff --check -- frontend/src openspec/changes/archive/2026-08-13-issue-016-middlegame-section
npm test -- --watch=false
```

Se la suite completa è troppo ampia per l’ambiente, esegui anche i test mirati di
`study.service`, `app.routes`, `study-sections` e `app`, ma non dichiarare la suite
completa verde se non l’hai eseguita.

Controlla inoltre che:

- la home `/` continui a montare `StudyList` senza query `phase`;
- `/endgame` continui a montare `ComingSoon`;
- `sectionFromUrl('/middlegame/positions/4')` restituisca `middlegame`;
- nessun test o comando abbia toccato `backend/data/scacchi.mv.db`.

## Output richiesto

Alla fine restituisci:

1. elenco dei file modificati;
2. descrizione breve di come hai implementato `1.1–1.4`;
3. comandi di test eseguiti e risultati effettivi;
4. eventuali task non completati o scostamenti dal design;
5. conferma esplicita che non hai modificato database, backend o dipendenze.

Non fare commit, push, merge, archivio OpenSpec o modifiche a task diversi da
`1.1–1.4`.
