# Piano progressivo dei rilasci evolutivi

> **Aggiornato:** 2026-08-16 · **Stato:** in corso — **R20–R26.2 completati**;
> **R26 implementata, verificata e archiviata in OpenSpec il 2026-08-13**;
> **R26.1 implementata, verificata e archiviata in OpenSpec il 2026-08-14**;
> **R26.2 implementata, verificata e archiviata in OpenSpec il 2026-08-14**;
> **follow-up `f5bbb25` verificato nel flusso E2E 67 il 2026-08-16**;
> **R26.3 pianificata prima di R27**, con preflight, analisi e due change OpenSpec validate
> dalla CLI; governance indipendente ancora da eseguire;
> i rilasci da R26.3 in poi restano pianificazione.
>
> **Perimetro:** sole issue evolutive ancora aperte. I difetti registrati su GitHub,
> gli audit e l'infrastruttura non fanno parte di questa sequenza. La storia dei
> prototipi **P0–P19** resta nell'archivio; Liquibase (ISSUE-019) e la prima slice
> di dominio di ISSUE-016 sono già completati.

Questo piano usa le etichette **R20–R30** per descrivere la sequenza degli incrementi già
consegnati e futuri. Sono identificativi di pianificazione, non tag Git né promesse di deploy pubblico: un
rilascio si considera chiuso solo con criteri di accettazione verificati, test verdi
e documentazione aggiornata.

> Nota di tracciabilità: l'archivio storico dei prototipi contiene anche un precedente
> riferimento **R20** associato al Prototipo 14. Qui **R20** indica invece il primo
> rilascio evolutivo post-P19 (ISSUE-021); i due riferimenti appartengono a sequenze
> documentali diverse.

Riferimenti: [backlog](backlog.md),
[manutenzione evolutiva](backlog/manutenzione-evolutiva.md),
[sviluppi importanti](backlog/sviluppi-importanti.md),
[stato corrente](stato-corrente.md).

---

## Criteri usati per ordinare il lavoro

1. **Sbloccare prima le dipendenze di prodotto.** La navigazione a tre fasi precede
   le sezioni Mediogioco e Finale; l'hub Impostazioni precede la configurazione UCI.
2. **Ridurre i ritorni sulle stesse schermate.** Le evolutive che modificano home,
   dettaglio variante, editor o topbar sono raggruppate, senza fondere requisiti
   indipendenti in un'unica implementazione non verificabile.
3. **Consegnare valore subito.** La linea migliore del motore, richiesta durante
   l'uso dell'app, viene anticipata: è confinata al frontend e non attende MultiPV.
4. **Isolare i cambiamenti di dominio.** ISSUE-016 procede per slice OpenSpec;
   l'editor FEN non viene mescolato alle rifiniture UX perché modifica contratti,
   validazioni scacchistiche e dati persistiti.
5. **Rinviare le decisioni non ancora mature.** Settings e parametri Stockfish sono
   posti dopo le funzionalità di studio: occorre prima decidere se le preferenze
   vivono in `localStorage` o nel database, scelta che incide sul futuro multiutente.

---

## Inventario delle evolutive aperte

| Issue | Stato e valore | Impatto principale | Dipendenza / nota di pianificazione |
|---|---|---|---|
| **021** ✅ | Navigazione Aperture/Mediogioco/Finale; fondazione a basso rischio | topbar, route, segnaposto | rilasciata con R20 (2026-08-05) |
| **022** ✅ | Mostra la Principal Variation di Stockfish; valore immediato nello studio | parser UCI, servizio motore, pannello dettaglio | rilasciata con R21 (2026-08-05) |
| **007** ✅ | Elimina un controllo motore ridondante | pannello motore | rilasciata con R21 (2026-08-05) |
| **011** ✅ | Unifica il flusso per creare/importare uno studio | home, route, import Lichess, topbar | rilasciata con R22 (2026-08-06) |
| **012** ✅ | Rende modificabili i metadati dello studio | form e dettaglio studio | rilasciata con R22 (2026-08-06) |
| **009** ✅ | Usa meglio lo spazio dell'home su desktop | griglia card studi | rilasciata con R22 (2026-08-06) |
| **010** ✅ | Permette di passare tra varianti senza tornare allo studio | dettaglio variante, editor, layout responsivo | rilasciata con R23 (2026-08-10) |
| **008** ✅ | Rimuove l'auto-play non necessario | controlli del dettaglio variante | rilasciata con R23 (2026-08-10) |
| **013** ✅ | Operazioni rapide sull'albero di mosse | editor, menu contestuale, conferma | rilasciata con R24 (2026-08-10); mini-spec completata |
| **016** | Estende l'app a Mediogioco e Finale | modello, editor, API, sezioni UI | modello a fasi e R25–R26.2 completati; R26.3 pianificata, poi R27–R28 |
| **015** | Espone identità e versioni dell'app | topbar, contratto versione FE/BE | da consolidare con l'hub Impostazioni |
| **017** | Centralizza le impostazioni e parametrizza SM-2 | topbar, persistenza, `ReviewScheduler` | richiede OpenSpec e scelta DB/localStorage |
| **014** | Configura i parametri UCI del motore | worker Stockfish, Impostazioni | richiede audit UCI e ISSUE-017 |

