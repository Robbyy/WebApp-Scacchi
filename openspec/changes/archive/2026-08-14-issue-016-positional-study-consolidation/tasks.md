## 1. Studi posizionali e azioni contestuali

- [x] 1.1 Rimuovere la CTA duplicata dallo stato vuoto della lista Mediogioco e nascondere eventuali badge colore negli studi posizionali, aggiornando i test della lista.
- [x] 1.2 Rendere configurabile il campo colore di `StudyFormFields`, nasconderlo nella creazione posizionale e inviare `color: null`, preservando pagina e test delle Aperture.
- [x] 1.3 Nascondere colore, «Nuova posizione» e invito operativo durante la modifica di uno studio posizionale; salvare colore nullo e aggiornare i test di `StudyDetail`.

## 2. Dettaglio delle posizioni di studio

- [x] 2.1 Rendere `StudyVariantNav` compatta in `positionMode`, mostrando soltanto il titolo nel rail e nel drawer e mantenendo invariati colore/conteggio delle Aperture.
- [x] 2.2 Introdurre in `VariantDetail` lo stato transitorio di analisi nascosta, la rivelazione completa, il reset al cambio posizione e il messaggio per albero vuoto, senza cambiare il dettaglio Aperture.
- [x] 2.3 Aggiungere al dettaglio posizione l'eliminazione con conferma, toast, gestione errore e navigazione allo studio padre solo dopo successo.

## 3. Stabilità della scacchiera e layout condiviso

- [x] 3.1 Vincolare la board dell'editor FEN a una griglia 8×8 invariabile con caselle e immagini contenute, aggiungendo test strutturali mirati.
- [x] 3.2 Portare la barra di valutazione fuori dal flusso geometrico in dettaglio ed editor affinché il toggle motore non sposti o ridimensioni la scacchiera anche sui viewport stretti.
- [x] 3.3 Spostare nell'aside destro dell'editor Motore, replay, contatore, informazioni sul ramo, azioni e conferma di eliminazione, lasciando nella colonna board solo scacchiera e barra.
- [x] 3.4 Aggiungere all'editor di sezione breadcrumb e slot geometrico coerenti con il dettaglio, mantenendo identico il rettangolo della scacchiera nel passaggio dettaglio/editor quando il rail è presente.

## 4. Verifica automatica e regressioni

- [x] 4.1 Estendere i test frontend di lista/creazione/dettaglio studio per CTA, colore contestuale e modalità modifica.
- [x] 4.2 Estendere i test di navigazione e dettaglio posizione per voci compatte, analisi nascosta/rivelata/reset, albero vuoto ed eliminazione.
- [x] 4.3 Estendere i test dell'editor FEN e dell'editor mosse per struttura 8×8, collocazione dei controlli, breadcrumb e regressione Aperture.
- [x] 4.4 Eseguire la suite frontend completa, la build Angular e la suite backend completa, correggendo ogni regressione in scope.
- [x] 4.5 Isolare la home Aperture con `getStudiesByPhase('OPENING')`, aggiungere una regressione con studi posizionali di contrasto e verificarla nel browser sul database temporaneo.

## 5. Verifica browser, database e documentazione

- [x] 5.1 Verificare in browser su H2 temporaneo i flussi R26.1 a 1600, 1440, 1024, 768, 375 e 320 px, inclusi CRUD, modalità studio, responsive e console/rete pulite.
- [x] 5.2 Misurare con `getBoundingClientRect()` la board nel dettaglio, con motore acceso e nell'editor allo stesso viewport, verificando `left`, `top`, `width` e `height` invariati nei casi specificati.
- [x] 5.3 Verificare che `backend/data/scacchi.mv.db` non venga modificato, ripristinato o incluso nel rilascio e registrare le evidenze realmente osservate.
- [x] 5.4 Aggiornare checklist E2E, stato corrente, piano rilasci, roadmap, backlog e README con R26.1 soltanto dopo l'esito positivo delle verifiche.
- [x] 5.5 Rieseguire `openspec validate --strict`, controllare il diff finale e archiviare la change solo quando tutti i task e i criteri risultano completati.

> **Evidenza finale 2026-08-14:** 120 test backend, 455 frontend e build Angular verdi; flussi
> 59–63 completati a 1600/1440/1024/768/375/320 px su H2 temporaneo, console senza errori
> inattesi e dati di prova eliminati. Dettaglio, motore ed editor conservano lo stesso rettangolo
> della board nei casi previsti. Il database condiviso è rimasto a 86016 byte, timestamp
> `2026-08-14 01:45:52` e SHA-256
> `144FD67C95C4D0EE886AC7048D56510845CA94899392544B663BD4618561C943`; non è stato
> ripristinato, sovrascritto o incluso nel lavoro.

## 6. Vincolo di riuso per R27

- [x] 6.1 Registrare negli artefatti e nella pianificazione la matrice di accettazione R27: i dieci correttivi R26.1 devono essere verificati con fase `ENDGAME`, rotte `/endgame`, sei viewport e regressioni Aperture/Mediogioco; il solo riuso delle classi non vale come evidenza.
