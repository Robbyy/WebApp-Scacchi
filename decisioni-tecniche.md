# Decisioni tecniche (ADR log)

Registro sintetico delle decisioni architetturali rilevanti. Ogni voce è una
mini-ADR. Le decisioni qui prese non sostituiscono `preanalisi-progetto.md` né
`planning-prototipi-webapp.md`, ma ne tracciano l'attuazione.

---

## 0001 — Rendering scacchiera: componente custom + chess.js (T1.1)

**Data:** 2026-06-23 · **Stato:** Accettata · **Contesto:** Prototipo 1, rischi R1/R12.

### Decisione
La scacchiera è un **componente Angular custom** (CSS grid + glifi/SVG dei pezzi),
con **`chess.js` come unico motore di regole** (legalità, SAN, FEN, in futuro PGN).
Nessuna libreria di rendering scacchiera di terze parti.

### Alternative valutate
- **cm-chessboard** (rendering) + chess.js (regole): ottimo accoppiamento con
  chess.js e buon controllo CSS, ma introduce una pipeline di asset (sprite SVG,
  CSS del pacchetto) e interop ESM la cui resa va verificata visivamente — rischio
  più alto in una sessione non presidiata.
- **ngx-chess-board**: nativo Angular e semplice da integrare, ma include un
  **proprio motore di mosse**, in conflitto con il principio dell'analisi di tenere
  `chess.js` come unica fonte delle regole; inoltre controllo visivo (cornice legno,
  coordinate, token esatti) più limitato.

### Motivazioni
1. **Fedeltà visiva esatta** al riferimento Lovable (case `#f0d9b5`/`#b58863`,
   cornice legno `repeating-linear-gradient`, coordinate, palette ottone): un
   componente custom garantisce controllo pixel-level, che è proprio il criterio
   con cui l'analisi sceglie la soluzione (preanalisi righe 58-63).
