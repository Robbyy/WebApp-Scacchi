## Context

R26 riusa componenti nati per le Aperture (`StudyDetail`, `StudyFormFields`, `VariantDetail`,
`VariantEditor`, `StudyVariantNav`) e l'editor FEN introdotto in R25. La verifica live ha mostrato
che alcuni dettagli di quel riuso sono semanticamente errati per le posizioni e che dettaglio ed
editor non condividono ancora una geometria stabile. Inoltre la spec R26 rende immediatamente
visibile l'albero salvato, mentre le posizioni di Mediogioco/Finale devono essere consultate come
materiale di studio con analisi inizialmente nascosta.

Il backend espone già tutti i contratti necessari. In particolare `Variant` contiene
`startingFen` e albero, mentre `DELETE /api/variants/{id}` elimina l'elemento figlio. Il database
condiviso è versionato e non deve essere usato durante sviluppo o verifica.

## Goals / Non-Goals

**Goals:**

- chiudere tutte le segnalazioni R26-UI-01..06 e 08..10 e R26-FUNC-07;
- mantenere stabili posizione e dimensione della scacchiera nei passaggi rilevanti;
- rendere i componenti posizionali pronti al riuso di R27 senza attivare oggi il Finale;
- preservare integralmente i flussi e i metadati specifici delle Aperture;
- ottenere criteri automatici e browser verificabili senza modificare la persistenza.

**Non-Goals:**

- attivare `/endgame` o implementare R27;
- introdurre training posizionale, suggerimenti progressivi, autoverifica o punteggi;
- cambiare `Study.phase`, `Variant`, API, schema Liquibase o database condiviso;
- cambiare import/sync Lichess, review/SM-2, statistiche o gioco contro Stockfish.

## Decisions

### 1. Una sola change con blocchi implementativi separati

R26.1 usa una sola change perché form, dettaglio, editor e modalità studio convergono sugli stessi
componenti e sulle stesse regressioni. I task saranno separati per area, così ogni blocco resterà
verificabile. Due change parallele sono state scartate perché duplicherebbero i delta spec e
aumenterebbero i conflitti su `VariantDetail` e relativo CSS.

### 2. Il colore resta nel modello condiviso ma non nell'esperienza posizionale

`StudyFormFields` riceverà un input contestuale che mantiene il colore visibile per default e lo
nasconde negli studi non `OPENING`. Creazione e modifica posizionali invieranno `color: null` e
lista/dettaglio non presenteranno eventuali valori legacy. Rimuovere il campo dal modello è stato
scartato perché romperebbe le Aperture e richiederebbe una migrazione non necessaria.

### 3. Le azioni contestuali riusano servizi esistenti

Durante la modifica inline dello studio la CTA «Nuova posizione» e il relativo invito vuoto non
saranno renderizzati. L'eliminazione dal dettaglio posizione userà `ConfirmService`,
`VariantService.deleteVariant` e `ToastService`; solo il successo navigherà allo studio padre.
Non viene introdotto un nuovo endpoint né un nuovo servizio applicativo.

### 4. La modalità studio è uno stato frontend transitorio

`VariantDetail` manterrà un segnale di rivelazione inizializzato a `false` per le posizioni. Se
l'albero non è vuoto, il DOM mostrerà un invito e «Mostra analisi»; al click renderizzerà albero,
commenti, NAG, replay e contatore. Il reset già eseguito al cambio `:id` ripristinerà lo stato
nascosto. Le Aperture considereranno l'analisi sempre visibile. Persistenza della scelta,
protezione server dell'albero e rivelazione progressiva sono state scartate perché fuori perimetro.

### 5. Dettaglio ed editor condividono lo stesso contratto geometrico

L'editor di sezione mostrerà lo stesso breadcrumb del dettaglio e userà la stessa shell di
larghezze. Sopra la soglia del rail, quando esistono posizioni sorelle, l'editor riserverà uno slot
di pari larghezza senza trasformare il rail in contenuto permanente. La barra di valutazione sarà
posizionata rispetto alla board senza contribuire alla larghezza del flusso; attivarla non cambierà
quindi il rettangolo della scacchiera. Nell'editor `.board-col` conterrà solo board e barra, mentre
toggle motore, replay, contatore, ramo, azioni e conferma vivranno nell'aside.

Una nuova shell applicativa generale è stata scartata: il contratto può essere ottenuto con il
markup e gli stili dei due componenti condivisi, riducendo il rischio di regressioni estranee.

### 6. L'editor FEN impone esplicitamente la griglia

