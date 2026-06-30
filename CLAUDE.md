# Istruzioni progetto per Claude

## Ordine di lettura

Per ogni sessione, leggi nell'ordine:

1. `README.md` — panoramica progetto, stack, struttura repo
2. `docs/stato-corrente.md` — cosa esiste oggi, funzionalità, aree delicate
3. Documento specifico per il task:
   - architettura / API / dati → `docs/architettura.md` (+ il codice, che è la fonte autorevole)
   - setup e test → `backend/README.md`, `frontend/README.md`, `docs/checklist-e2e.md`
   - decisioni tecniche → `docs/adr/decisioni-tecniche.md` (solo se il task tocca decisioni architetturali)
   - roadmap / pianificazione futura → `docs/roadmap.md`
   - contesto storico → `docs/archive/` (solo se necessario)

## Contesto operativo

- La webapp è un'app personale per l'allenamento delle aperture di scacchi.
- Backend Spring Boot (Java 21) e frontend Angular 22, **fisicamente separati**: build indipendenti, comunicazione solo via HTTP REST.
- Database H2 su file (`backend/data/scacchi`), schema gestito da Liquibase. **Versionato su Git** finché non si migra a Supabase PostgreSQL: è la fonte dei dati del repertorio condivisa tra le postazioni.
- Autenticazione Supabase Auth prevista nella terza tornata.
- Il progetto dovrà restare ordinato e predisposto per la containerizzazione Docker.

## Nota di collaborazione

- A questo progetto lavorano sia Claude sia Codex.
- Prima di modificare file esistenti, controlla sempre lo stato del repository e non sovrascrivere modifiche altrui.

## Disciplina di aggiornamento documentale

- Se cambi la firma di un controller o aggiungi/rimuovi un endpoint → **aggiorna la Panoramica API di `docs/architettura.md`** nello stesso commit (o rigenera l'OpenAPI quando sarà disponibile).
- Se cambi un'entità o una relazione → aggiorna la Mappa entità in `docs/architettura.md`.
- Aggiorna `docs/stato-corrente.md` solo se lo stato reale del progetto è cambiato (nuove funzionalità, test, aree delicate).
- Non aggiornare mai `docs/archive/` come documento vivo: è storico.

## Regole operative

- Non introdurre nuove librerie senza decisione esplicita.
- Non introdurre cambi infrastrutturali (Supabase, Docker, …) senza specifica dedicata (es. Liquibase, ISSUE-019: fatto con spec dedicata).
- Finché non si migra a Supabase, il file del database H2 (`backend/data/scacchi.mv.db`) **va versionato su Git** (è già ri-incluso nel `.gitignore` con `!backend/data/*.mv.db`): committa il file aggiornato dopo modifiche al repertorio o allo schema, così le altre postazioni restano allineate. In caso di conflitto sul binario, scegli la versione corretta (non rigenerare il file).
- Nessuna modifica incrociata tra backend e frontend (niente import diretti tra i due progetti).
- Stockfish non è mai disponibile in modalità allenamento (vincolo costruttivo — non indebolirlo).
