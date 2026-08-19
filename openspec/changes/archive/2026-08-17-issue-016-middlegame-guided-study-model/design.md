## Context

R26–R26.2 riusano `Study` e `Variant` per rappresentare studi e posizioni di Mediogioco. La fase
del figlio deriva dallo studio, `Variant.tree` conserva mainline e rami dell'autore,
`Variant.moves` è la mainline SAN derivata e `startingFen` è validata dal backend. Le posizioni
sono attualmente ordinate per ID e possono avere un albero vuoto. Non esistono tipologia
tattica/strategica, temi normalizzati o storico dei tentativi.

La tabella `study` è condivisa da tutte le fasi e `variant` anche da Aperture, posizioni e righe
legacy. La migrazione deve quindi essere additiva e non può rendere improvvisamente invalide le
righe esistenti. Il database di sviluppo versionato è una risorsa protetta: migrazioni e test si
verificano su H2 temporaneo; il design deve restare portabile verso PostgreSQL.

Questa è la change A di R26.3. La change B
`issue-016-middlegame-guided-study-flows` dipende dal modello e dalle API qui definiti.

## Goals / Non-Goals

**Goals:**

- classificare i soli studi `MIDDLEGAME` come `TACTICAL` o `STRATEGIC`;
- normalizzare i temi e referenziarli per ID stabile;
- aggiungere metadati e ordine contiguo alle posizioni;
- migrare senza perdere accesso ai dati Mediogioco esistenti;
- registrare eventi di tentativo minimi e riepiloghi derivati;
- rendere autorevole il backend sull'esito tattico;
- fornire contratti API sufficienti alla change B;
- preservare Aperture, Finale, training, review e statistiche.

**Non-Goals:**

- flussi guidati, soluzione, sequenze o integrazione Stockfish;
- tipologia degli studi `ENDGAME`;
- import da libri/PGN, tag o CRUD amministrativo dei temi;
- SM-2, percentuali, sessioni persistenti o versionamento della soluzione;
- persistenza delle mosse tentate;
- cancellazione manuale del singolo tentativo;
- modifica del dettaglio «Mostra analisi» consegnato da R26.1.

## Decisions

### 1. Un campo nullable rappresenta anche la transizione legacy

`Study` viene esteso con `studyType`, enum applicativo `TACTICAL | STRATEGIC`, colonna
`study_type VARCHAR(16) NULL`.

| Fase/stato | `studyType` valido | Regola |
|---|---|---|
| nuovo `MIDDLEGAME` | non nullo | obbligatorio in creazione |
| legacy `MIDDLEGAME` | inizialmente nullo | UI «Da classificare», una transizione a valore |
| `OPENING` | nullo | il campo non è presentato né accettato |
| `ENDGAME` | nullo | fuori scope R26.3 |

L'update consente `NULL → valore` una sola volta per un legacy Mediogioco. Dopo la prima
valorizzazione il valore è immutabile, usando una guard simmetrica a quella di `Study.phase`.
Una richiesta che invia un tipo su una fase non Mediogioco o tenta di cambiarlo viene rifiutata.

Alternative scartate:

- `NOT NULL` con valore generico: attribuirebbe un significato falso ad Aperture/Finale;
- backfill automatico Tattica/Strategia: il dato non è deducibile;
- tipo sulla posizione: duplicazione incoerente della proprietà dello studio.

### 2. Gli studi non classificati conservano il CRUD ma non creano nuove posizioni

Un legacy «Da classificare» resta leggibile e modificabile nei metadati esistenti. Nuova posizione,
tentativi e riepiloghi guidati sono disabilitati finché non viene scelto il tipo. Questa scelta
evita di creare una posizione senza un insieme di temi compatibile.

### 3. I temi sono un catalogo relazionale con seed stabile

Nuova entità `PositionTheme`:

```text
id             BIGINT PRIMARY KEY
code           VARCHAR(64) NOT NULL
study_type     VARCHAR(16) NOT NULL
display_label  VARCHAR(128) NOT NULL
display_order  INT NOT NULL
active         BOOLEAN NOT NULL DEFAULT TRUE
UNIQUE (code, study_type)
```

