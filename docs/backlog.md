# Backlog — indice e classificazione

> Dashboard del backlog. Le segnalazioni sono classificate e descritte **per esteso** nei
> file di classe sotto [`docs/backlog/`](backlog/). Qui vivono solo: criteri, tabella
> master, sequenza di lavoro, dipendenze e rischi trasversali. Gli ID `ISSUE-0NN` sono
> **stabili** e sono la chiave di tracciabilità verso i (futuri) ticket GitHub e change OpenSpec.
>
> Input storico (archiviato): [`archive/lista-problemi-raw.md`](archive/lista-problemi-raw.md).

---

## Classi e destinazione futura

| Classe | File | Destinazione prevista |
|--------|------|-----------------------|
| **Bug** — difetti di funzioni esistenti | [`backlog/bug.md`](backlog/bug.md) | GitHub issues (schede pronte-ticket) |
| **Manutenzione evolutiva** — migliorie a funzioni esistenti | [`backlog/manutenzione-evolutiva.md`](backlog/manutenzione-evolutiva.md) | OpenSpec **per-item** (sì/no/da decidere) |
| **Sviluppi importanti** — nuove capacità / impatto architetturale | [`backlog/sviluppi-importanti.md`](backlog/sviluppi-importanti.md) | OpenSpec (obbligatorio) |
| **Trasversale / audit** | qui sotto (ISSUE-018) | a sé; può generare bug → ticket |
| **Completati** | qui sotto | — |

---

## Tabella master