La board di setup userà colonne e righe `repeat(8, minmax(0, 1fr))`; caselle e immagini avranno
dimensioni contenute, `overflow: hidden`, `box-sizing: border-box` e `object-fit: contain`. In questo
modo le dimensioni intrinseche degli SVG non possono influenzare i track della griglia.

### 7. I test geometrici sono browser-level

Vitest coprirà rendering condizionale, azioni, payload, reset e regressione Aperture. La checklist
browser misurerà `getBoundingClientRect()` a parità di viewport per dettaglio, motore acceso ed
editor, oltre a verificare responsive e assenza di overflow. I test che dipendono dal layout reale
non saranno simulati in jsdom.

### 8. R27 verifica i contratti, non presume il risultato dal riuso

La change `issue-016-endgame-section` riuserà per default i componenti posizionali consolidati,
senza crearne copie dedicate al Finale. Il riuso atteso riguarda soprattutto il form contestuale
senza colore, la griglia dell'editor FEN, lo stato di analisi nascosta di `VariantDetail`, la barra
di valutazione fuori flusso, l'aside di `VariantEditor` e la modalità compatta di
`StudyVariantNav`. Questo riduce il codice da implementare, ma non costituisce evidenza di
accettazione.

R27 dovrà verificare esplicitamente anche i punti sensibili alla fase e alle rotte: CTA unica nella
lista Finale, azioni nascoste durante la modifica dello studio, eliminazione con ritorno a
`/endgame/studies/{id}`, breadcrumb e percorsi canonici `/endgame`, filtro esatto `ENDGAME` e
geometria della board con il rail delle posizioni Finale. Per tutti i dieci correttivi sono richiesti
test automatici con dati `ENDGAME`; layout, responsive e misure geometriche saranno inoltre provati
nel browser alle larghezze 1600, 1440, 1024, 768, 375 e 320 px. Le regressioni Aperture e
Mediogioco restano parte dello stesso gate.

Una implementazione separata dei componenti Finale è ammessa solo se la change R27 documenta una
necessità reale non coperta dalla configurazione per fase; la somiglianza visuale, da sola, non
giustifica una duplicazione.

### 9. La home Aperture usa il filtro di fase esplicito

Prima del modello a fasi `GET /api/studies` e la home coincidevano perché ogni studio era
implicitamente un'Apertura. Con gli studi posizionali, la chiamata senza filtro restituisce invece
tutte le fasi e può far comparire studi `MIDDLEGAME`/`ENDGAME` sotto il tab Aperture. `StudyList`
userà quindi il contratto esistente `getStudiesByPhase('OPENING')`; non serve cambiare API o
backend. Il test della home includerà una risposta posizionale di contrasto e verificherà che venga
richiesta soltanto la fase `OPENING`.

## Risks / Trade-offs

- **[Il rail può cambiare la centratura sopra 1500 px]** → dettaglio ed editor usano lo stesso slot
  e la stessa soglia; la geometria viene confrontata nel browser.
- **[La barra assoluta può uscire dal viewport stretto]** → regola responsive dedicata e verifica a
  375/320 px senza overflow o ridimensionamento al toggle.
- **[Nascondere il colore può lasciare valori legacy persistiti]** → l'UI non li presenta e ogni
  salvataggio posizionale invia `null`; nessuna migrazione distruttiva.
- **[L'albero arriva comunque nella risposta HTTP]** → la modalità studio è deliberatamente una
  protezione UX, non un confine di sicurezza.
- **[Lo spostamento dei controlli può allungare l'aside]** → scorrimento naturale della pagina e
  layout verticale responsive, senza contenuti permanenti sotto la board desktop.
- **[Il riuso può mascherare un errore di configurazione ENDGAME]** → matrice R27 punto per punto,
  fixture `ENDGAME`, verifica delle rotte canoniche e prove browser dedicate; nessun punto è chiuso
  per inferenza dal solo comportamento Mediogioco.
- **[La lista senza filtro può mescolare le fasi]** → la home Aperture e ogni sezione posizionale
  inviano sempre la propria fase all'endpoint di lista.

## Migration Plan

Non sono previste migrazioni dati o schema. L'implementazione è distribuibile come aggiornamento
frontend; il rollback consiste nel ripristino dei componenti e degli stili precedenti. Le prove che
creano o eliminano dati useranno esclusivamente H2 temporaneo e confronteranno lo stato del database
condiviso prima e dopo.

## Open Questions

Nessuna. Le scelte residue di dettaglio visuale saranno risolte con la soluzione minima coerente
con i requisiti e verificate alle larghezze previste dalla checklist.
