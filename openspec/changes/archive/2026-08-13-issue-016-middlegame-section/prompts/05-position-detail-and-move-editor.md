# Prompt AI esterna — R26, blocco 5

Repository: `C:\Sviluppo\Workspace - Intellij\WebApp Scacchi`

Leggi prima:

- `openspec/changes/archive/2026-08-13-issue-016-middlegame-section/proposal.md`
- `openspec/changes/archive/2026-08-13-issue-016-middlegame-section/design.md`
- `openspec/changes/archive/2026-08-13-issue-016-middlegame-section/specs/middlegame-study-section/spec.md`
- `openspec/changes/archive/2026-08-13-issue-016-middlegame-section/tasks.md`

Poi leggi `VariantDetail`, `VariantEditor`, template e test, `StudyVariantNav`,
`study-sections.ts`, `VariantService`, `StudyService`, Stockfish e le route
Mediogioco già introdotte.

## Scope

Completa esclusivamente i task `5.1–5.6`:

- rendi `VariantDetail` consapevole del contesto di route e, sotto
  `/middlegame`, verifica che la posizione appartenga a uno studio con fase
  esattamente `MIDDLEGAME`; per fase errata o studio mancante mostra errore e
  non presentare/modificare il contenuto;
- usa `sectionContext`/`sectionPaths` per breadcrumb, ritorno allo studio,
  navigazione rail/drawer fra posizioni sorelle e tutti i link Mediogioco;
- nel dettaglio preserva scacchiera da `startingFen`, replay, rami, commenti,
  NAG, FEN con albero vuoto e analisi Stockfish/bar/PV; aggiungi azioni distinte
  «Configura posizione iniziale» verso `.../positions/:id/setup` e «Modifica
  mosse» verso `.../positions/:id/edit`;
- per una posizione Mediogioco non mostrare training, review, statistiche o
  «Gioca contro il computer» e non eseguire richieste review non necessarie;
  preserva integralmente questi comportamenti per le varianti `OPENING`;
- rendi `VariantEditor` consapevole del contesto Mediogioco, verifichi la fase
  esatta dello studio padre, mantenga FEN/albero/annotazioni, guard e analisi,
  usi URL canonici per sibling e dopo il salvataggio apra
  `/middlegame/positions/:id`;
- nell’editor Mediogioco nascondi «Gioca contro il computer», mantenendo
  Stockfish, barra/PV e tutte le azioni Aperture; aggiungi/aggiorna test per
  albero pieno/vuoto, FEN custom, fase errata, URL, sibling, setup/edit,
  Stockfish/R28 e regressione Aperture.

## Vincoli

- Non modificare backend, API, migration, dipendenze o
  `backend/data/scacchi.mv.db`.
- Non modificare proposal, design o spec; marca solo `5.1–5.6` in `tasks.md`
  dopo aver verificato implementazione e test.
- Non modificare `PositionEditor` salvo integrazione strettamente necessaria:
  il blocco 4 è concluso.
- Non implementare verifiche/documentazione dei blocchi 6–7 e non attivare
  Finale, training, review o gioco contro Stockfish per Mediogioco.
- Mantieni invariati route, URL, training/review/statistiche/gioco delle
  Aperture e il comportamento del segnaposto `/endgame`.
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
