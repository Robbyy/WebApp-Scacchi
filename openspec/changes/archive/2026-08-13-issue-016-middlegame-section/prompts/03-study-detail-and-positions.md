# Prompt AI esterna — R26, blocco 3

Repository: `C:\Sviluppo\Workspace - Intellij\WebApp Scacchi`

Leggi prima gli artefatti vincolanti:

- `openspec/changes/archive/2026-08-13-issue-016-middlegame-section/proposal.md`
- `openspec/changes/archive/2026-08-13-issue-016-middlegame-section/design.md`
- `openspec/changes/archive/2026-08-13-issue-016-middlegame-section/specs/middlegame-study-section/spec.md`
- `openspec/changes/archive/2026-08-13-issue-016-middlegame-section/tasks.md`

Poi leggi `StudyDetail`, template e test, `study-sections.ts`, `StudyService`,
`VariantService`, `Variant` e le route/test già introdotti per Mediogioco.

## Scope

Completa esclusivamente i task `3.1–3.5`:

- rendi `StudyDetail` consapevole del contesto di route e, solo sotto
  `/middlegame`, accetta esclusivamente studi con `phase === 'MIDDLEGAME'`;
  per ID `OPENING` o `ENDGAME` mostra un errore di sezione senza presentare il
  contenuto;
- usa gli helper/context esistenti per breadcrumb, ritorni, cancellazione e
  redirect, mantenendo invariato il comportamento delle route Aperture;
- sotto Mediogioco mostra metadati, conteggio e card delle posizioni, con link a
  `/middlegame/positions/:id`, stato vuoto e CTA a
  `/middlegame/positions/new?studyId=:id`; conserva modifica metadati e CRUD
  tramite le API esistenti;
- nascondi per Mediogioco statistiche, import/sync Lichess, PGN, training e
  badge/terminologia non applicabili; conserva le azioni Aperture;
- aggiungi o aggiorna i test per fase corretta/errata, URL canonici, breadcrumb,
  stato vuoto, CRUD, terminologia posizionale e regressione Aperture.

## Vincoli

- Non modificare backend, API, migration, dipendenze o
  `backend/data/scacchi.mv.db`.
- Non modificare proposal, design o spec; marca solo `3.1–3.5` in `tasks.md`
  dopo avere verificato implementazione e test.
- Non implementare ancora setup posizione, dettaglio posizione o editor delle
  mosse: appartengono ai blocchi 4 e 5.
- Preserva la logica di `StudyDetail` per le Aperture, inclusi import Lichess,
  PGN, statistiche, route generiche e terminologia «variante».
- Riusa `sectionContext`/`sectionPaths` e non creare URL generici per i link
  generati dal dettaglio Mediogioco.
- Usa `apply_patch`; nessun commit, push o archivio OpenSpec.

## Verifica e report

Esegui:

```powershell
git diff --check -- frontend/src openspec/changes/archive/2026-08-13-issue-016-middlegame-section
npm test -- --watch=false
```

Riporta file modificati, task completati, test effettivi, eventuali scostamenti
e conferma che backend, dipendenze e database protetto non siano stati modificati.
Non dichiarare eseguite verifiche manuali non realmente svolte.
