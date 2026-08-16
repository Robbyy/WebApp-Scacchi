## Why

Dopo la base dati della change `issue-016-middlegame-guided-study-model`, il Mediogioco deve
diventare uno strumento di studio: l'utente deve poter tentare una posizione senza vedere
l'analisi, ricevere il comportamento appropriato per tattica o strategia, consultare la soluzione
e studiare una posizione singola o una sequenza. Separare questa esperienza dal training Aperture
preserva i contratti SM-2 e consente di usare Stockfish soltanto dove richiesto.

## What Changes

- aggiungere un flusso guidato Mediogioco separato da `variant-training`, disponibile solo per
  studi classificati e posizioni complete con tema;
- implementare il flusso tattico sulla mainline unica: risposta avversaria automatica, errore
  immediato, validazione server e soluzione automatica;
- implementare il flusso strategico: risposta dalla mainline prima della deviazione, deviazione non
  conclusiva e singola risposta Stockfish soltanto dopo la deviazione;
- gestire il motore spento o indisponibile senza attivazione automatica e mantenendo disponibili
  soluzione e uscita;
- usare due soli stati di rivelazione: intero albero autore nascosto durante il tentativo e intero
  albero in sola lettura dopo la soluzione, con replay controllato dall'utente;
- consentire apertura manuale e sequenze con ordine autore/casuale e filtri `Tutte`, `Mai tentate`,
  `Da rivedere`, `Comprese`;
- aggiungere `Posizione successiva`, `Salta posizione` senza evento storico e riepilogo finale non
  persistito;
- mostrare per la singola posizione ultimo esito, numero di tentativi e data dell'ultima
  comprensione;
- verificare accessibilità, responsive, race delle risposte motore e regressioni dei flussi
  Aperture e posizionali esistenti.

## Capabilities

### New Capabilities

- `middlegame-guided-study-flows`: definisce accesso, stati UI, comportamento tattico/strategico,
  soluzione, motore esplorativo, modalità manuale/sequenziale, filtri, skip e riepiloghi.

### Modified Capabilities

- Nessuna. Il dettaglio «Mostra analisi» di R26.1 e il training Aperture restano invariati; i nuovi
  comportamenti vivono in rotte/componenti guidati dedicati.

## Impact

- **Prerequisito:** `issue-016-middlegame-guided-study-model` completata e relative spec/API
  disponibili; questa change non ridefinisce né duplica il modello.
- **Frontend:** nuove rotte/componenti di studio guidato, scacchiera, replay, stato sequenza,
  accessibilità e integrazione con `StockfishService.requestBestMove`.
- **Backend:** consumo delle API di tentativo, storico e riepilogo consegnate dalla change modello;
  nessuna persistenza di sessioni o mosse esplorative.
- **Test:** test frontend e integrazione API, build, responsive e flussi E2E 72–81; i flussi 68–71
  appartengono al gate della change modello.
- **Rilascio:** R26.3 è chiusa solo dopo entrambe le change; R27 Finale viene dopo.
