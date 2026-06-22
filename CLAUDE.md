# Istruzioni progetto per Claude

Quando inizializzi una sessione in questa cartella, leggi prima il file:

- `preanalisi-progetto.md`

Quel documento contiene la descrizione iniziale del progetto, le funzionalità previste, lo stack tecnologico scelto e le priorità di sviluppo.

Contesto operativo:

- La webapp è un'app personale per l'allenamento delle aperture di scacchi.
- La struttura prevista è separata tra backend Spring Boot e frontend Angular.
- Lo sviluppo iniziale sarà locale, con database H2 in memoria.
- In seguito il database passerà a Supabase PostgreSQL.
- L'autenticazione con Supabase Auth è prevista in una fase successiva.
- Il progetto dovrà restare ordinato e predisposto per una futura containerizzazione con Docker.

Nota di collaborazione:

- A questo progetto lavoreranno sia Claude sia Codex.
- Prima di modificare file esistenti, controlla sempre lo stato del repository e non sovrascrivere modifiche non tue.
- Mantieni aggiornata la documentazione progettuale quando vengono prese decisioni architetturali rilevanti.
