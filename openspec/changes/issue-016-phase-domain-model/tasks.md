## 1. Modello dati backend

- [ ] 1.1 Introdurre enum backend `GamePhase` con valori `OPENING`, `MIDDLEGAME`, `ENDGAME`
- [ ] 1.2 Aggiungere campo `phase` all'entita' `Study` con default applicativo `OPENING`
- [ ] 1.3 Aggiungere migration Liquibase per colonna `study.phase`, valorizzando gli studi esistenti come `OPENING`
- [ ] 1.4 Aggiornare seed e inizializzatori dati per creare studi con fase esplicita quando necessario

## 2. Contratti API e servizi studio

- [ ] 2.1 Esporre `phase` in `StudyDto` e nei model frontend corrispondenti
- [ ] 2.2 Estendere il payload di creazione studio per accettare la fase, usando `OPENING` come default retrocompatibile quando assente
- [ ] 2.3 Impedire la modifica della fase negli update di uno studio esistente, restituendo errore strutturato se il client prova a cambiarla
- [ ] 2.4 Aggiungere filtro o query applicativa per ottenere gli studi per fase, in preparazione delle sezioni Aperture/Mediogioco/Finale

## 3. Riuso varianti come posizioni

- [ ] 3.1 Documentare nel codice/API che la fase dell'elemento figlio deriva dallo studio padre
- [ ] 3.2 Mantenere `Variant` come elemento figlio comune per varianti di apertura e posizioni di Mediogioco/Finale
- [ ] 3.3 Conservare `startingFen` come dato tecnico della posizione iniziale senza introdurre ancora editor FEN custom
- [ ] 3.4 Trattare le varianti legacy senza `studyId` come `OPENING` per retrocompatibilita'

## 4. Vincoli funzionali per fase

- [ ] 4.1 Vincolare import e sync Lichess alla sola fase `OPENING`
- [ ] 4.2 Nascondere o disabilitare nel frontend l'import Lichess per studi `MIDDLEGAME` ed `ENDGAME`
- [ ] 4.3 Rifiutare lato backend la creazione di training session per posizioni in studi `MIDDLEGAME` o `ENDGAME`
- [ ] 4.4 Nascondere o disabilitare nel frontend entrypoint training/review per studi non `OPENING`
- [ ] 4.5 Evitare che le statistiche basate su training siano presentate come statistiche di posizioni di Mediogioco/Finale

## 5. Test

- [ ] 5.1 Aggiungere test backend per migration/default `OPENING` sugli studi esistenti
- [ ] 5.2 Aggiungere test backend per creazione studio con `OPENING`, `MIDDLEGAME`, `ENDGAME`
- [ ] 5.3 Aggiungere test backend per rifiuto della modifica fase in update studio
- [ ] 5.4 Aggiungere test backend per import Lichess sempre `OPENING` e non disponibile per studi non `OPENING`
- [ ] 5.5 Aggiungere test backend per rifiuto training su posizioni `MIDDLEGAME`/`ENDGAME`
- [ ] 5.6 Aggiungere test frontend per model/service studi con campo `phase`
- [ ] 5.7 Aggiungere test frontend per visibilita' condizionata di import, training, review e statistiche in base alla fase

## 6. Documentazione e validazione

- [ ] 6.1 Aggiornare documentazione di architettura/backlog con la decisione `Study.phase`
- [ ] 6.2 Aggiornare eventuali ADR o note tecniche con la scelta `Study + phase` rispetto a entita' dedicate
- [ ] 6.3 Validare la change OpenSpec con `openspec validate "issue-016-phase-domain-model" --type change`
- [ ] 6.4 Eseguire test backend e frontend rilevanti prima di chiudere la change
