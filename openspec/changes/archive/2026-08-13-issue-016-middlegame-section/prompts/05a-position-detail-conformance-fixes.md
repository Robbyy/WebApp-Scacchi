# Prompt AI esterna — R26, correzioni conformità blocco 5

Repository: `C:\Sviluppo\Workspace - Intellij\WebApp Scacchi`

Leggi integralmente:

- `openspec/changes/archive/2026-08-13-issue-016-middlegame-section/proposal.md`
- `openspec/changes/archive/2026-08-13-issue-016-middlegame-section/design.md`
- `openspec/changes/archive/2026-08-13-issue-016-middlegame-section/specs/middlegame-study-section/spec.md`
- `openspec/changes/archive/2026-08-13-issue-016-middlegame-section/tasks.md`
- `openspec/changes/archive/2026-08-13-issue-016-middlegame-section/prompts/05-position-detail-and-move-editor.md`

Poi riesamina `VariantDetail`, `VariantEditor`, template e relativi test.

## Scope correttivo

Correggi esclusivamente le due non conformità rilevate nel blocco 5:

1. `VariantDetail` deve mostrare sotto `/middlegame` un vero breadcrumb
   coerente e canonico, distinto dal solo link finale «Torna allo studio».
   Deve includere almeno la sezione Mediogioco e lo studio padre con i relativi
   URL canonici, oltre alla posizione corrente.
2. Sotto una route Mediogioco, `VariantDetail` e `VariantEditor` non devono
   presentare né rendere modificabile la posizione tra la risposta della
   variante e la successiva verifica dello studio padre. Introduci uno stato
   esplicito di verifica della sezione:
   - durante la verifica mostra soltanto uno stato di caricamento;
   - presenta dettaglio/editor solo dopo `study.phase === 'MIDDLEGAME'`;
   - per studio `OPENING`, `ENDGAME`, assente o illeggibile mostra solo l'errore
     di sezione;
   - `VariantEditor.save()` deve essere inerte finché la verifica non è
     conclusa positivamente;
   - durante l'attesa non devono apparire controlli Aperture, inclusi «Gioca
     contro il computer», training, review, statistiche o scelta del lato.

Aggiungi test realmente asincroni con `Subject` o equivalente che separino la
risposta della posizione da quella dello studio e verifichino lo stato
intermedio, il blocco del salvataggio, l'esito valido/errato e il breadcrumb.
Mantieni tutti i test e i comportamenti Aperture esistenti.

## Vincoli

- Non ampliare lo scope oltre questa correzione e non modificare i task 6–7.
- Non modificare backend, API, migration, dipendenze, `PositionEditor` o
  `backend/data/scacchi.mv.db`.
- Non modificare proposal, design o spec.
- Dopo verifica positiva marca solo `5.1`, `5.3`, `5.4`, `5.5` e `5.6`; lascia
  invariata la checkbox `5.2` già completata.
- Usa `apply_patch`; nessun commit, push o archivio OpenSpec.

## Verifica e report

Esegui:

```powershell
git diff --check -- frontend/src openspec/changes/archive/2026-08-13-issue-016-middlegame-section
npm test -- --watch=false
npm run build
openspec validate "issue-016-middlegame-section" --type change --strict
```

Riporta file modificati, test effettivi, stato delle checkbox, scostamenti e
conferma che backend, dipendenze e database protetto non siano stati modificati.
