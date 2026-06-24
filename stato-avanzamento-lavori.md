# Stato avanzamento lavori - WebApp Scacchi

> Fotografia operativa dello stato del progetto al 2026-06-24.
> Fonti di riferimento: `planning-prototipi-webapp.md`, `decisioni-tecniche.md` e verifica locale end-to-end eseguita su frontend Angular e backend Spring Boot.
> Questo documento non sostituisce planning e ADR: riassume cosa risulta implementato, cosa e' stato anticipato rispetto alla roadmap e cosa manca.

---

## 1. Sintesi esecutiva

I prototipi dal **0 al 5 risultano implementati e verificati**. Il **Prototipo 6 e' implementato a livello funzionale per PGN semplici**, ma presenta un difetto backend sul salvataggio di PGN piu' lunghi nel campo `sourcePgn`.

Rispetto al planning originale sono state anticipate alcune funzionalita' post-MVP:

- modifica di una variante esistente;
- modello ad albero per sotto-varianti;
- rendering e navigazione di mainline + varianti;
- training compatibile con rami multipli;
- miglioramenti alla scacchiera: orientamento, modalita' read-only/controlled e scelta promozione.

Il repository risulta strutturato correttamente con due progetti separati:

- `backend/` - Spring Boot + Maven + H2/JPA;
- `frontend/` - Angular + npm + `chess.js`.

Alla verifica del 2026-06-24:

- `git status --short` pulito;
- backend attivo su `http://localhost:8080`;
- frontend attivo su `http://localhost:4200`;
- test backend: **16 passati**;
- test frontend: **39 passati**;
- verifiche browser principali senza errori console.

---

## 2. Stato per prototipo

### Prototipo 0 - Scaffolding & hello-world

**Stato:** completato.

Implementato:

- progetto backend Spring Boot in `backend/`;
- progetto frontend Angular in `frontend/`;
- endpoint `GET /api/ping`;
- servizio frontend per chiamare il backend;
- configurazione proxy Angular verso il backend;
- CORS dev lato backend;
- H2 in memoria configurato;
- separazione fisica frontend/backend rispettata.

Verificato:

- `GET http://localhost:8080/api/ping` risponde `{"status":"pong"}`;
- frontend raggiungibile su `http://localhost:4200`;
- pagina Angular mostra stato backend online.

Note:

- il planning prevedeva la verifica della console H2; la configurazione e' presente e i log backend indicano H2 attivo.

---

### Prototipo 1 - Scacchiera renderizzata

**Stato:** completato, con miglioramenti.

Implementato:

- componente Angular custom `Chessboard`;
- motore regole `chess.js`;
- rendering board 8x8 con 64 case;
- pezzi SVG Staunton in `frontend/public/pieces`;
- colori board coerenti con il riferimento: `#f0d9b5` e `#b58863`;
- cornice effetto legno;
- coordinate file/rank;
- emissione evento `moveMade` con SAN, from, to e FEN;
- rifiuto mosse illegali;
- input FEN tramite `position`;
- modalita' non interattiva;
- modalita' controlled per training;
- orientamento bianco/nero;
- scelta pezzo in promozione.

Verificato:

- scacchiera visibile con 64 case e 32 pezzi;
- `e2-e4` accettata e produce SAN `e4`;
- mossa illegale tipo `Re1-e3` rifiutata;
- nessun errore console in browser.

Scostamenti dal planning:

- il planning parlava di libreria scacchiera Angular-compatibile; la decisione effettiva, tracciata in `decisioni-tecniche.md`, e' un componente custom Angular/CSS + `chess.js`;
- il planning menzionava drag/click; la verifica ha confermato l'interazione click. Non risulta necessario per i prototipi successivi, ma il drag-and-drop non e' stato validato.

Nota documentale:

- `decisioni-tecniche.md` dice ancora che i pezzi usano glifi Unicode, ma il codice usa asset SVG Staunton. L'ADR va aggiornata.

---

### Prototipo 2 - Variante hardcoded visualizzata

**Stato:** completato e superato dall'implementazione persistente.

Implementato:

- modello `VariantDto` lato backend;
- modello `Variant` lato frontend;
- endpoint `GET /api/variants`;
- endpoint `GET /api/variants/{id}`;
- servizio Angular `VariantService`;
- vista lista varianti;
- vista dettaglio variante;
- pannello mosse;
- replay con controlli;
- navigazione con tastiera nel dettaglio;
- ricostruzione posizione via `chess.js`.

