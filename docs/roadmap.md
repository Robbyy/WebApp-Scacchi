# Roadmap e backlog

> Solo futuro. La storia dei prototipi P0–P19 è nel git log e in `docs/archive/`.

---

## In parallelo — terza tornata (infrastruttura)

> ✅ **Migrazioni versionate (Liquibase)** — fatto (ISSUE-019, 2026-06-29): schema in changelog versionato, baseline pronta, prerequisito per PostgreSQL soddisfatto. Dettagli in [`backlog.md`](backlog.md) e [`specs/liquibase.md`](specs/liquibase.md).

1. **Supabase PostgreSQL** — migrazione da H2 file; verifica compatibilità colonne `text`, converter JSON, modello `tree`. Le migrazioni Liquibase usano tipi astratti, portabili.
2. **Supabase Auth + attivazione `userId`** — `userId` è già predisposto nullable su `TrainingSession` e `ReviewSchedule`; con Supabase Auth diventa l'id utente (multiutente).
3. **Docker** — due immagini distinte FE/BE (la separazione di progetto è già pronta).
4. **CI/CD** — a quel punto rivalutare un runner E2E browser (Playwright/Cypress), rimandato finora per non introdurre tooling pesante.

---

## Evolutive di prodotto pianificate

La sequenza temporale e di priorità delle sole evolutive aperte è nel
[`piano-rilasci-evolutivi.md`](piano-rilasci-evolutivi.md): undici incrementi
proposti da **R20** (navigazione a tre sezioni) a **R30** (parametri UCI del motore).
Il piano esclude volutamente bug, audit e infrastruttura.

> ✅ **R20 — Fondazione di navigazione** — fatto (ISSUE-021, 2026-08-05): tab
> Aperture/Mediogioco/Finale nella topbar e segnaposto riusabile per le due sezioni che
> allora non erano ancora sviluppate; R26 ha poi reso reale il Mediogioco.
>
> ✅ **R21 — Motore leggibile** — fatto (ISSUE-022 + ISSUE-007, 2026-08-05): linea
> migliore di Stockfish in SAN nel pannello motore del dettaglio variante e toggle
> «Nascondi barra» rimosso.
>
> ✅ **R22 — Ciclo di vita dello studio** — fatto (ISSUE-011 + ISSUE-012 + ISSUE-009,
> 2026-08-06): pagina unica `/studies/new` per creare/importare uno studio (Lichess
> incluso, con comando Connetti/Disconnetti in topbar e bozza ripristinata dopo l'OAuth),
> modifica inline dei metadati nel dettaglio studio e griglia home a due colonne.
>
> ✅ **R23 — Navigazione tra varianti** — fatto (ISSUE-010 + ISSUE-008, 2026-08-10):
> elenco varianti, rail/drawer, guard editor e rimozione Auto-play; corretti anche i P1
> sull'ordine delle risposte HTTP e sul riavvio del motore nell'editor con FEN invariata.
>
> ✅ **R24 — Azioni e annotazioni per mossa** — fatto (ISSUE-013 + `issue-016-move-comments`,
> 2026-08-10): menu `⋮` (anche col tasto destro) con annota/promuovi/elimina, dialog di
> annotazione con commento e un solo NAG, `MoveNode` esteso in modo retrocompatibile.
> Vedi l'[esito R24](backlog/manutenzione-evolutiva.md#esito-r24--issue-013--issue-016-move-comments-2026-08-10).
>
> ✅ **R25 — Posizioni manuali** — rilasciata il 2026-08-13 dopo la verifica
> manuale dei flussi E2E 49–52.
>
> ✅ **R26 — Mediogioco reale** — implementata e verificata il 2026-08-13:
> `/middlegame` offre lista e CRUD studi, dettaglio e CRUD posizioni, setup FEN,
> editor/dettaglio e navigazione canonici, senza le funzioni riservate alle Aperture.
> Suite 120 backend/446 frontend, build e flussi E2E 53–58 verdi; la change
> `issue-016-middlegame-section` è archiviata in OpenSpec.
>
> ✅ **R26.1 — Consolidamento delle posizioni di studio** — implementazione e verifica
> completate il 2026-08-14 (120 backend, 455 frontend, build Angular e flussi 59–63): UX degli
> studi posizionali, modalità analisi nascosta, eliminazione dal dettaglio e layout stabile
> condiviso con R27. Il gate browser/DB è chiuso e la change
> `issue-016-positional-study-consolidation` è archiviata.
>
> ✅ **R26.2 — Editor posizionale contestuale** — implementazione e verifica completate il
> 2026-08-14 (461 test frontend, build Angular e flussi 64–66 ai sei viewport): nell'editor di una
> posizione il breadcrumb è testo non focalizzabile, kicker, «Posizioni», «Motore» e «posizione
> iniziale» non compaiono e «Mosse & rami» prende il posto gerarchico del motore. Aperture e
> dettaglio posizionale restano invariati; la change è archiviata in
> `openspec/changes/archive/2026-08-14-issue-016-position-editor-contextual-actions/`.
> R27 dovrà riusare i componenti comuni e, insieme,
> verificare uno per uno tutti i correttivi R26.1 e R26.2 con fase `ENDGAME`, rotte `/endgame`,
> sei viewport e regressioni Aperture/Mediogioco: la condivisione del codice non vale come
> accettazione implicita.

In sintesi: navigazione → linea migliore del motore → gestione studi → flusso
varianti/editor → Mediogioco ✅ → Finale → gioco da posizione → impostazioni → parametri motore.

---

## Più avanti

- Responsive/UX scacchiera: dopo la chiusura di R23, valutare un layout a griglia per condividere
  la riga board+pannello tra ~800 e ~1280px. R23 non ridimensiona strutturalmente la
  scacchiera: usa il drawer per la sola navigazione varianti sotto 1500px.
- Export PGN di una variante o di un intero studio (generazione frontend `tree` → PGN con varianti tra parentesi).
- Import file `.pgn` locale (multi-partita non proveniente da Lichess).
- Spostamento di varianti tra studi (endpoint `PUT /api/variants/{id}/study` + UI).

---

## Da validare / forse

- Sincronizzazione Lichess periodica (aggiornamento automatico degli studi importati).
- Backup/restore del repertorio locale (export/import dell'intero DB applicativo).
- PWA/offline.
- Tema scuro (i token CSS sono già variabili, base pronta).
- Gamification leggera (streak di ripetizione a supporto dello SM-2).

---

## Scartato / rinviato

- Validazione "semantica" delle mosse (qualità della linea) — fuori perimetro.
- Tag e ricerca full-text — non prioritario.
- App mobile dedicata — dipende da roadmap prodotto futura.