L'unicità di `code` è composita con `study_type`, non globale: i due cataloghi sono
indipendenti e uno stesso codice può comparire in entrambi con significato analogo (il seed
sotto assegna `KING_ATTACK` sia al tema tattico `1012` sia allo strategico `2011`). L'identità
referenziata da `Variant.theme_id` resta esclusivamente l'`id`, mai il `code`.

Il seed usa ID espliciti per rendere stabile il riferimento fra ambienti e backup:

| ID | Tipo | Codice | Label |
|---:|---|---|---|
| 1001 | TACTICAL | `DOUBLE_ATTACK` | doppio attacco |
| 1002 | TACTICAL | `PIN` | inchiodatura |
| 1003 | TACTICAL | `SKEWER` | infilata |
| 1004 | TACTICAL | `DISCOVERED_ATTACK` | attacco di scoperta |
| 1005 | TACTICAL | `DEFLECTION` | deviazione |
| 1006 | TACTICAL | `DECOY` | adescamento |
| 1007 | TACTICAL | `REMOVE_DEFENDER` | eliminazione del difensore |
| 1008 | TACTICAL | `OVERLOAD` | sovraccarico |
| 1009 | TACTICAL | `INTERFERENCE` | interferenza |
| 1010 | TACTICAL | `CLEARANCE` | sgombero |
| 1011 | TACTICAL | `SACRIFICE` | sacrificio |
| 1012 | TACTICAL | `KING_ATTACK` | attacco al re |
| 1013 | TACTICAL | `TACTICAL_DEFENSE` | difesa tattica |
| 1014 | TACTICAL | `COMBINATION` | combinazione |
| 2001 | STRATEGIC | `PAWN_STRUCTURE` | struttura pedonale |
| 2002 | STRATEGIC | `WEAK_AND_STRONG_SQUARES` | case deboli e case forti |
| 2003 | STRATEGIC | `FILES_AND_DIAGONALS` | colonne e diagonali |
| 2004 | STRATEGIC | `PIECE_ACTIVITY` | attività dei pezzi |
| 2005 | STRATEGIC | `GOOD_AND_BAD_PIECE` | pezzo buono e pezzo cattivo |
| 2006 | STRATEGIC | `SPACE` | spazio |
| 2007 | STRATEGIC | `DEVELOPMENT_AND_INITIATIVE` | sviluppo e iniziativa |
| 2008 | STRATEGIC | `PROPHYLAXIS` | profilassi |
| 2009 | STRATEGIC | `FAVORABLE_EXCHANGES` | cambi favorevoli |
| 2010 | STRATEGIC | `GAME_PLAN` | piano di gioco |
| 2011 | STRATEGIC | `KING_ATTACK` | attacco al re |
| 2012 | STRATEGIC | `DEFENSE_AND_COUNTERPLAY` | difesa e controgioco |
| 2013 | STRATEGIC | `ENDGAME_TRANSITION` | transizione al finale |

`Variant.theme_id` è una FK verso il catalogo. `display_label` può cambiare senza riscrivere le
posizioni; `code` non viene mostrato come descrizione. `active=false` consente di ritirare un tema
senza rompere i riferimenti. R26.3 espone soltanto lettura dei temi attivi e non un CRUD.

Alternative scartate:

- stringa/enum sulla posizione: rinomina e traduzione richiederebbero aggiornamenti massivi;
- tabella molti-a-molti: la prima versione richiede un solo tema principale;
- tema «Altro»: non richiesto; `themeDescription` copre note libere.

### 4. `Variant` riceve sei colonne additive

```text
theme_id          BIGINT NULL
theme_description TEXT NULL
description       TEXT NULL
difficulty        VARCHAR(16) NULL
source            TEXT NULL
position_order    INT NULL
```