Verificato:

- lista varianti visibile in frontend;
- dettaglio variante visibile;
- scacchiera in sola visualizzazione;
- controlli replay presenti;
- dati provenienti dal backend reale.

Scostamenti dal planning:

- il prototipo prevedeva una variante hardcoded in memoria; l'implementazione corrente e' gia' passata a H2 con seed. Il valore del prototipo 2 e' comunque coperto.

---

### Prototipo 3 - Training loop

**Stato:** completato, con supporto anticipato a sotto-varianti.

Implementato:

- componente `VariantTraining`;
- caricamento variante da backend;
- gestione stato sessione;
- riconoscimento lato da allenare (`WHITE`/`BLACK`);
- orientamento board coerente col lato;
- confronto mossa giocata vs mosse attese;
- feedback mossa errata;
- contatore errori;
- suggerimento;
- risposta automatica dell'avversario;
- riconoscimento completamento;
- riavvio training;
- compatibilita' con rami multipli: se ci sono piu' figli validi, sono accettate piu' mosse.

Verificato:

- vista training raggiungibile da dettaglio;
- board presente;
- stato "Tocca a te";
- testo lato allenato coerente;
- nessun errore console.

Decisione coerente con planning:

- la validazione training e' lato frontend. L'endpoint opzionale `POST /api/variants/{id}/training/check` non risulta necessario e non e' implementato.

---

### Prototipo 4 - Persistenza varianti (CRUD)

**Stato:** completato, con update aggiunto oltre planning.

Implementato:

- entita' JPA `Variant`;
- repository `VariantRepository`;
- persistenza H2;
- seed iniziale tramite `VariantDataInitializer`;
- converter JSON/stringa per `moves`;
- converter per `tree`;
- validazione minima request lato controller;
- `GET /api/variants`;
- `GET /api/variants/{id}`;
- `POST /api/variants`;
- `DELETE /api/variants/{id}`;
- UI lista varianti;
- azione elimina lato UI;
- creazione varianti via backend.

Extra implementato:

- `PUT /api/variants/{id}` per modificare una variante esistente.

Verificato:

- creazione variante temporanea via API;
- aggiornamento variante temporanea via API;
- cancellazione variante temporanea via API con `204`;
- seed presenti in lista;
- test repository/controller backend passati.

Scostamenti dal planning:

- `PUT` non era previsto nel Prototipo 4. E' una funzionalita' utile e coerente, ma va documentata nel contratto API.

---

### Prototipo 5 - Inserimento variante mossa-per-mossa

**Stato:** completato, con editing avanzato anticipato.

Implementato:

- rotta `/variants/new`;
- componente `VariantEditor`;
- input nome variante;
- scelta lato da allenare;
- creazione mosse giocando sulla scacchiera;
- accumulo mosse in struttura `tree`;
- visualizzazione mosse in formato PGN-like;
- reset;
- cancellazione mossa corrente;
- salvataggio via `POST /api/variants`;
- rotta `/variants/:id/edit`;
- caricamento di una variante esistente nell'editor;
- salvataggio modifica via `PUT /api/variants/{id}`;
- navigazione all'interno dell'albero tramite path.

Verificato:

- apertura editor nuova variante;
- mosse `e4 e5 Nf3` giocate sulla scacchiera;
- pannello mosse aggiornato;
- contatore semimossa aggiornato;
- nessun errore console.

Scostamenti dal planning:

- il planning escludeva editing avanzato e sotto-varianti nel Prototipo 5;
- il codice ha gia' introdotto alberi e modifica variante preesistente.

Valutazione:

- la funzionalita' anticipata e' coerente con una direzione futura del planning, ma aumenta complessita' e necessita test manuali piu' ampi.

---

### Prototipo 6 - Import PGN base

**Stato:** implementato ma con difetto da correggere.

Implementato:

- rotta `/variants/import`;
- componente `PgnImport`;
- textarea per PGN;
- parsing client-side con `chess.js`;
- anteprima mosse;
- gestione errore PGN non valido;
- suggerimento nome da tag PGN (`White`/`Black` o `Event`);
- scelta lato da allenare;
- salvataggio variante importata via `POST /api/variants`;
- valorizzazione `sourcePgn`.

Verificato:

- PGN semplice incollato in UI;
- anteprima mosse corretta: `e4 e5 Nf3 Nc6 Bb5 a6`;
- nessun errore console nella UI;
- salvataggio API con `sourcePgn` corto funzionante.

