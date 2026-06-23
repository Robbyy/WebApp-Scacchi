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
- I pezzi nel Prototipo 1 usano i **glifi Unicode** (stile classico, due tonalità
  via CSS): scelta deterministica e priva di asset. Il passaggio a veri **asset SVG
  Staunton** resta un raffinamento successivo (previsto dall'analisi), senza impatti
  sul contratto del componente.
- Resta possibile, in futuro, sostituire il rendering con una libreria senza toccare
  chess.js, se emergessero esigenze non coperte.