### Stato particolare di ISSUE-016

La slice `issue-016-phase-domain-model` è già completata: `Study.phase` distingue
`OPENING`, `MIDDLEGAME` ed `ENDGAME`; import Lichess, training, statistiche e SM-2
rimangono intenzionalmente limitati alle Aperture.

`issue-016-move-comments` è stata completata con R24. `issue-016-custom-starting-fen` è stata
implementata, integrata in `master` e verificata manualmente con i flussi E2E 49–52.
`issue-016-middlegame-section` è implementata, verificata con i flussi E2E 53–58 e
archiviata in OpenSpec. Prima del Finale è pianificata **R26.3 — Studio guidato del Mediogioco**,
articolata nelle change sequenziali `issue-016-middlegame-guided-study-model` e
`issue-016-middlegame-guided-study-flows`. Seguono, in ordine di dipendenza,
`issue-016-endgame-section` e `issue-016-play-position-vs-engine`.

R25 è una vera slice di dominio, non una semplice UI: comprende il contratto API,
la validazione backend della FEN e dell'albero dalla posizione scelta, la derivazione
del colore tecnico e l'editor visuale. Le verifiche automatiche e manuali sono verdi;
la change è chiusa per R25. R26 ha reso reale Mediogioco riusando lo stesso contratto;
R26.3 ne aggiungerà lo studio guidato e il Finale resta nella slice R27 successiva.

---

## Sequenza proposta dei rilasci