Bug trovato:

- un PGN di 386 caratteri inviato a `POST /api/variants` causa `500 Internal Server Error`;
- log backend: `ValueTooLongException` di H2;
- causa probabile: in `Variant.java`, `sourcePgn` e' mappato come stringa senza `columnDefinition = "text"`, quindi viene creato come `varchar(255)`.

Impatto:

- il Prototipo 6 funziona solo per PGN brevi;
- PGN realistici, anche semplici ma con tag o molte mosse, possono fallire in salvataggio;
- l'errore e' un 500 non gestito, quindi lato utente appare come salvataggio fallito generico.

Correzione consigliata:

- cambiare mapping `sourcePgn` a colonna `text`;
- aggiungere test backend per PGN lungo;
- valutare risposta `400` per input troppo grande solo se si vuole un limite esplicito;
- verificare import da UI dopo la modifica.

---

## 3. Funzionalita' extra anticipate

### 3.1 Modifica variante esistente

Non era prevista nei prototipi 0-6, ma risulta implementata.

Elementi presenti:

- rotta frontend `/variants/:id/edit`;
- link "Modifica variante" nel dettaglio;
- caricamento dati esistenti nell'editor;
- metodo frontend `updateVariant`;
- endpoint backend `PUT /api/variants/{id}`;
- metodo service `update`.

Cosa manca per renderla solida:

- test manuale completo via browser: modifica nome, mosse, colore, salva, riapri, allena;
- conferma UX per modifiche non salvate;
- gestione errore 404/400 piu' visibile;
- eventuale conferma prima di cancellare una mossa o un sottoalbero;
- documentazione nel contratto API.

### 3.2 Sotto-varianti / albero mosse

Il planning rimandava il modello ad albero a una fase post-MVP. Il codice lo ha gia' introdotto.

Elementi presenti:

- `MoveNode` backend;
- `MoveNode` frontend;
- campo `tree` in `VariantDto` e `CreateVariantRequest`;
- converter JPA `TreeConverter`;
- utility frontend `move-tree.ts`;
- visualizzazione di varianti tra parentesi;
- navigazione per path;
- training che accetta piu' mosse attese se il nodo corrente ha piu' figli.

Cosa manca per considerarlo editing avanzato completo:

- specifica formale del modello albero;
- test con rami multipli creati da UI e poi riaperti;
- validazione di legalita' dell'intero albero, non solo delle mosse giocate tramite UI;
- gestione PGN con varianti annidate;
- UX piu' chiara per distinguere mainline e varianti;
- comandi espliciti per promuovere un ramo a mainline;
- protezione da cancellazione accidentale di sottoalberi;
- migrazione/documentazione del contratto da `moves[]` lineare a `tree`;
- decisione su compatibilita' futura con PGN complessi.

### 3.3 Scacchiera evoluta

Sono state aggiunte capacita' oltre il Prototipo 1:

- modalita' interactive/read-only;
- modalita' controlled;
- orientamento nero;
- promozione con scelta pezzo;
- asset SVG Staunton.

Cosa manca:

- verifica esplicita del flusso promozione in UI;
- eventuale drag-and-drop se resta desiderato;
- test responsive/mobile;
- revisione documentale dell'ADR 0001.

---

## 4. Verifiche eseguite

### Backend

Comando eseguito:

```powershell
.\mvnw.cmd test
```

Esito:

- build success;
- 16 test passati;
- nessun failure/error.

Copertura funzionale osservata:

- contesto Spring;
- ping controller;
- repository varianti;
- controller varianti;
- `MoveNode`.

### Frontend

Comando eseguito:

```powershell
npm test -- --watch=false
```

Nota:

- in sandbox il comando fallisce con `spawn EPERM` su esbuild;
- rilanciato fuori sandbox, passa correttamente.

Esito:

- 7 test file passati;
- 39 test passati.

### Verifiche HTTP/API

Verificato:

- `GET /api/ping`;
- `GET /api/variants`;
- `POST /api/variants`;
- `PUT /api/variants/{id}`;
- `DELETE /api/variants/{id}`;
- salvataggio `tree`;
- salvataggio `sourcePgn` corto;
- fallimento `sourcePgn` lungo.

### Verifiche browser

Verificato:

- lista varianti;
- dettaglio variante;
- replay/detail controls;
- training;
- editor nuova variante;
- import PGN;
- anteprima mosse PGN;
- gioco mosse in editor;
- assenza di errori console durante i flussi osservati.

