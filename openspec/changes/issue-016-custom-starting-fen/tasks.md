## 1. Contratti e validazione backend della FEN

- [x] 1.1 Estendere il payload di creazione/aggiornamento per trasportare la FEN iniziale delle posizioni manuali, mantenendo compatibili i payload di Apertura esistenti.
- [x] 1.2 Implementare il parsing e la normalizzazione backend della FEN generata dall'editor con contatori iniziali `0 1`.
- [x] 1.3 Implementare i controlli backend di struttura e legalità della posizione: re, pedoni, distanza fra i re e lato che ha appena mosso.
- [x] 1.4 Implementare i controlli backend di coerenza dei diritti d'arrocco e dell'en-passant con un doppio passo immediatamente precedente.
- [x] 1.5 Derivare il campo tecnico `color` dal lato al tratto della FEN valida.
- [x] 1.6 Aggiornare il validatore dell'albero affinché convalidi ogni ramo dalla FEN iniziale effettiva e accetti un albero vuoto per una posizione non di apertura.

## 2. Creazione, aggiornamento e vincoli di fase

- [x] 2.1 Risolvere studio padre e fase prima di validare e salvare una posizione creata dal relativo endpoint nidificato.
- [x] 2.2 Consentire e persistere `startingFen` custom solo per studi `MIDDLEGAME` e `ENDGAME`, associando la posizione allo `studyId` dello studio padre.
- [x] 2.3 Mantenere `START_FEN` per studi `OPENING` e varianti legacy, rifiutando esplicitamente FEN custom fuori da studi non di apertura.
- [x] 2.4 Rivalidare atomicamente tutto l'albero quando cambia la FEN iniziale di una posizione esistente e rifiutare aggiornamenti con mosse incompatibili.

## 3. Editor visuale delle posizioni

- [x] 3.1 Creare il componente dedicato di configurazione della posizione, separato dalla scacchiera di gioco, con piazzamento e rimozione dei pezzi.
- [x] 3.2 Aggiungere i controlli visuali per lato al tratto, diritti d'arrocco e casa en-passant, con anteprima della posizione configurata.
- [x] 3.3 Generare la FEN dal setup visuale e mostrare errori di validazione prima del salvataggio, mantenendo il backend come autorità.
- [x] 3.4 Creare o adattare il flusso di creazione e modifica per salvare una posizione con titolo obbligatorio, FEN e albero mosse opzionale, senza mostrare il lato da allenare.

## 4. Integrazione negli studi e compatibilità Aperture

- [x] 4.1 Dal dettaglio di uno studio `MIDDLEGAME` o `ENDGAME`, esporre l'azione e la terminologia «Nuova posizione» e aprire l'editor con lo studio corretto.
- [x] 4.2 Conservare per gli studi `OPENING` l'editor «Nuova variante», import PGN/Lichess e i flussi esistenti senza editor FEN custom.
- [x] 4.3 Presentare i figli di studi `MIDDLEGAME` e `ENDGAME` come posizioni nelle liste, breadcrumb e messaggi interessati.

## 5. Test e verifica

- [x] 5.1 Aggiungere test backend per FEN valide e non valide, re, pedoni e lato che ha appena mosso.
- [x] 5.2 Aggiungere test backend per diritti d'arrocco, en-passant e derivazione di `color`.
- [x] 5.3 Aggiungere test backend per albero vuoto, mosse legali da FEN custom, mosse incompatibili e aggiornamento atomico della FEN.
- [x] 5.4 Aggiungere test frontend per editor visuale, generazione FEN, salvataggio senza mosse e visualizzazione degli errori backend.
- [x] 5.5 Aggiungere test di integrazione UI per creazione da studi di Mediogioco/Finale e test di regressione per Aperture, import, training e varianti legacy.
- [x] 5.6 Eseguire le suite frontend e backend rilevanti e validare la change OpenSpec prima della consegna.

## 6. Punti aperti da verificare prima della chiusura del rilascio

- [ ] 6.1 Verificare e decidere il comportamento backend quando una posizione `MIDDLEGAME` o `ENDGAME` viene creata o aggiornata senza `startingFen`: l'implementazione attuale usa `START_FEN`, mentre la specifica richiede una FEN custom validata. Valutare separatamente il rifiuto in creazione e la conservazione o il rifiuto in aggiornamento.
- [ ] 6.2 Verificare se il flusso frontend deve consentire di aggiungere e modificare l'albero delle mosse di una posizione custom: il backend lo supporta e la specifica contempla il salvataggio con albero, ma l'editor visuale attuale conserva soltanto eventuali mosse già esistenti.
- [ ] 6.3 Verificare e completare, se confermato, l'adeguamento della navigazione laterale per gli studi `MIDDLEGAME` e `ENDGAME`: attualmente usa ancora la terminologia «Varianti» e mostra il campo tecnico `color` come badge Bianco/Nero.
