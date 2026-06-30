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
| 001 | Layout `/play` errato su Full HD | bug | GitHub | da fare |
| 002 | Pulsanti motore fuori viewport | bug | GitHub | da fare |
| 003 | Header home: wrap titolo/pulsanti | bug | GitHub | da fare |
| 004 | Nessun suono dopo ritorno focus | bug | GitHub | da fare |
| 005 | Nessun suono mosse del computer | bug | GitHub | da fare |
| 006 | Badge "Misto": contrasto testo | bug | GitHub | da fare |
| 020 | Sotto-varianti annidate non allenate | bug | GitHub | da fare |
| 021 | Scaffold navigazione 3 sezioni ⭐ | manutenzione | diretto | da fare (primo) |
| 007 | "Nascondi barra" ridondante | manutenzione | diretto | da fare |
| 008 | Rimuovere "Auto-play" | manutenzione | diretto | da fare |
| 009 | Elenco studi su due colonne | manutenzione | diretto | da fare |
| 012 | Modifica nome/descrizione/colore studio | manutenzione | diretto | da fare |
| 015 | Pagina info + versioni | manutenzione | diretto | da fare |
| 010 | Pannello varianti nel dettaglio (3 col) | manutenzione | OpenSpec? da decidere | da fare |
| 011 | Unifica creazione studio + import Lichess | manutenzione | OpenSpec? da decidere | da fare |
| 013 | Menu contestuale editor | manutenzione | OpenSpec? da decidere | da fare |
| 016 | Tutte le fasi del gioco (mediogioco/finale) | sviluppo | OpenSpec | da fare |
| 017 | Menu "Impostazioni" + SM-2 | sviluppo | OpenSpec | da fare |
| 014 | Parametri motore Stockfish (UCI) | sviluppo | OpenSpec | da fare |
| 018 | Revisione di sicurezza | audit | a sé | da fare |
| 019 | Introduzione Liquibase | infrastruttura | — | ✅ fatto (`85b4a54`) |

---

## Sequenza di lavoro

**Fase 1 — bug + manutenzione evolutiva** (prima degli sviluppi importanti):

1. ⭐ **ISSUE-021** (scaffold navigazione 3 sezioni) — da fare per primo: fissa la struttura a fasi a costo/rischio bassi.
2. **Bug**: batch layout/UX (001, 002, 003, 006) e batch audio (004, 005); a sé il bug allenamento **020** (caso di test pronto).
3. **Manutenzione evolutiva**: 007, 008, 009, 012, 015 (diretti); poi 010, 011, 013 (medi, con eventuale OpenSpec leggera).
4. **ISSUE-018 (security audit)** — anticipabile e parallelo: indipendente, basso costo, alto valore (skill `/security-review`). Le criticità che emergono diventano bug → ticket.

**Fase 2 — sviluppi importanti** (solo dopo la Fase 1, con OpenSpec):

5. **ISSUE-017** (hub Impostazioni + SM-2) → poi **ISSUE-014** (parametri motore, sezione del medesimo hub).
6. **ISSUE-016** (mediogioco/finale) — il più ampio: spezzato in più change OpenSpec incrementali; ISSUE-021 ne ha già preparato lo scaffold di navigazione.

---

## Dipendenze trasversali

- **ISSUE-019 (Liquibase, ✅)** ha sbloccato la catena dati: ISSUE-016, ISSUE-017 (`app_settings`), ISSUE-014 (se persistenza su DB).
- **ISSUE-021 → anticipa →** ISSUE-016 (scaffold di navigazione + segnaposto; 016 poi li sostituisce).
- **ISSUE-017 → ospita →** ISSUE-014 (sezione "Motore"); **→ affianca →** ISSUE-015 (cluster topbar); **→ tocca →** `ReviewScheduler`.
- **ISSUE-013 → riusa →** `promoteToMainline` (`move-tree.ts`) + `confirm.service`.
- **ISSUE-010 → riusa →** guard editor (`confirm.service` / `canLeaveEditor`).
- **ISSUE-011 → sposta →** connessione Lichess in topbar; usa endpoint esistenti.
- **Coppie da coordinare (stessa zona di codice):** 001↔002 · 004↔005 (`MoveSoundService`) · 002↔010 (dettaglio variante) · 003↔009↔011 (home/header) · 011↔012 (form studio) · 011↔015↔017↔021 (cluster/topbar).

---

## Rischi principali

1. **ISSUE-016** — scope ampio, modello dati nuovo; senza OpenSpec rischio di sovra-ingegnerizzazione. Spezzare in change piccoli.
2. **ISSUE-014** — incertezza sulle opzioni UCI realmente esposte dalla build asm.js. Mitigazione: audit prima della UI.
3. **ISSUE-017** — refactor di `ReviewScheduler` da statico a parametrizzato tocca logica testata (66 test BE): rischio regressione SM-2.
4. **ISSUE-004** — `AudioContext` browser-dipendente, difficile da coprire in headless.
5. **Cluster topbar affollato** (suono · "?" · ⚙ · Lichess · 3 sezioni) — rischio UX e di conflitti di merge tra ISSUE-011/015/017/021.

---

## Completati

- **ISSUE-019 — Introduzione Liquibase** ✅ (2026-06-29, commit `85b4a54`). Schema gestito da
  Liquibase (`spring-boot-liquibase`), baseline con precondizione `MARK_RAN`, `ddl-auto: none`;
  66 test verdi, avvio dev verificato. Spec: [`specs/liquibase.md`](specs/liquibase.md).
  Ha risolto anche l'incoerenza sul DB di esempio (tracciato di proposito, doc allineati).
