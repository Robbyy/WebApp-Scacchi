# Descrizione iniziale del progetto

La webapp sarà un'app personale per l'allenamento delle aperture di scacchi.

L'obiettivo principale è permettere di inserire le proprie varianti di apertura, ripeterle sulla scacchiera quante volte si vuole e ricevere un controllo automatico sugli errori di mossa.

Le varianti dovranno poter essere inserite in due modi:

- manualmente, mossa per mossa sulla scacchiera;
- tramite import PGN.

## Riferimento frontend iniziale

Il frontend dovrà riprendere il riferimento visivo del prototipo Lovable mostrato tramite screenshot:

- palette calda con sfondo chiaro/pergamena;
- scacchiera con cornice effetto legno;
- case chiare color crema e case scure marrone caldo;
- pezzi bianchi e neri in stile classico, come nel prototipo;
- layout con scacchiera grande a sinistra e pannelli laterali per mosse e PGN;
- controlli di replay sotto la scacchiera.

Palette e token visivi ricavati dal prototipo Lovable:

- case chiare scacchiera: `#f0d9b5`
- case scure scacchiera: `#b58863`
- legno scuro: `oklch(0.32 0.07 40)`
- legno medio: `oklch(0.48 0.09 45)`
- legno chiaro: `oklch(0.78 0.07 70)`
- ottone/testi evidenziati: `oklch(0.72 0.13 75)`
- sfondo pagina: chiaro caldo, con sfumature radiali color legno/pergamena
- cornice scacchiera: effetto legno con `repeating-linear-gradient` verticale
- testo decorativo principale: effetto ottone con gradiente e `background-clip: text`

Il prototipo Lovable risulta basato su React/TanStack e usa dipendenze come `react-chessboard` e `chess.js`. Il progetto definitivo però userà Angular: le dipendenze React/TanStack non dovranno essere importate nel frontend Angular. La parte riutilizzabile come indicazione tecnica è `chess.js`, utile anche in Angular per gestione regole, mosse e PGN.

Per preservare fedelmente colori e pezzi, la scacchiera potrà essere implementata come componente Angular dedicato, usando CSS e asset SVG/immagini per i pezzi invece di dipendere da una libreria React.

Nota sui pezzi: il CSS condiviso definisce colori, sfondo, legno e scacchiera, ma non contiene ancora gli asset dei pezzi. Per replicare esattamente i pezzi del prototipo sarà necessario recuperare il codice del componente `ChessReplay.tsx` o gli asset SVG/immagine usati dalla scacchiera.

Dal componente `ChessReplay.tsx` del prototipo risulta che:

- la logica della partita usa `chess.js`;
- il parsing PGN usa `Chess().loadPgn(...)`;
- lo storico delle posizioni viene ricostruito come lista di FEN;
- la scacchiera viene renderizzata con `react-chessboard`;
- i colori delle case sono configurati direttamente nel componente:
  - case chiare: `#f0d9b5`
  - case scure: `#b58863`
  - sfumature sovrapposte con `linear-gradient`
- i pezzi non sono definiti nel codice come asset custom: vengono con ogni probabilità dai pezzi predefiniti di `react-chessboard`;
- le icone dei controlli derivano da `lucide-react`, da sostituire in Angular con una libreria equivalente o con componenti SVG locali.

Traduzione prevista in Angular:

- mantenere `chess.js` come dipendenza frontend;
- non usare `react-chessboard`, perché è legata a React;
- nella prima fase usare una libreria classica per scacchiera compatibile con Angular, invece di creare subito una scacchiera custom da zero;
- scegliere una libreria che permetta controllo di FEN, orientamento, stile case e pezzi;
- replicare i pezzi predefiniti del prototipo tramite asset SVG compatibili, idealmente in stile classico Staunton;
- implementare i controlli replay come componenti Angular.

Una scacchiera custom Angular/CSS/SVG resta una possibile evoluzione futura se la libreria scelta non consentirà abbastanza controllo visivo su colori, pezzi o interazioni.

In una fase successiva, l'app dovrà includere anche:

- un sistema di spaced repetition;
- report e statistiche sulla qualità degli allenamenti eseguiti;
- autenticazione tramite Supabase Auth, anche come parte del percorso formativo.

Lo stack tecnologico individuato finora è:

- Frontend: Angular
- Backend: Java Spring Boot
- Database iniziale: H2 in memoria
- Database successivo/condiviso: Supabase PostgreSQL
- Autenticazione futura: Supabase Auth
- Repository: GitHub
- Containerizzazione/deploy: Docker

## Versioni framework e runtime

Verifica eseguita il 23 giugno 2026.

Le versioni indicate in questa sezione sono specifiche effettive del progetto, non semplici raccomandazioni. Salvo decisione esplicita futura, lo sviluppo dovrà usare queste versioni.

- Java: 21 LTS
- Spring Boot: 4.1.0
- Spring Framework: 7.0.x, gestito transitivamente da Spring Boot 4.1.x
- Build backend: Maven 3.6.3 o successivo
- Frontend: Angular 22.x
- Angular CLI: locale al progetto, non installata globalmente
- Node.js installato sul dispositivo: 24.15.0
- npm installato sul dispositivo: 11.13.0
- npx installato sul dispositivo: 11.13.0
- TypeScript: 6.0.x, gestito dal progetto Angular

Nota su Spring Boot: la scelta iniziale del progetto è Spring Boot 4.1.0 con Java 21 LTS. Spring Boot 4.1.0 richiede almeno Java 17 ed è compatibile con Java 21, quindi la combinazione è valida.

Nota su Angular: Angular 22.x è compatibile con Node.js 24.15.0 secondo la matrice ufficiale di compatibilità Angular. Si eviterà l'installazione globale della Angular CLI. Il frontend dovrà usare la CLI locale al progetto, eseguendola tramite `npx` o tramite script npm definiti nel `package.json`.

Per ora l'idea è partire con sviluppo locale, usando H2 in memoria per procedere velocemente nella prima fase.

Successivamente si passerà a Supabase PostgreSQL per avere dati persistenti e condivisi tra più PC.

Il deploy completo online è rimandato. La priorità iniziale è costruire l'app localmente, mantenendo però una struttura pulita che in futuro possa essere deployata con Docker, eventualmente prima come deploy unico e poi, se servirà, con frontend e backend separati.
