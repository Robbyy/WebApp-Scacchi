# Piano progressivo dei rilasci evolutivi

> **Aggiornato:** 2026-08-10 · **Stato:** in corso — **R20, R21, R22 e R23 rilasciati**; i
> rilasci successivi restano pianificazione.
>
> **Perimetro:** sole issue evolutive ancora aperte. I difetti registrati su GitHub,
> gli audit e l'infrastruttura non fanno parte di questa sequenza. La storia dei
> prototipi **P0–P19** resta nell'archivio; Liquibase (ISSUE-019) e la prima slice
> di dominio di ISSUE-016 sono già completati.

Questo piano usa le etichette **R20–R30** per ordinare i prossimi incrementi. Sono
identificativi di pianificazione, non tag Git né promesse di deploy pubblico: un
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
| **013** | Operazioni rapide sull'albero di mosse | editor, menu contestuale, conferma | mini-spec R24 formalizzata; condivide il lavoro UI con i commenti |
| **016** | Estende l'app a Mediogioco e Finale | modello, editor, API, sezioni UI | `phase-domain-model` già implementata; commenti in R24, restano quattro slice OpenSpec |
| **015** | Espone identità e versioni dell'app | topbar, contratto versione FE/BE | da consolidare con l'hub Impostazioni |
| **017** | Centralizza le impostazioni e parametrizza SM-2 | topbar, persistenza, `ReviewScheduler` | richiede OpenSpec e scelta DB/localStorage |
| **014** | Configura i parametri UCI del motore | worker Stockfish, Impostazioni | richiede audit UCI e ISSUE-017 |

### Stato particolare di ISSUE-016

La slice `issue-016-phase-domain-model` è già completata: `Study.phase` distingue
`OPENING`, `MIDDLEGAME` ed `ENDGAME`; import Lichess, training, statistiche e SM-2
rimangono intenzionalmente limitati alle Aperture.

Restano da realizzare `issue-016-move-comments` (già inclusa in R24 con mini-spec) e, in
ordine di dipendenza OpenSpec, `issue-016-custom-starting-fen`,
`issue-016-middlegame-section`, `issue-016-endgame-section` e
`issue-016-play-position-vs-engine`.

La prima di queste è una vera slice di dominio, non una semplice UI: il DTO di
creazione non espone ancora `startingFen`, `VariantService` imposta sempre la FEN
standard e `VariantValidator` verifica le mosse partendo dalla posizione iniziale.
Per una posizione manuale serviranno quindi contratto API, validazione FEN lato
backend e test di regressione, oltre all'editor visuale.

---

## Sequenza proposta dei rilasci

