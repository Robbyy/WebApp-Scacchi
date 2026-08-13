# Prompt AI esterna — R26, blocco 2

Repository: `C:\Sviluppo\Workspace - Intellij\WebApp Scacchi`

Leggi prima questi artefatti vincolanti:

- `openspec/changes/archive/2026-08-13-issue-016-middlegame-section/proposal.md`
- `openspec/changes/archive/2026-08-13-issue-016-middlegame-section/design.md`
- `openspec/changes/archive/2026-08-13-issue-016-middlegame-section/specs/middlegame-study-section/spec.md`
- `openspec/changes/archive/2026-08-13-issue-016-middlegame-section/tasks.md`

Poi leggi il codice coinvolto: `frontend/src/app/app.routes.ts`,
`frontend/src/app/core/study.service.ts`, `frontend/src/app/core/study-sections.ts`,
`frontend/src/app/studies/study-list.*`, `frontend/src/app/studies/study-new.*`,
`frontend/src/app/studies/study-form-fields.*` e i relativi test.

## Scope

Completa esclusivamente i task `2.1–2.5`:

- sostituisci il provvisorio `/middlegame` con una lista che chiami solo
  `StudyService.getStudiesByPhase('MIDDLEGAME')`;
- mostra loading, errore, empty state, card, conteggi «posizione/posizioni»,
  apertura a `/middlegame/studies/:id` e cancellazione con conferma/toast;
- non mostrare «Ripeti oggi», review, Lichess, PGN, training o statistiche;
- sostituisci `ComingSoon` su `/middlegame/studies/new` con una pagina manuale
  riusabile per le future sezioni posizionali: riusa `StudyFormFields`, invia
  `createStudy({ name, description, color, phase: 'MIDDLEGAME' })`, non usare la
  logica o i servizi Lichess di `StudyNew`;
- dopo la creazione naviga a `/middlegame/studies/:id`; «Annulla» torna a
  `/middlegame`; errori e nome obbligatorio restano nel form;
- aggiungi test per filtro, stati loading/error/empty, cancellazione, payload,
  navigazione e assenza delle funzionalità Aperture-only.

## Vincoli

- Non modificare backend, API, migration, dipendenze o `backend/data/scacchi.mv.db`.
- Non modificare proposal, design o spec; marca solo `2.1–2.5` in `tasks.md` dopo
  avere verificato tutto.
- Mantieni invariata la home Aperture (`/`), incluso `getStudies()` senza filtro,
  review, Lichess e pagina `StudyNew`.
- Mantieni `/endgame` sul segnaposto.
- Usa gli helper/context di `study-sections.ts` e i percorsi canonici già introdotti;
  non creare URL generici `/studies/...` per Mediogioco.
- Non duplicare inutilmente la logica delle card; riusa solo presentazione/stili
  quando non introduce comportamenti Aperture-only.
- Usa `apply_patch`; nessun commit, push o archivio OpenSpec.

## Verifica e report

Esegui:

```powershell
git diff --check -- frontend/src openspec/changes/archive/2026-08-13-issue-016-middlegame-section
npm test -- --watch=false
```

Riporta file modificati, task completati, test effettivi, eventuali scostamenti e
conferma che backend, dipendenze e database protetto non siano stati modificati.
Se un requisito è bloccato, fermati senza ampliare lo scope.