| ID | Titolo | Classe | Destinazione | Stato |
|----|--------|--------|--------------|-------|
| 001 | Layout `/play` errato su Full HD | bug | GitHub | [#1](https://github.com/Robbyy/WebApp-Scacchi/issues/1) · ✅ chiusa |
| 002 | Pulsanti motore fuori viewport | bug | GitHub | [#2](https://github.com/Robbyy/WebApp-Scacchi/issues/2) · ✅ chiusa |
| 003 | Header home: wrap titolo/pulsanti | bug | GitHub | [#3](https://github.com/Robbyy/WebApp-Scacchi/issues/3) · ✅ chiusa |
| 004 | Nessun suono dopo ritorno focus | bug | GitHub | [#4](https://github.com/Robbyy/WebApp-Scacchi/issues/4) · 🔴 aperta |
| 005 | Nessun suono mosse del computer | bug | GitHub | [#5](https://github.com/Robbyy/WebApp-Scacchi/issues/5) · 🔴 aperta |
| 006 | Badge "Misto": contrasto testo | bug | GitHub | [#6](https://github.com/Robbyy/WebApp-Scacchi/issues/6) · 🔴 aperta |
| 020 | Sotto-varianti annidate non allenate | bug | GitHub | [#7](https://github.com/Robbyy/WebApp-Scacchi/issues/7) · 🔴 aperta |
| 021 | Scaffold navigazione 3 sezioni | manutenzione | diretto | ✅ fatto (R20) |
| 022 | Visualizzazione linea migliore del motore | manutenzione | diretto | ✅ fatto (R21) |
| 007 | "Nascondi barra" ridondante | manutenzione | diretto | ✅ fatto (R21) |
| 008 | Rimuovere "Auto-play" | manutenzione | mini-spec R23 | ✅ fatto (R23) |
| 009 | Elenco studi su due colonne | manutenzione | diretto | ✅ fatto (R22) |
| 012 | Modifica nome/descrizione/colore studio | manutenzione | diretto | ✅ fatto (R22) |
| 015 | Pagina info + versioni | manutenzione | diretto | da fare |
| 010 | Pannello varianti adattivo nel dettaglio | manutenzione | mini-spec R23 | ✅ fatto (R23) |
| 011 | Unifica creazione studio + import Lichess | manutenzione | mini-spec R22 | ✅ fatto (R22) |
| 013 | Menu contestuale editor | manutenzione | diretto — mini-spec R24 | ✅ fatto (R24) |
| 016 | Tutte le fasi del gioco (mediogioco/finale) | sviluppo | OpenSpec | spezzata in change incrementali |
| 017 | Menu "Impostazioni" + SM-2 | sviluppo | OpenSpec | da fare |
| 014 | Parametri motore Stockfish (UCI) | sviluppo | OpenSpec | da fare |
| 018 | Revisione di sicurezza | audit | a sé | da fare |
| 019 | Introduzione Liquibase | infrastruttura | — | ✅ fatto (`85b4a54`) |

---

## Sequenza di lavoro

La sequenza dettagliata dei soli incrementi evolutivi è nel
[`piano-rilasci-evolutivi.md`](piano-rilasci-evolutivi.md). Ordine confermato:

1. ~~**R20:** ISSUE-021 (scaffold navigazione tre sezioni).~~ ✅ fatto (2026-08-05).
2. ~~**R21:** ISSUE-022 + ISSUE-007 (linea migliore del motore e semplificazione pannello).~~ ✅ fatto (2026-08-05).
3. ~~**R22:** ISSUE-011 + ISSUE-012 + ISSUE-009 (ciclo di vita dello studio e home).~~ ✅ fatto (2026-08-06).
4. ~~**R23:** ISSUE-010 + ISSUE-008 (navigazione e controlli del dettaglio variante).~~ ✅ fatto (2026-08-10).
5. ~~**R24:** ISSUE-013 + `issue-016-move-comments` (editor).~~ ✅ fatto (2026-08-10).
6. **R25:** posizione FEN custom. ✅ Implementata, integrata in `master` e verificata manualmente (flussi E2E 49–52, 2026-08-13).
7. **R26–R28:** slice residue di ISSUE-016: Mediogioco → Finale → gioco da posizione.
8. **R29–R30:** ISSUE-015 + ISSUE-017 → ISSUE-014 (info, impostazioni, parametri motore).

I bug GitHub e l'audit di sicurezza seguono le proprie priorità e **non** fanno parte
di questa cadenza di rilasci evolutivi.

---

## Dipendenze trasversali

- **ISSUE-019 (Liquibase, ✅)** ha sbloccato la catena dati: ISSUE-016, ISSUE-017 (`app_settings`), ISSUE-014 (se persistenza su DB).
- **ISSUE-021 ✅ → abilita →** ISSUE-016 (scaffold di navigazione + segnaposto; 016 poi li sostituisce con le sezioni reali).
- **ISSUE-017 → ospita →** ISSUE-014 (sezione "Motore"); **→ affianca →** ISSUE-015 (cluster topbar); **→ tocca →** `ReviewScheduler`.
- **ISSUE-013 ✅ → ha riusato →** `promoteToMainline` (`move-tree.ts`) e la conferma di
  cancellazione già presente nell'editor; le annotazioni di R24 passano da `setAnnotation`
  nello stesso modulo.
- **ISSUE-010 → riusa →** `StudyService.getStudy`, guard editor (`confirm.service` /
  `canLeaveEditor`) e ciclo R21 del pannello motore; il cambio del solo parametro `:id`
  richiede gestione esplicita nel componente.
- **ISSUE-011 → sposta →** connessione Lichess in topbar; usa endpoint esistenti.
- **ISSUE-022 → riusa →** `StockfishService`, `parseInfoLine`, `EvalBar` e il pannello motore del dettaglio variante; nessun impatto backend/database.
- **Coppie da coordinare (stessa zona di codice):** 001↔002 · 004↔005 (`MoveSoundService`) · 002↔010 (dettaglio variante) · 003↔009↔011 (home/header) · 011↔012 (form studio) · 011↔015↔017↔021 (cluster/topbar).

---

## Rischi principali

1. **ISSUE-016** — scope ampio, modello dati nuovo; senza OpenSpec rischio di sovra-ingegnerizzazione. Mitigazione: partire da `issue-016-phase-domain-model`, poi procedere con slice piccoli.
2. **ISSUE-014** — incertezza sulle opzioni UCI realmente esposte dalla build asm.js. Mitigazione: audit prima della UI.
3. **ISSUE-017** — refactor di `ReviewScheduler` da statico a parametrizzato tocca logica testata (120 test BE): rischio regressione SM-2.
4. **ISSUE-004** — `AudioContext` browser-dipendente, difficile da coprire in headless.
5. **Cluster topbar affollato** (suono · "?" · ⚙ · Lichess · 3 sezioni) — rischio UX e di conflitti di merge tra ISSUE-011/015/017/021.

---

## Completati

- **ISSUE-013 + `issue-016-move-comments` — Azioni e annotazioni per mossa** ✅ (R24,
  2026-08-10). Menu `⋮` (anche col tasto destro) su ogni mossa del pannello «Mosse & varianti»
  con annota / promuovi a mainline / elimina, dialog di annotazione con commento (max 1.000
  caratteri) e un solo NAG fra sei; `MoveNode` esteso con `comment`/`nag` opzionali nello stesso
  JSON dell'albero, senza migration né endpoint nuovi. Backend 103 test verdi, frontend 338.
  Parser PGN/Lichess non esteso e «Elimina continuazioni» fuori scope: restano punti aperti.
  Esito: [`backlog/manutenzione-evolutiva.md`](backlog/manutenzione-evolutiva.md).

- **ISSUE-011 + ISSUE-012 + ISSUE-009 — Ciclo di vita dello studio** ✅ (R22, 2026-08-06).
  Pagina unica `/studies/new` per creazione e import Lichess (route storica reindirizzata
  con query param preservati), comando Connetti/Disconnetti Lichess in topbar con bozza
  ripristinata dopo l'OAuth, modifica inline dei metadati nel dettaglio (campi condivisi
  `study-form-fields`, `PUT` esistente, `phase` mai inviata), griglia home adattiva a
  massimo due colonne. Frontend: 249 test verdi. Schede ed esiti:
  [`backlog/manutenzione-evolutiva.md`](backlog/manutenzione-evolutiva.md).

- **ISSUE-021 — Scaffold navigazione tre sezioni** ✅ (R20, 2026-08-05). Tab-link
  Aperture/Mediogioco/Finale nella topbar (`nav` + `aria-current`), route `/middlegame` e
  `/endgame` sul segnaposto riusabile `sections/coming-soon`, topbar a una riga da 768px e
  a due righe sotto. Scheda: [`backlog/manutenzione-evolutiva.md`](backlog/manutenzione-evolutiva.md).
  Frontend: 194 test verdi. ISSUE-016 sostituirà i segnaposto con le sezioni reali.

- **ISSUE-019 — Introduzione Liquibase** ✅ (2026-06-29, commit `85b4a54`). Schema gestito da
  Liquibase (`spring-boot-liquibase`), baseline con precondizione `MARK_RAN`, `ddl-auto: none`;
  Verifica iniziale: 66 test verdi; suite corrente: 120 test backend verdi. Avvio dev verificato.
  Spec: [`specs/liquibase.md`](specs/liquibase.md).
  Ha risolto anche l'incoerenza sul DB di esempio (tracciato di proposito, doc allineati).

- **ISSUE-001 — Layout `/play` errato su Full HD** ✅ Risolta e chiusa su GitHub; commit `23673cd`.
- **ISSUE-002 — Pulsanti motore fuori viewport** ✅ Risolta e chiusa su GitHub; commit `b401f9c`.
- **ISSUE-003 — Header home: wrap titolo/pulsanti** ✅ Risolta e chiusa su GitHub; commit `aa5048b`.