| Rilascio | Issue / slice | Perché qui | Criterio di uscita essenziale |
|---|---|---|---|
| **R20 — Fondazione di navigazione** ✅ | **021** | È economica, rende visibile la direzione del prodotto e sblocca le sezioni future senza introdurre dati o logica di gioco. | ✅ Rilasciato il 2026-08-05: tab-link `/`, `/middlegame`, `/endgame`, segnaposto riusabile e stato attivo; una riga da 768px, due righe sotto con scorrimento del solo gruppo tab se necessario. |
| **R21 — Motore leggibile** ✅ | **022**, **007** | È il miglior incremento immediato per lo studio e concentra nel medesimo pannello la rimozione del toggle ridondante. | ✅ Rilasciato il 2026-08-05: `UciScore.pv` conserva l'intera sequenza UCI, `pvToSan`/`numberedPv` la rendono in SAN numerata dalla posizione analizzata e `StockfishService.bestLine` la azzera a ogni nuova analisi; il blocco «Linea migliore» sta in `.engine-panel` tra i controlli motore e «Allena questa variante», con «Analisi in corso…» finché manca la PV. Rimosso il toggle «Nascondi/Mostra barra» da dettaglio ed editor: spegnendo il motore spariscono barra e linea. Nessun contenuto aggiunto sotto la scacchiera. |
| **R22 — Ciclo di vita dello studio** ✅ | **011**, **012**, **009** | Evita tre passaggi separati sulla home/form: un solo modello di form può creare, modificare e importare, mentre la griglia viene verificata nello stesso contesto. | ✅ Rilasciato il 2026-08-06: pagina unica `/studies/new` (creazione, anteprima/upsert Lichess, `?studyId` verificato con semantica additiva preservata, redirect dalla route storica con query param), campi metadati condivisi `study-form-fields` riusati dalla modifica **inline** del dettaglio (`PUT` esistente, `phase` mai inviata), comando Lichess compatto in topbar con bozza in `sessionStorage` ripristinata al ritorno OAuth, griglia home `auto-fit/minmax(320px)` a massimo due colonne. Dettagli nell'[esito R22](backlog/manutenzione-evolutiva.md#esito-r22--issue-011-2026-08-06). |
| **R23 — Navigazione tra varianti** ✅ | **010**, **008** | Completa il flusso di consultazione della variante e affronta insieme i controlli della stessa schermata, dopo che R21 ne ha fissato il pannello motore. | ✅ Rilasciato il 2026-08-10: rail/drawer, guard editor e rimozione Auto-play; corretti i P1 su risposte HTTP fuori ordine e riavvio motore a FEN invariata. 288 test, build e checklist live a 1600/1440/1024/768/375/320px verdi. Dettagli nell'[esito R23](backlog/manutenzione-evolutiva.md#esito-r23--issue-010--issue-008-2026-08-10). |
| **R24 — Editor più espressivo** ✅ | **013**, `issue-016-move-comments` | Entrambi agiscono sul tree editor: una sola revisione dell'interazione sulle mosse riduce duplicazioni e rende l'editor utile anche prima delle nuove sezioni. | ✅ Rilasciato il 2026-08-10: menu azioni accessibile, commento/NAG nel tree JSON retrocompatibile, promozione ed eliminazione verificate; frontend 338 e backend 103 test verdi. «Elimina continuazioni» e annotazioni importate da PGN restano fuori scope. |
| **R25 — Posizioni manuali** ✅ | `issue-016-custom-starting-fen` | È il vero sblocco funzionale di Mediogioco/Finale e merita un rilascio isolato per il rischio scacchistico e di persistenza. | ✅ Rilasciata il 2026-08-13: OpenSpec valida, 120 test backend e 346 frontend verdi, task 6.1–6.3 chiusi e flussi E2E 49–52 verificati su H2 temporaneo. |
| **R26 — Mediogioco reale** ✅ | `issue-016-middlegame-section` | Trasforma il segnaposto di R20 nella prima sezione posizionale utilizzabile; riusa modello e editor stabilizzati in R25. | ✅ Implementata e verificata il 2026-08-13: lista/CRUD studi `MIDDLEGAME`, dettaglio e CRUD posizioni, setup FEN, editor/dettaglio/navigazione canonici e controllo esatto della fase; import Lichess, training, statistiche, review/SM-2 e gioco da posizione esclusi. 120 test backend, 446 frontend, build e flussi E2E 53–58 verdi. |
| **R26.1 — Consolidamento posizioni di studio** ✅ | `issue-016-positional-study-consolidation` | Sana in un solo incremento i correttivi emersi dall'uso reale del Mediogioco e fissa i contratti riusabili dal Finale. | Implementazione e verifica completate il 2026-08-14: 120 test backend, 455 frontend, build Angular, flussi browser 59–63 e misure ai sei viewport verdi; DB condiviso invariato nel gate. Change archiviata senza saltare l'aggiornamento delle spec. |
| **R26.2 — Editor posizionale contestuale** ✅ | `issue-016-position-editor-contextual-actions` | È un blocco UX coeso e frontend-only: chiude cinque incoerenze dell'editor prima di introdurre nuove route Finale, riducendo il rischio di confondere rifiniture condivise e regressioni di fase. | Implementazione, verifica e archiviazione completate il 2026-08-14: breadcrumb non interattivo, rimozione di kicker/«Posizioni»/«Motore»/«posizione iniziale» e «Mosse & rami» nello slot del motore. 461 test frontend, build Angular e flussi 64–66 ai sei viewport verdi; nessuna API, migration o implementazione Finale, DB condiviso invariato. Follow-up `f5bbb25` sul setup editor: suite a 462 test e flusso browser 67 superato il 2026-08-16 (viewport, salvataggio, Annulla/guard e regressione Aperture). |
| **R26.3 — Studio guidato del Mediogioco** | `issue-016-middlegame-guided-study-model` → `issue-016-middlegame-guided-study-flows` | Completa il valore didattico della prima sezione posizionale prima di replicarla nel Finale e separa la parte dati/migrazioni dai flussi interattivi. | Unico rilascio di prodotto dopo entrambe le change: studi tattici/strategici, catalogo temi normalizzato, metadati e ordine, compatibilità dei dati legacy, storico minimo, flussi tattico/strategico, modalità manuale/sequenziale e flussi E2E 68–81. |
| **R27 — Finale reale** | `issue-016-endgame-section` | Replica il paradigma del Mediogioco solo dopo averne validato il riuso, evitando di sviluppare due sezioni divergenti in parallelo. | Lista, studio, posizioni e dettaglio Finale riusano i componenti comuni; tutti i correttivi R26.1/R26.2 hanno evidenza `ENDGAME` dedicata, con rotte `/endgame`, sei viewport e regressione Aperture/Mediogioco verde. |
| **R28 — Gioco da posizione** | `issue-016-play-position-vs-engine` | Aggiunge il confronto con Stockfish solo quando esistono posizioni salvate affidabili da passare al motore. | Avvio di `/play` dalla FEN della posizione salvata; lato al tratto e posizione iniziale corretti; nessun training/review introdotto nelle sezioni posizionali. |
| **R29 — Informazioni e preferenze** | **015**, **017** | Chiude in modo coerente il cluster topbar dopo 021/011 e introduce le impostazioni solo con una scelta di persistenza esplicita. | OpenSpec 017; pagina Info con versioni FE/BE; decisione documentata DB vs `localStorage`; parametri SM-2 validati e applicati solo alle sessioni future. |
| **R30 — Configurazione del motore** | **014** | Viene dopo l'hub che ne offre accesso e salvataggio; evita di costruire UI per opzioni che il build asm.js non espone. | Audit UCI documentato sulla build vendorizzata; solo opzioni supportate esposte e persistite; `Threads` resta a 1; MultiPV non amplia automaticamente la UI di R21. |

