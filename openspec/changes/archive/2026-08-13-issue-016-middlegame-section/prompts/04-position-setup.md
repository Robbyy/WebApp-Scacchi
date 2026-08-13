# Prompt AI esterna — R26, blocco 4

Repository: `C:\Sviluppo\Workspace - Intellij\WebApp Scacchi`

Leggi prima:

- `openspec/changes/archive/2026-08-13-issue-016-middlegame-section/proposal.md`
- `openspec/changes/archive/2026-08-13-issue-016-middlegame-section/design.md`
- `openspec/changes/archive/2026-08-13-issue-016-middlegame-section/specs/middlegame-study-section/spec.md`
- `openspec/changes/archive/2026-08-13-issue-016-middlegame-section/tasks.md`

Poi leggi `PositionEditor`, template e test, `VariantService`, `StudyService`,
`study-sections.ts`, `app.routes.ts` e i contratti FEN introdotti in R25.

## Scope

Completa esclusivamente i task `4.1–4.4`:

- rendi `PositionEditor` consapevole del contesto Mediogioco per
  `/middlegame/positions/new?studyId=:id` e
  `/middlegame/positions/:id/setup`;
- sotto `/middlegame` verifica la fase esatta dello studio padre (`MIDDLEGAME`)
  prima di presentare o modificare la posizione; rifiuta `OPENING` ed
  `ENDGAME` con errore e senza editor;
- usa `sectionContext`/`sectionPaths` per breadcrumb, Annulla e redirect:
  creazione annullata allo studio padre, setup annullato al dettaglio posizione,
  setup salvato a `/middlegame/positions/:id/edit`;
- preserva composizione visuale, FEN canonica, `studyId`, albero esistente,
  guard modifiche non salvate e validazioni frontend/backend R25;
- aggiungi test per creazione/setup Mediogioco, payload e redirect,
  annullamenti, fasi errate e regressione completa dei contratti FEN R25.

## Vincoli

- Non modificare backend, API, migration, dipendenze o
  `backend/data/scacchi.mv.db`.
- Non modificare proposal, design o spec; marca solo `4.1–4.4` in `tasks.md`
  dopo aver verificato implementazione e test.
- Non implementare dettaglio posizione o editor delle mosse: appartengono al
  blocco 5.
- Mantieni il comportamento delle route generiche Aperture/R25 e non alterare
  la logica FEN già stabilizzata.
- Non introdurre supporto Finale sotto `/endgame` in R26.
- Usa `apply_patch`; nessun commit, push o archivio OpenSpec.

## Verifica e report

Esegui:

```powershell
git diff --check -- frontend/src openspec/changes/archive/2026-08-13-issue-016-middlegame-section
npm test -- --watch=false
```

Riporta file modificati, task completati, test effettivi, eventuali scostamenti
e conferma che backend, dipendenze e database protetto non siano stati modificati.
Non dichiarare verifiche manuali non realmente eseguite.
