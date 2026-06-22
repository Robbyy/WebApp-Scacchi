# Descrizione iniziale del progetto

La webapp sarà un'app personale per l'allenamento delle aperture di scacchi.

L'obiettivo principale è permettere di inserire le proprie varianti di apertura, ripeterle sulla scacchiera quante volte si vuole e ricevere un controllo automatico sugli errori di mossa.

Le varianti dovranno poter essere inserite in due modi:

- manualmente, mossa per mossa sulla scacchiera;
- tramite import PGN.

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