| Rilascio | Issue / slice | Perché qui | Criterio di uscita essenziale |
|---|---|---|---|
| **R20 — Fondazione di navigazione** ✅ | **021** | È economica, rende visibile la direzione del prodotto e sblocca le sezioni future senza introdurre dati o logica di gioco. | ✅ Rilasciato il 2026-08-05: tab-link `/`, `/middlegame`, `/endgame`, segnaposto riusabile e stato attivo; una riga da 768px, due righe sotto con scorrimento del solo gruppo tab se necessario. |
| **R21 — Motore leggibile** ✅ | **022**, **007** | È il miglior incremento immediato per lo studio e concentra nel medesimo pannello la rimozione del toggle ridondante. | ✅ Rilasciato il 2026-08-05: `UciScore.pv` conserva l'intera sequenza UCI, `pvToSan`/`numberedPv` la rendono in SAN numerata dalla posizione analizzata e `StockfishService.bestLine` la azzera a ogni nuova analisi; il blocco «Linea migliore» sta in `.engine-panel` tra i controlli motore e «Allena questa variante», con «Analisi in corso…» finché manca la PV. Rimosso il toggle «Nascondi/Mostra barra» da dettaglio ed editor: spegnendo il motore spariscono barra e linea. Nessun contenuto aggiunto sotto la scacchiera. |
| **R22 — Ciclo di vita dello studio** ✅ | **011**, **012**, **009** | Evita tre passaggi separati sulla home/form: un solo modello di form può creare, modificare e importare, mentre la griglia viene verificata nello stesso contesto. | ✅ Rilasciato il 2026-08-06: pagina unica `/studies/new` (creazione, anteprima/upsert Lichess, `?studyId` verificato con semantica additiva preservata, redirect dalla route storica con query param), campi metadati condivisi `study-form-fields` riusati dalla modifica **inline** del dettaglio (`PUT` esistente, `phase` mai inviata), comando Lichess compatto in topbar con bozza in `sessionStorage` ripristinata al ritorno OAuth, griglia home `auto-fit/minmax(320px)` a massimo due colonne. Dettagli nell'[esito R22](backlog/manutenzione-evolutiva.md#esito-r22--issue-011-2026-08-06). |
| **R23 — Navigazione tra varianti** ✅ | **010**, **008** | Completa il flusso di consultazione della variante e affronta insieme i controlli della stessa schermata, dopo che R21 ne ha fissato il pannello motore. | ✅ Rilasciato il 2026-08-10: rail/drawer, guard editor e rimozione Auto-play; corretti i P1 su risposte HTTP fuori ordine e riavvio motore a FEN invariata. 288 test, build e checklist live a 1600/1440/1024/768/375/320px verdi. Dettagli nell'[esito R23](backlog/manutenzione-evolutiva.md#esito-r23--issue-010--issue-008-2026-08-10). |
| **R24 — Editor più espressivo** | **013**, `issue-016-move-comments` | Entrambi agiscono sul tree editor: una sola revisione dell'interazione sulle mosse riduce duplicazioni e rende l'editor utile anche prima delle nuove sezioni. | Menu accessibile per annotare, promuovere o eliminare la mossa selezionata con il suo sottoalbero; commento/testo e un NAG persistono nel tree JSON retrocompatibile, senza alterare righe storiche né import PGN. |
| **R25 — Posizioni manuali** | `issue-016-custom-starting-fen` | È il vero sblocco funzionale di Mediogioco/Finale e merita un rilascio isolato per il rischio scacchistico e di persistenza. | OpenSpec completa; editor con palette, validità legale, FEN tecnica e salvataggio solo se valido; backend valida FEN e albero dalla FEN scelta. |
| **R26 — Mediogioco reale** | `issue-016-middlegame-section` | Trasforma il segnaposto di R20 nella prima sezione posizionale utilizzabile; riusa modello e editor stabilizzati in R25. | Lista, studio, posizioni e dettaglio di Mediogioco; assenza esplicita di import Lichess, training, statistiche e SM-2. |
| **R27 — Finale reale** | `issue-016-endgame-section` | Replica il paradigma del Mediogioco solo dopo averne validato il riuso, evitando di sviluppare due sezioni divergenti in parallelo. | Lista, studio, posizioni e dettaglio Finale riusano i componenti comuni; regressione Aperture/Mediogioco verde. |
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
| R25–R28 | OpenSpec completa per ogni slice di ISSUE-016, senza ridecidere il modello a fasi già approvato. | Test API/validazione, frontend e checklist manuale della fase interessata. |
| R29 | Decisione di persistenza delle preferenze e contratto versione backend. | Test di `ReviewScheduler` con parametri e verifica che le schedule esistenti non vengano ricalcolate. |
| R30 | Audit reale delle opzioni UCI emesse dal worker Stockfish asm.js. | Test del mapping opzioni/comandi UCI e verifica live del motore. |

## Lavoro preparatorio che può procedere senza cambiare il prodotto

- R20, R21, R22, R23 e R24 sono chiusi; il prossimo incremento pianificato è **R25**. Possono
  procedere senza alterare il prodotto la proposta OpenSpec di R25 e l'audit UCI di R30.
- R23 ha preservato la catena consegnata da R21
  (`parseInfoLine` → `StockfishService.bestLine` → `.engine-line` in `.engine-panel`):
  il riassetto ha riguardato layout e ciclo di cambio variante, non la logica UCI. Resta
  aperta la race tra due FEN consecutivi documentata sotto ISSUE-022.
- Non avviare implementazioni sovrapposte su topbar (021/011/015/017), dettaglio
  variante (022/007/010/008) o tree editor (013/commenti): sono le tre aree con il
  maggior rischio di conflitto e di regressione UX. Con R24 chiusa, il tree editor
  è di nuovo libero, ma chi lo tocca deve passare da `move-tree.ts` (annotazioni
  incluse) e non duplicarne la logica nei componenti.