`difficulty` accetta `INTRODUCTORY`, `EASY`, `INTERMEDIATE`, `ADVANCED`, `EXPERT`.
`themeDescription`, `description`, `difficulty` e `source` sono facoltativi. Per una nuova
posizione Mediogioco `themeId` e ordine sono obbligatori; il service verifica che il tema sia
attivo e abbia lo stesso tipo dello studio.

Le colonne restano nullable perché la tabella è condivisa con le Aperture e perché i legacy
Mediogioco attraversano una regolarizzazione. La UI mostra «Tema da assegnare» e il backend
consente di aggiornare gli altri campi di una posizione legacy senza forzare un tema inventato;
tentativi e sequenze restano però vietati finché `themeId` è nullo.

Lo stato bozza non viene persistito: è derivato da mainline vuota (`moves`/`tree`).

### 5. L'ordine è contiguo e gestito dal service in transazione

`position_order` è valorizzato per tutte le posizioni Mediogioco. Il backfill assegna `1..N` per
ogni studio seguendo `variant.id ASC`, cioè l'ordine visibile attuale. Il changeset usa una query a
conteggio correlato compatibile con H2 e PostgreSQL e viene provato su database temporaneo.

Il contratto di riordino riceve l'intera lista di ID dello studio nell'ordine desiderato. Il service:

1. verifica fase, appartenenza, completezza e assenza di duplicati;
2. carica le posizioni in una transazione;
3. assegna temporaneamente valori negativi per evitare collisioni;
4. assegna `1..N` e completa la transazione.

Creazione e inserimento usano l'ordine richiesto dal client, precompilato in UI con `N+1`, e
spostano le righe successive. Eliminazione compatta gli ordini rimasti. Un vincolo univoco
`(study_id, position_order)` protegge la consistenza; i valori null delle varianti Apertura non
collidono.

Alternative scartate:

- continuare con l'ID: non supporta riordino esplicito;
- indici frazionari: complessità non utile per un'app single-user;
- update singoli non transazionali: può lasciare buchi o duplicati.

### 6. `PositionAttempt` è un evento minimo con FK reale

```text
id           BIGINT PRIMARY KEY IDENTITY
variant_id   BIGINT NOT NULL REFERENCES variant(id) ON DELETE CASCADE
outcome      VARCHAR(24) NOT NULL
occurred_at  TIMESTAMP NOT NULL
```

Gli esiti sono `UNDERSTOOD`, `NOT_UNDERSTOOD`, `FAILED`. L'ID è tecnico; i tre dati di dominio
restano posizione, istante server ed esito. Non si persistono mosse, durata, sessione, FEN o
versione della soluzione. Non esiste endpoint di cancellazione del singolo evento.

La FK con cascade garantisce la rimozione su cancellazione posizione. La cancellazione dello
studio elimina già le posizioni tramite il service e propaga quindi ai tentativi.

### 7. Un solo endpoint di tentativo usa il tipo persistito come discriminante

Rotte proposte:

```text
GET  /api/position-themes?studyType=TACTICAL|STRATEGIC
PUT  /api/studies/{studyId}/variants/order
POST /api/variants/{variantId}/attempts
GET  /api/variants/{variantId}/attempts
GET  /api/studies/{studyId}/attempts/summary
```

`POST /attempts` non accetta un tipo dichiarato dal client: lo deriva dallo studio.

- Tattica: body `{ "userMoves": ["SAN", ...] }`; `outcome` è vietato. Il backend ricostruisce la
  mainline dalla FEN, applica le risposte avversarie attese, confronta le sole mosse dell'utente e
  deriva `UNDERSTOOD` o `FAILED`.
- Strategia: body `{ "outcome": "UNDERSTOOD|NOT_UNDERSTOOD" }`; `userMoves` è vietato.

Il backend rifiuta bozza, tema mancante, studio non classificato, fase diversa da `MIDDLEGAME`,
payload misto, SAN illegale/incompleta non conclusiva e combinazioni di esito non consentite. Le
mosse tattiche sono dati transitori di validazione e non vengono copiate nell'evento.

Alternative scartate:

