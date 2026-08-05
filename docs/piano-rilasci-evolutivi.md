# Piano progressivo dei rilasci evolutivi

> **Aggiornato:** 2026-08-05 · **Stato:** in corso — **R20 rilasciato**, i rilasci
> successivi restano pianificazione.
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
| **022** | Mostra la Principal Variation di Stockfish; valore immediato nello studio | parser UCI, servizio motore, pannello dettaglio | indipendente da ISSUE-014 e dal backend |
| **007** | Elimina un controllo motore ridondante | pannello motore | da consegnare con ISSUE-022 |
| **011** | Unifica il flusso per creare/importare uno studio | home, route, import Lichess, topbar | mini-spec consigliata; riusa API esistenti |
| **012** | Rende modificabili i metadati dello studio | form e dettaglio studio | si integra naturalmente con 011 |
| **009** | Usa meglio lo spazio dell'home su desktop | griglia card studi | stessa area di 011/012 |
| **010** | Permette di passare tra varianti senza tornare allo studio | dettaglio variante, layout responsivo | mini-spec e validazione desktop/laptop |
| **008** | Rimuove l'auto-play non necessario | controlli del dettaglio variante | da chiudere con il riassetto 010 |
| **013** | Operazioni rapide sull'albero di mosse | editor, menu contestuale, conferma | può condividere il lavoro UI con i commenti |
| **016** | Estende l'app a Mediogioco e Finale | modello, editor, API, sezioni UI | `phase-domain-model` già implementata; restano cinque slice |
| **015** | Espone identità e versioni dell'app | topbar, contratto versione FE/BE | da consolidare con l'hub Impostazioni |
| **017** | Centralizza le impostazioni e parametrizza SM-2 | topbar, persistenza, `ReviewScheduler` | richiede OpenSpec e scelta DB/localStorage |
| **014** | Configura i parametri UCI del motore | worker Stockfish, Impostazioni | richiede audit UCI e ISSUE-017 |

### Stato particolare di ISSUE-016

La slice `issue-016-phase-domain-model` è già completata: `Study.phase` distingue
`OPENING`, `MIDDLEGAME` ed `ENDGAME`; import Lichess, training, statistiche e SM-2
rimangono intenzionalmente limitati alle Aperture.

Restano, in ordine di dipendenza, `issue-016-custom-starting-fen`,
`issue-016-move-comments`, `issue-016-middlegame-section`,
`issue-016-endgame-section` e `issue-016-play-position-vs-engine`.

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
| **R21 — Motore leggibile** | **022**, **007** | È il miglior incremento immediato per lo studio e concentra nel medesimo pannello la rimozione del toggle ridondante. | PV completa convertita in SAN e aggiornata con l'analisi; spegnendo il motore spariscono valutazione e linea; nessun contenuto sotto la scacchiera. |
| **R22 — Ciclo di vita dello studio** | **011**, **012**, **009** | Evita tre passaggi separati sulla home/form: un solo modello di form può creare, modificare e importare, mentre la griglia a due colonne viene verificata nello stesso contesto. | Mini-spec di 011 chiusa; pagina `Nuovo studio` conserva preview/upsert e `?studyId`; modifica metadati usa `PUT` esistente; griglia 2 colonne desktop / 1 colonna stretta. |
| **R23 — Navigazione tra varianti** | **010**, **008** | Completa il flusso di consultazione della variante e affronta insieme i controlli della stessa schermata, dopo che R21 ne ha fissato il pannello motore. | Mini-spec layout; elenco laterale con variante attiva e guard sulle modifiche non salvate; nessuna regressione della PV; comportamento definito e verificato alle larghezze desktop/laptop. |
| **R24 — Editor più espressivo** | **013**, `issue-016-move-comments` | Entrambi agiscono sul tree editor: una sola revisione dell'interazione sulle mosse riduce duplicazioni e rende l'editor utile anche prima delle nuove sezioni. | Menu accessibile con conferma per la distruzione; promozione mainline invariata; commento/testo e NAG persistono nel tree, senza alterare le righe storiche. |
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
| R22 | Mini-spec di ISSUE-011: pagina unica, semantica del link Lichess e comportamento dell'upsert. | Test form/create/import + verifica manuale connessione Lichess. |
| R23 | Mini-spec di ISSUE-010: breakpoint e comportamento dell'elenco varianti alle larghezze ridotte. | Test navigazione/guard; ispezione a 1440px e a una larghezza laptop concordata. |
| R24 | Specifica del formato commento/NAG e compatibilità JSON dei `MoveNode` preesistenti. | Test tree TypeScript e serializzazione/deserializzazione backend; nessuna perdita di mosse esistenti. |
| R25–R28 | OpenSpec completa per ogni slice di ISSUE-016, senza ridecidere il modello a fasi già approvato. | Test API/validazione, frontend e checklist manuale della fase interessata. |
| R29 | Decisione di persistenza delle preferenze e contratto versione backend. | Test di `ReviewScheduler` con parametri e verifica che le schedule esistenti non vengano ricalcolate. |
| R30 | Audit reale delle opzioni UCI emesse dal worker Stockfish asm.js. | Test del mapping opzioni/comandi UCI e verifica live del motore. |

## Lavoro preparatorio che può procedere senza cambiare il prodotto

- R20 è chiuso: si possono ora preparare in parallelo la mini-spec di R22 e R23, la
  proposta OpenSpec di R25 e l'audit UCI di R30. Sono attività di analisi: non alterano
  il codice e riducono l'attesa tra un rilascio e il successivo.
- Non avviare implementazioni sovrapposte su topbar (021/011/015/017), dettaglio
  variante (022/007/010/008) o tree editor (013/commenti): sono le tre aree con il
  maggior rischio di conflitto e di regressione UX.