---

## 5. Cosa manca - approfondimento

### 5.1 Correggere salvataggio PGN lunghi

Priorita': alta.

Motivo:

- blocca il Prototipo 6 in scenari realistici;
- un PGN anche semplice puo' superare 255 caratteri;
- attualmente l'utente riceve un errore generico e il backend restituisce 500.

Intervento consigliato:

- mappare `sourcePgn` come `text`;
- aggiungere test backend con `sourcePgn` > 255 caratteri;
- verificare create/import da frontend;
- se si vuole un limite massimo, definirlo esplicitamente e restituire `400 Bad Request` con messaggio comprensibile.

File coinvolto:

- `backend/src/main/java/com/scacchi/backend/variant/Variant.java`.

### 5.2 Riallineare documentazione e contratto API

Priorita': alta.

Motivo:

- il planning descrive ancora un contratto lineare basato su `moves[]`;
- il codice espone anche `tree`;
- il codice implementa `PUT`, non previsto nella sezione contratti;
- `decisioni-tecniche.md` non riflette piu' esattamente l'uso di SVG.

Aggiornamenti consigliati:

- aggiornare sezione 6 del planning o creare documento contratto API aggiornato;
- aggiungere `PUT /api/variants/{id}`;
- documentare `tree?: MoveNode[]`;
- chiarire che `moves` e' mainline derivata da `tree`;
- aggiornare ADR 0001: pezzi SVG Staunton, non glifi Unicode;
- aggiungere ADR per "modello albero anticipato";
- aggiungere ADR per "editing variante esistente".

### 5.3 Validazione backend delle mosse e dell'albero

Priorita': medio-alta.

Motivo:

- il frontend impedisce molte mosse illegali quando l'utente crea da scacchiera;
- le API pero' possono ricevere payload arbitrari con `moves` o `tree`;
- al momento il backend valida struttura minima, non legalita' scacchistica.

Rischi:

- varianti con SAN illegali salvate via API;
- albero non coerente con la posizione;
- mainline derivata da un `tree` non valido;
- training/detail possono produrre FEN parziali o incoerenti.

Intervento possibile:

- introdurre validazione della mainline almeno lato backend;
- per `tree`, validare ricorsivamente ogni ramo;
- decidere se usare una libreria Java per scacchi o mantenere la validazione piena lato frontend e limitare le API;
- restituire errori 400 con messaggi utili.

### 5.4 Consolidare il modello ad albero

Priorita': media.

Motivo:

- l'albero e' stato anticipato rispetto al planning;
- prima di costruire altre funzionalita' sopra, serve stabilizzare semantica e UX.

Decisioni aperte:

- `children[0]` e' sempre mainline: confermare come vincolo ufficiale;
- come promuovere una variante a mainline;
- come rappresentare commenti/NAG in futuro;
- se `moves[]` resta campo persistito o diventa solo derivato;
- come gestire import PGN con varianti annidate;
- come esportare l'albero in PGN.

Lavori mancanti:

- test di round-trip `tree -> DB -> DTO -> UI`;
- test con piu' rami allo stesso nodo;
- test con rami profondi;
- test training su ramo alternativo;
- UX esplicita per creare ramo alternativo senza confondere l'utente.

### 5.5 Completare import PGN oltre la linea principale

Priorita': media, post-correzione `sourcePgn`.

Nel planning il Prototipo 6 escludeva PGN complessi. Ora che l'albero e' stato anticipato, il tema diventa piu' rilevante.

Manca:

- parsing di varianti annidate;
- gestione commenti;
- gestione NAG;
- gestione header piu' ampia;
- validazione di PGN malformati con messaggi specifici;
- eventuale anteprima ad albero;
- salvataggio `tree` da PGN complesso;
- test con PGN reali.

Scelta da fare:

- mantenere P6 come "solo linea principale" e documentarlo chiaramente;
- oppure aprire un nuovo prototipo dedicato a import PGN completo.

### 5.6 Migliorare UX e sicurezza delle azioni distruttive

Priorita': media.

Manca:

- conferma prima di eliminare una variante;
- conferma prima di eliminare una mossa/sottoalbero nell'editor;
- protezione da perdita modifiche non salvate quando si cambia pagina;
- feedback piu' specifico sugli errori API;
- stato loading/saving piu' robusto;
- gestione retry per errori rete/backend.

