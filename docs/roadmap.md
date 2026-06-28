# Roadmap e backlog

> Solo futuro. La storia dei prototipi P0–P19 è nel git log e in `docs/archive/`.

---

## Prossimo — terza tornata (infrastruttura)

1. **Migrazioni versionate (Liquibase)** — prerequisito per qualsiasi migrazione DB; fissa lo schema in changelog prima di lasciare H2.
2. **Supabase PostgreSQL** — migrazione da H2 file; verifica compatibilità colonne `text`, converter JSON, modello `tree`.
3. **Supabase Auth + attivazione `userId`** — `userId` è già predisposto nullable su `TrainingSession` e `ReviewSchedule`; con Supabase Auth diventa l'id utente (multiutente).
4. **Docker** — due immagini distinte FE/BE (la separazione di progetto è già pronta).
5. **CI/CD** — a quel punto rivalutare un runner E2E browser (Playwright/Cypress), rimandato finora per non introdurre tooling pesante.

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