2. **`chess.js` unica fonte delle regole** (principio dell'analisi): evita il doppio
   motore che `ngx-chess-board` comporterebbe.
3. **Rischio di integrazione minimo** in sessione non presidiata: niente asset
   esterni da caricare a runtime, comportamento deterministico e testabile.
4. La preanalisi **sanziona esplicitamente** la scacchiera custom Angular/CSS/SVG
   quando il fattore decisivo è il controllo visivo/di interazione (riga 63).

### Conseguenze
- Separazione netta: il componente rende e cattura input; `chess.js` valida e
  produce SAN/FEN. Coerente con la separazione "rendering vs regole" dell'analisi.
- I pezzi usano **asset SVG Staunton** serviti da `frontend/public/pieces`, in linea
  con il riferimento visivo fissato nella preanalisi.
- L'interazione utente supporta sia click su origine/destinazione sia drag and
  drop nativo HTML; entrambi passano dalla stessa logica `chess.js` di legalita',
  SAN/FEN e promozione.
- Resta possibile, in futuro, sostituire il rendering con una libreria senza toccare
  chess.js, se emergessero esigenze non coperte.

---

## 0002 — Modello mosse ad albero con mainline derivata

**Data:** 2026-06-24 · **Stato:** Accettata · **Contesto:** Estensione anticipata post-Prototipo 5, rischio R11.

### Decisione
La variante non e' piu' solo una lista lineare di SAN: puo' contenere un albero di
mosse (`MoveNode`). Ogni nodo contiene:

- `san`: la mossa in notazione SAN;
- `children`: i seguiti possibili.

La convenzione e': `children[0]` e' la continuazione principale (**mainline**);
gli altri figli sono sotto-varianti alternative.

Il campo `moves` resta nel DTO e nel modello persistito, ma rappresenta la
mainline derivata da `tree`. Se `tree` e' assente o vuoto, viene costruito un
albero lineare da `moves` per compatibilita' con varianti gia' lineari.

### Motivazioni
1. Permette di anticipare il supporto a sotto-varianti senza introdurre nuove
   tabelle o un modello di repertorio completo.
2. Mantiene semplice il consumo frontend: le viste lineari possono usare `moves`,
   mentre dettaglio, editor e training avanzato possono usare `tree`.
3. Conserva retrocompatibilita' con il contratto dei prototipi precedenti.
4. Evita una normalizzazione prematura delle mosse in entita' separate finche' il
   dominio non richiede query complesse sui singoli ply.

### Conseguenze
- Backend e frontend devono trattare `tree` come fonte completa quando presente.
- `moves` non e' piu' il dato completo della variante: e' la mainline.
- Il training puo' accettare piu' mosse corrette quando dal nodo corrente partono
  piu' figli.
- Restano da consolidare validazione backend dell'intero albero, promozione di un
  ramo a mainline, import/export PGN complesso e UX di editing avanzato.

---

## 0003 — Modifica di varianti esistenti via PUT

**Data:** 2026-06-24 · **Stato:** Accettata · **Contesto:** Estensione anticipata post-Prototipo 5.

### Decisione
La modifica di una variante esistente e' stata anticipata rispetto al planning
iniziale. Il contratto REST include:

```
PUT /api/variants/{id}
```

Il payload e' lo stesso usato per la creazione (`CreateVariantRequest`): nome,
colore, `moves`, `tree` opzionale e `sourcePgn` opzionale.

### Motivazioni
1. L'editor mossa-per-mossa del Prototipo 5 e' naturalmente riusabile anche per
   correggere o ampliare una variante gia' salvata.
2. Evita workflow scomodi del tipo elimina + ricrea.
3. Permette di far evolvere varianti create/importate senza aspettare una fase
   post-MVP separata.

### Conseguenze
- Il dettaglio variante espone un link di modifica.
- Il frontend usa `VariantService.updateVariant`.
- Il backend aggiorna nome, colore, albero/mainline e `sourcePgn`; `startingFen` e
  `createdAt` restano invariati.
- Servono ancora miglioramenti UX: conferma modifiche non salvate, feedback errori
  piu' specifici e protezione da cancellazioni accidentali di sottoalberi.

---

## 0004 — Validazione scacchistica lato backend con chesslib (P7, R13)

**Data:** 2026-06-25 · **Stato:** Accettata · **Contesto:** Prototipo 7 (Parte 2), rischio R13.

### Decisione
Il backend valida la **legalita' scacchistica** di mainline e albero prima di
persistere una variante. La libreria scelta e' **`chesslib`**
(`com.github.bhlangonijr:chesslib:1.3.4`), disponibile **solo via JitPack**
(aggiunto il repository `https://jitpack.io` al `pom.xml`), non su Maven Central.

### Alternative valutate
- **Legalita' solo lato client** (API "best effort"): scartata perche' svuota P7 di
  significato — l'API resterebbe falsificabile da chiamate dirette.
- **Validatore scacchistico scritto a mano** in Java: scartato perche' reimplementare
  le regole (inchiodature, scacco, arrocco, en passant, promozione) e' costoso e
  fragile, e duplicherebbe il motore (contrario al principio "una sola fonte di regole").

### Note di implementazione
- `chesslib.MoveList.loadFromSan` e' un **decoder SAN→mossa che NON verifica la
  legalita'** (puo' produrre mosse illegali, es. decodifica il "e4" del Nero come
  `e7e4`). La legalita' e' quindi controllata esplicitamente con
  `board.legalMoves().contains(move)` nella posizione corrente.
- L'albero e' validato in profondita': ogni nodo nella posizione del padre, a
  partire da `START_FEN`.
- Gli errori producono `400` con corpo strutturato `ValidationError`
  (`field`, `ply`, `branchPath`, `message`), gestito da `@ExceptionHandler` nel
  controller. Il frontend (editor/import) mostra il `message`.

### Conseguenze
- Nessuna variante con mosse illegali puo' entrare in DB tramite l'API.
- Dipendenza da JitPack per la build del backend (richiede rete; il workaround TLS
  `MAVEN_OPTS=-Djavax.net.ssl.trustStoreType=Windows-ROOT` resta necessario in locale).
- Le varianti partono dalla posizione iniziale standard; per future posizioni di
  partenza custom (`startingFen`) la validazione andra' estesa a partire da quella FEN.
