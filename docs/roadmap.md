# Roadmap e backlog

> Solo futuro. La storia dei prototipi P0–P19 è nel git log e in `docs/archive/`.

---

## Prossimo — terza tornata (infrastruttura)

> ✅ **Migrazioni versionate (Liquibase)** — fatto (ISSUE-019, 2026-06-29): schema in changelog versionato, baseline pronta, prerequisito per PostgreSQL soddisfatto. Dettagli in [`backlog.md`](backlog.md) e [`specs/liquibase.md`](specs/liquibase.md).

1. **Supabase PostgreSQL** — migrazione da H2 file; verifica compatibilità colonne `text`, converter JSON, modello `tree`. Le migrazioni Liquibase usano tipi astratti, portabili.
2. **Supabase Auth + attivazione `userId`** — `userId` è già predisposto nullable su `TrainingSession` e `ReviewSchedule`; con Supabase Auth diventa l'id utente (multiutente).
3. **Docker** — due immagini distinte FE/BE (la separazione di progetto è già pronta).
4. **CI/CD** — a quel punto rivalutare un runner E2E browser (Playwright/Cypress), rimandato finora per non introdurre tooling pesante.

---

## Più avanti

- Responsive/UX scacchiera: layout a griglia per condividere la riga board+pannello tra ~800 e ~1280px (proposta UX §17 del planning, da validare con l'utente).
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
