## 1. Modello dati backend

- [x] 1.1 Introdurre enum backend `GamePhase` con valori `OPENING`, `MIDDLEGAME`, `ENDGAME`
- [x] 1.2 Aggiungere campo `phase` all'entita' `Study` con default applicativo `OPENING`
- [x] 1.3 Aggiungere migration Liquibase per colonna `study.phase`, valorizzando gli studi esistenti come `OPENING`
- [x] 1.4 Aggiornare seed e inizializzatori dati per creare studi con fase esplicita quando necessario

## 2. Contratti API e servizi studio

- [x] 2.1 Esporre `phase` in `StudyDto` e nei model frontend corrispondenti
- [x] 2.2 Estendere il payload di creazione studio per accettare la fase, usando `OPENING` come default retrocompatibile quando assente
- [x] 2.3 Impedire la modifica della fase negli update di uno studio esistente, restituendo errore strutturato se il client prova a cambiarla
- [x] 2.4 Aggiungere filtro o query applicativa per ottenere gli studi per fase, in preparazione delle sezioni Aperture/Mediogioco/Finale

## 3. Riuso varianti come posizioni

- [x] 3.1 Documentare nel codice/API che la fase dell'elemento figlio deriva dallo studio padre
- [x] 3.2 Mantenere `Variant` come elemento figlio comune per varianti di apertura e posizioni di Mediogioco/Finale
- [x] 3.3 Conservare `startingFen` come dato tecnico della posizione iniziale senza introdurre ancora editor FEN custom
- [x] 3.4 Trattare le varianti legacy senza `studyId` come `OPENING` per retrocompatibilita'

## 4. Vincoli funzionali per fase

- [x] 4.1 Vincolare import e sync Lichess alla sola fase `OPENING`
- [x] 4.2 Nascondere o disabilitare nel frontend l'import Lichess per studi `MIDDLEGAME` ed `ENDGAME`
- [x] 4.3 Rifiutare lato backend la creazione di training session per posizioni in studi `MIDDLEGAME` o `ENDGAME`
- [x] 4.4 Nascondere o disabilitare nel frontend entrypoint training/review per studi non `OPENING`
- [x] 4.5 Evitare che le statistiche basate su training siano presentate come statistiche di posizioni di Mediogioco/Finale (sia `GET /api/stats/studies/{id}` sia `GET /api/stats/variants/{id}` rispondono 404 per elementi non `OPENING`)

## 5. Test

- [x] 5.1 Aggiungere test backend per migration/default `OPENING` sugli studi esistenti
- [x] 5.2 Aggiungere test backend per creazione studio con `OPENING`, `MIDDLEGAME`, `ENDGAME`
- [x] 5.3 Aggiungere test backend per rifiuto della modifica fase in update studio
- [x] 5.4 Aggiungere test backend per import Lichess sempre `OPENING` e non disponibile per studi non `OPENING`
- [x] 5.5 Aggiungere test backend per rifiuto training su posizioni `MIDDLEGAME`/`ENDGAME`
- [x] 5.6 Aggiungere test frontend per model/service studi con campo `phase`
- [x] 5.7 Aggiungere test frontend per visibilita' condizionata di import, training, review e statistiche in base alla fase

## 6. Documentazione e validazione

- [x] 6.1 Aggiornare documentazione di architettura/backlog con la decisione `Study.phase`
- [x] 6.2 Aggiornare eventuali ADR o note tecniche con la scelta `Study + phase` rispetto a entita' dedicate
- [x] 6.3 Validare la change OpenSpec con `openspec validate "issue-016-phase-domain-model" --type change`
- [x] 6.4 Eseguire test backend e frontend rilevanti prima di chiudere la change (83 test backend, 174 test frontend, verdi)