### 5.7 Test manuali end-to-end da formalizzare

Priorita': media.

Il planning richiede validazione manuale a ogni prototipo. Molti flussi sono stati verificati, ma conviene trasformarli in checklist ripetibili.

Checklist consigliata:

1. Creare variante lineare da scacchiera.
2. Verificarla in lista.
3. Aprirla in dettaglio.
4. Usare replay avanti/indietro/autoplay.
5. Allenarla fino a completamento.
6. Giocare mossa errata e verificare feedback.
7. Modificarla e salvare.
8. Aggiungere sotto-variante.
9. Allenare una variante con rami.
10. Importare PGN breve.
11. Importare PGN lungo.
12. Eliminare variante.

### 5.8 Responsive e qualita' visiva

Priorita': medio-bassa, ma importante prima di uso reale.

Manca:

- verifica mobile;
- verifica tablet;
- controllo sovrapposizioni nei pannelli;
- controllo dimensione scacchiera su viewport stretti;
- accessibilita' tastiera oltre replay;
- focus states coerenti;
- labels/aria per controlli complessi;
- eventuale drag-and-drop se richiesto.

### 5.9 Persistenza e migrazioni

Priorita': media se il DB inizia a contenere dati non temporanei.

Manca:

- sistema di migrazioni tipo Flyway/Liquibase;
- schema versionato;
- scelta consapevole H2 -> PostgreSQL/Supabase;
- compatibilita' del tipo `text`;
- strategia per evoluzione di `tree`;
- eventuale backup/export/import.

### 5.10 Funzionalita' post-MVP ancora non implementate

Come da planning, restano fuori:

- spaced repetition;
- statistiche/reportistica;
- storico sessioni training;
- storico mosse errate;
- multi-utente;
- autenticazione Supabase;
- migrazione a Supabase PostgreSQL;
- Docker/containerizzazione;
- gestione repertori/aperture come aggregati;
- import PGN robusto completo;
- esportazione PGN;
- ricerca/filtro varianti.

---

## 6. Rischi aggiornati

### R1/R12 - Rendering scacchiera

Ridotto. La scelta custom funziona e i test passano. Resta da allineare documentazione e decidere se introdurre drag-and-drop.

### R2 - Rappresentazione mosse

Parzialmente riaperto. SAN resta il formato principale, ma ora esiste anche `tree`. Serve formalizzare rapporto tra `moves` e `tree`.

### R3 - Validazione mosse legali

Ancora aperto lato backend. Il frontend e' buono, ma l'API accetta payload potenzialmente non validi.

### R4 - Validazione training

Gestita lato frontend, coerente con MVP. Con albero e rami multipli la logica e' piu' complessa ma implementata.

### R5 - Import PGN

Aperto. Parsing base funziona; salvataggio PGN lunghi no; PGN complessi restano esclusi.

### R7 - Sincronizzazione FE/BE

Aumentato. Il contratto nel planning non rispecchia piu' pienamente il codice (`tree`, `PUT`).

### R11 - Modello ad albero

Anticipato. Non e' piu' solo rischio futuro: ora e' parte del codice e va consolidato con test, documentazione e UX.

---

## 7. Prossimi passi consigliati

Ordine consigliato:

1. Correggere `sourcePgn` come colonna `text`.
2. Aggiungere test backend per PGN lungo.
3. Rieseguire test backend/frontend.
4. Aggiornare contratto API con `PUT` e `tree`.
5. Aggiornare ADR 0001 sugli SVG.
6. Scrivere ADR per modello ad albero.
7. Scrivere ADR per modifica variante esistente.
8. Formalizzare checklist manuale end-to-end.
9. Testare da browser il flusso completo: crea -> dettaglio -> training -> modifica -> ramo -> import -> delete.
10. Decidere se il prossimo prototipo deve consolidare albero/PGN o passare a funzioni post-MVP.

---

## 8. Stato finale

La webapp ha superato la fase di prototipi lineari ed e' gia' entrata in un primo MVP esteso:

- si possono visualizzare varianti;
- si possono allenare;
- si possono creare a mano;
- si possono importare da PGN semplice;
- si possono modificare;
- si possono rappresentare sotto-varianti.

Prima di costruire funzionalita' nuove, conviene fare una breve fase di consolidamento tecnico:

- correggere il bug `sourcePgn`;
- riallineare la documentazione;
- stabilizzare il contratto ad albero;
- rafforzare test e checklist manuali sui flussi completi.