### Perché R21 precede R23

ISSUE-010 può cambiare la disposizione del dettaglio, ma non è un prerequisito
funzionale della linea migliore: ISSUE-022 agisce nella catena `parseInfoLine` →
`StockfishService` → `.engine-panel`, che R23 deve preservare. Anticiparla consegna
subito valore e limita l'eventuale adattamento successivo al CSS del pannello, non al
parser o alla logica del motore.

### Perché R29/R30 sono dopo l'espansione delle sezioni

ISSUE-017 ha un rischio di decisione, non solo di codice: una tabella `app_settings`
single-user va riesaminata quando arriverà l'identità utente, mentre `localStorage`
non sincronizza le preferenze. Rimandare la decisione evita di consolidare un modello
di impostazioni incompatibile con il futuro multiutente. Se le preferenze diventano
urgenti prima di R29, serve aprire una mini-decisione separata e scegliere
esplicitamente `localStorage` oppure un modello già associabile a utente.

---

## Gate di pianificazione e verifica

| Prima di | Gate obbligatorio | Verifica dopo l'implementazione |
|---|---|---|
| R22 | ✅ [Mini-spec di ISSUE-011](backlog/manutenzione-evolutiva.md#mini-specifica-r22--issue-011) formalizzata: pagina unica, semantica del link Lichess e comportamento dell'upsert. | ✅ Eseguita (2026-08-06): test form/create/import, `studyId` valido/inesistente/non-Aperture, redirect storico e modifica inline (frontend 249 verdi); verifica live di flussi, bozza ripristinata dopo unload pieno, OAuth end-to-end con account Lichess reale, topbar e griglia a 1440/1024/768/320/280px. La precedente risposta 401 era legata alla rete di sviluppo. |
| R23 | ✅ [Mini-spec R23 — ISSUE-010 + ISSUE-008](backlog/manutenzione-evolutiva.md#mini-specifica-r23--issue-010--issue-008) formalizzata: rail da 1500px, drawer sotto soglia, navigazione esplicita nell'editor e rimozione Auto-play. | ✅ Eseguita (2026-08-10): P1 corretti con pipeline cancellabile e identità della variante caricata; frontend 288 verdi, build ok e checklist live 41–44 su app reale a 1600/1440/1024/768/375/320px. |
| R24 | ✅ [Mini-specifica R24](backlog/manutenzione-evolutiva.md#mini-specifica-r24--issue-013--issue-016-move-comments) formalizzata il 2026-08-10: NAG singolo, commento testuale limitato, JSON retrocompatibile, menu azioni accessibile; «Elimina continuazioni» resta fuori scope e tra i punti aperti. | ✅ Eseguita (2026-08-10, [esito R24](backlog/manutenzione-evolutiva.md#esito-r24--issue-013--issue-016-move-comments-2026-08-10)): backend 103 verdi e frontend 338 verdi, build ok e checklist live 45–48 a 1600/1440/1024/768/375/320px su una copia del DB H2; nessuna perdita di mosse o annotazioni, parser PGN/Lichess invariato. |
| R25 | ✅ OpenSpec completa; implementazione e test eseguiti (120 backend, 346 frontend). | ✅ Eseguita il 2026-08-13: flussi manuali 49–52 verificati su H2 temporaneo, con controllo di atomicità, compatibilità Aperture e terminologia posizionale. |
| R26 | ✅ OpenSpec completa; implementazione e test eseguiti senza ridecidere il modello a fasi. | ✅ Eseguita il 2026-08-13: 120 test backend, 446 frontend, build Angular riuscita e flussi manuali 53–58 su H2 temporaneo a 1600/1440/1024/768/375/320px; database condiviso invariato. |
| R26.1 | ✅ OpenSpec completa e validata; nessuna nuova API, migration o ridecisione del modello. | ✅ Implementazione, 120 test backend, 455 frontend, build, flussi 59–63 e misure `getBoundingClientRect()` completati ai sei viewport; DB condiviso invariato rispetto alla baseline del gate ed escluso dal lavoro. |
| R26.2 | ✅ OpenSpec completa e validata in strict; nessuna nuova API, migration o ridecisione del modello. | ✅ Implementazione, 461 test frontend, build e flussi 64–66 ai sei viewport completati: breadcrumb senza voci focalizzabili, assenza di «MODIFICA POSIZIONE», «Posizioni», «Motore» e «posizione iniziale», «Mosse & rami» nello slot del motore, replay/guard/salvataggio invariati e Aperture non regredite; DB condiviso invariato rispetto alla baseline del gate. |
| R26.3 | Proposal/design/spec/tasks completi e validi in strict per `issue-016-middlegame-guided-study-model` (40 task) e `issue-016-middlegame-guided-study-flows` (55 task). Prima del codice, ciascuna change richiede triage standalone e gate indipendenti `proposal`, `design+specs`, `tasks` con esito `READY`; poi implementare, verificare e archiviare la prima change prima di applicare i task della seconda. | Test backend/frontend, build e flussi 68–81 su H2 temporaneo; verificare migrazione dei dati legacy, validazione tattica backend, catalogo temi per ID, storico/cascate, motore strategico, filtri/skip, responsive e regressioni Aperture/R26.1/R26.2. |
| R27 | OpenSpec da completare includendo la matrice R26.1/R26.2 senza ridecidere il dominio o duplicare componenti in assenza di necessità reale. | Test automatici con fixture `ENDGAME`; verifica di CTA, form, azioni, setup FEN, analisi nascosta, eliminazione/redirect, editor contestuale, layout, geometria e navigazione sulle rotte `/endgame`; browser a 1600/1440/1024/768/375/320 px e regressioni Aperture/Mediogioco. Il riuso del codice non sostituisce alcuna evidenza. |
| R28 | OpenSpec completa per il gioco dalla posizione, riusando il modello e le sezioni posizionali approvate. | Test API/validazione, frontend e checklist manuale del flusso Stockfish dalla FEN salvata. |
| R29 | Decisione di persistenza delle preferenze e contratto versione backend. | Test di `ReviewScheduler` con parametri e verifica che le schedule esistenti non vengano ricalcolate. |
| R30 | Audit reale delle opzioni UCI emesse dal worker Stockfish asm.js. | Test del mapping opzioni/comandi UCI e verifica live del motore. |

## Lavoro preparatorio che può procedere senza cambiare il prodotto

- R20–R26.2 sono chiusi; **R26 è implementata, verificata e archiviata in OpenSpec**.
  I correttivi R26/R27 sono implementati e verificati nella change R26.1, ora archiviata;
  **R26.2 è implementata, verificata e archiviata in OpenSpec**.
- R26.3 è il prossimo rilascio: le decisioni sono consolidate nel
  [preflight](preflight-mediogioco-studio-guidato.md) e nell'[analisi](analisi-mediogioco-studio-guidato.md).
  Le due change OpenSpec sono attive, complete nei quattro artefatti e valide in strict. Il
  prossimo passo è la governance indipendente prevista da `openspec-v2`; soltanto dopo esiti
  `READY` i task devono procedere nell'ordine modello → flussi.
- R26.1 ha chiuso nel codice i punti registrati nello stato corrente:
  il primo è `R26-UI-01`, relativo alla CTA duplicata nello stato vuoto della lista studi, e il
  secondo è `R26-UI-02`, relativo al campo Colore da nascondere nei form degli studi posizionali.
  Il campo resta disponibile nelle Aperture e il riuso per R27 passa dallo stesso input contestuale.
  Sono inoltre implementati `R26-UI-03` (CTA nascosta durante la modifica), `R26-UI-04`
  (griglia FEN 8×8 invariabile), `R26-UI-05` (eliminazione dal dettaglio con ritorno allo studio)
  e `R26-UI-06` (barra motore fuori dal flusso). Il riuso e le misure live del layout sono stati
  verificati ai sei viewport; R27 dovrà ripetere le stesse prove con dati `ENDGAME`.
- `R26-FUNC-07` è stato specificato e implementato nella stessa change OpenSpec R26.1:
  Mediogioco e Finale devono trattare ogni posizione come posizione di studio, mostrando inizialmente
  solo la `startingFen` e rivelando l'analisi completa su richiesta. In questa fase restano esclusi
  suggerimenti progressivi, autoverifica interattiva e qualsiasi estensione del training posizionale.
  R26.3 non altera retroattivamente quel dettaglio: introduce un flusso guidato separato, con due
  stati di rivelazione, senza riusare il training Aperture.
- Il correttivo condiviso `R26-UI-08` libera la colonna della scacchiera nell'editor
  delle mosse: dal pulsante Motore in poi i controlli operativi vanno nell'aside destro sui layout
  desktop, preservando la disposizione verticale responsive e lo stesso comportamento in tutte le fasi.
- `R26-UI-09` stabilizza la geometria fra dettaglio posizione ed editor mosse: una
  griglia condivisa deve mantenere la scacchiera nello stesso punto e con le stesse dimensioni anche
  quando compaiono breadcrumb, rail delle posizioni o pannelli laterali, sia in R26 sia in R27.
- `R26-UI-10` rende più compatta la navigazione posizionale eliminando il conteggio mosse
  dalle voci del rail e del drawer di Mediogioco/Finale, senza modificare i metadati mostrati nelle
  voci delle varianti di Apertura.
- R26.2 formalizza cinque correzioni ulteriori per l'editor posizionale: breadcrumb non attivo,
  rimozione del kicker «MODIFICA POSIZIONE», del pulsante «Posizioni», del pulsante «Motore» e
  della label «posizione iniziale», con «Mosse & rami» al posto del Motore. La change è
  `issue-016-position-editor-contextual-actions`; implementazione, verifica e archiviazione
  OpenSpec sono completate.
- La change R27 deve riportare nei propri proposal/design/spec/tasks tutti i dieci punti come
  matrice di accettazione, più i cinque punti R26.2. I componenti condivisi rendono probabile che non servano nuove correzioni,
  ma ogni punto resta da provare con fixture `ENDGAME`, percorsi canonici `/endgame` e browser reale;
  un test Mediogioco già verde non è, da solo, evidenza per Finale.
- R23 ha preservato la catena consegnata da R21
  (`parseInfoLine` → `StockfishService.bestLine` → `.engine-line` in `.engine-panel`):
  il riassetto ha riguardato layout e ciclo di cambio variante, non la logica UCI. Resta
  aperta la race tra due FEN consecutivi documentata sotto ISSUE-022.
- Non avviare implementazioni sovrapposte su topbar (021/011/015/017), dettaglio
  variante (022/007/010/008) o tree editor (013/commenti): sono le tre aree con il
  maggior rischio di conflitto e di regressione UX. Con R24 chiusa, il tree editor
  è di nuovo libero, ma chi lo tocca deve passare da `move-tree.ts` (annotazioni
  incluse) e non duplicarne la logica nei componenti.