- endpoint distinti tattica/strategia: duplicano il resource path senza aggiungere sicurezza;
- body `{outcome}` anche per tattica: consente al client di autocertificare il successo;
- riuso `TrainingSession`: viola il confine Opening-only e persiste dati diversi.

### 8. Riepiloghi e filtri derivano dagli eventi

Il riepilogo per posizione contiene ultimo esito, numero tentativi e `lastUnderstoodAt`. L'ultimo
evento è determinato da `occurredAt DESC, id DESC`. Non si salva uno stato corrente duplicato.

Il riepilogo a livello studio restituisce una voce per posizione sufficiente alla change B per
classificare:

- mai tentata: nessun evento;
- da rivedere: ultimo esito `FAILED` o `NOT_UNDERSTOOD`;
- compresa: ultimo esito `UNDERSTOOD`.

Il numero totale di posizioni continua a derivare dal conteggio già esistente; non viene introdotta
una percentuale di comprensione.

### 9. FEN e mainline possono cambiare senza versionare lo storico

Gli update esistenti continuano a ricalcolare il lato tecnico dalla FEN e a validare l'albero. Gli
eventi già registrati restano invariati anche quando cambiano FEN o mainline; i tentativi futuri
usano la versione corrente. Questa ambiguità è deliberata e documentata, perché R26.3 serve anche a
osservare errori nella posizione iniziale durante l'inserimento.

### 10. I DTO sono estesi in modo contestuale, non globalmente obbligatorio

`StudyDto`/request espongono `studyType`. `VariantDto`/request espongono `themeId`, dati leggibili
del tema, descrizioni, difficoltà, fonte, ordine e stato derivato di eleggibilità se utile. I campi
sono opzionali per i client Aperture, mentre il service applica le regole in base alla fase e alla
condizione legacy. Il cambio di ordinamento è esplicitamente trattato come modifica osservabile e
coperto da test.

## Risks / Trade-offs

- **[Backfill non portabile]** → SQL a conteggio correlato, test Liquibase su H2 e revisione della
  sintassi PostgreSQL prima dell'archiviazione.
- **[Vincolo univoco durante il riordino]** → aggiornamento in due fasi nella stessa transazione.
- **[Client falsifica una tattica]** → il backend deriva l'esito da `userMoves` e mainline corrente.
- **[Dati legacy incompleti]** → stati transitori espliciti e nessun blocco del CRUD esistente.
- **[Tema eliminato mentre è referenziato]** → nessun delete utente; `active=false` e FK.
- **[Storico ambiguo dopo modifica soluzione]** → limite accettato, mostrato come storico della
  posizione logica e non della versione.
- **[Query riepilogo N+1]** → endpoint aggregato a livello studio e indici su
  `(variant_id, occurred_at, id)`.
- **[Schema condiviso con Aperture/Finale]** → colonne nullable e validazione contestuale.

## Migration Plan

1. Aggiungere `study.study_type` nullable.
2. Creare `position_theme`, indici e seed con ID espliciti.
3. Aggiungere le sei colonne a `variant`, FK tema e indice/unique dell'ordine.
4. Eseguire il backfill `position_order` per le sole posizioni `MIDDLEGAME` in ordine di ID.
5. Creare `position_attempt`, indici e FK `ON DELETE CASCADE`.
6. Distribuire backend compatibile con valori null legacy e poi il frontend di classificazione.
7. Verificare migrazione su copia temporanea e su database vuoto; non avviare il database condiviso
   durante i gate.

Il rollback automatico è ammesso solo prima di avere tentativi o metadati nuovi. Dopo l'uso reale,
la rimozione delle tabelle/colonne perderebbe dati: si preferisce una migration correttiva in avanti.
Prima del deploy resta comunque necessario un backup del database versionato.

## Open Questions

Nessuna decisione di prodotto aperta. Durante l'implementazione si può adattare il dettaglio
meccanico del SQL di backfill o del locking se i test H2/PostgreSQL lo richiedono, senza cambiare
ordine, compatibilità legacy o contratti osservabili.
