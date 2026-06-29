# Specifica — ISSUE-019: Introduzione di Liquibase

> **Stato: APPROVATA e IMPLEMENTATA (2026-06-29).** Set di decisioni D1–D6 confermato.
> Specifica dedicata richiesta dal vincolo CLAUDE.md ("nessun cambio infrastrutturale —
> Supabase, Docker, Liquibase — senza specifica dedicata").
> Riferimenti: [`docs/backlog.md`](../backlog.md) ISSUE-019, [`docs/roadmap.md`](../roadmap.md) §terza tornata.
>
> **Note di implementazione (scostamenti rispetto alla bozza):**
> - **D3:** su H2 le colonne `columnDefinition="text"` diventano `CLOB` mentre Hibernate
>   `validate` si aspetta `VARCHAR` (attrito noto sul keyword `text`). `validate` non è
>   praticabile → adottato il **fallback `none`** previsto dalla stessa D3. Liquibase è la
>   sola fonte dello schema; i 66 test esercitano CRUD reale.
> - **Spring Boot 4:** l'auto-config Liquibase non è più in `spring-boot-autoconfigure`;
>   `liquibase-core` da solo non basta. Aggiunto il modulo **`org.springframework.boot:spring-boot-liquibase`**
>   (porta con sé `liquibase-core`).
> - **Master changelog:** usato `include` esplicito invece di `includeAll` (più
>   deterministico dal classpath).
> - **Verifica:** 66 test verdi (baseline eseguito su H2 in-memory); avvio dev sul
>   `scacchi.mv.db` committato → baseline `MARK_RAN`, nessuna ricreazione, dati intatti.

---

## 1. Obiettivo

Introdurre **Liquibase** come sistema di migrazioni versionate dello schema del
database, sostituendo la gestione implicita di `spring.jpa.hibernate.ddl-auto=update`.
Scopo: rendere lo schema **ripetibile, tracciato e allineato** su ogni postazione di
sviluppo, ed essere pronti per la migrazione a PostgreSQL (terza tornata) senza
riscritture.

**Non** è in scope la migrazione a PostgreSQL in sé, né modifiche allo schema: questa
issue **fotografa lo schema attuale** come baseline e predispone il meccanismo.

## 2. Problema che risolve

- `ddl-auto=update` applica modifiche strutturali in modo silenzioso e solo sulla
  postazione dove si sviluppa; **non allarga colonne, non rimuove colonne, non
  gestisce dati preesistenti**. Drift già emerso su `source_pgn` (corretto con ALTER
  manuale).
- Su più postazioni, dopo un `git pull` il DB locale può risultare disallineato e il
  backend comportarsi in modo inconsistente o non avviarsi.
- Ogni futura modifica al modello dati (in particolare ISSUE-016, ISSUE-017) è
  potenzialmente rompente finché lo schema non è versionato.

## 3. Stato attuale rilevato (fonte: codice)

**Build** (`backend/pom.xml`): Spring Boot **4.1.0**, Java 21. Dipendenze rilevanti:
`spring-boot-starter-data-jpa`, `h2` (runtime), `spring-boot-h2console`.
**Nessuna dipendenza Liquibase presente.**

**Config dev** (`backend/src/main/resources/application.yml`):
- `datasource.url: jdbc:h2:file:${H2_DB_PATH:./data/scacchi};AUTO_SERVER=TRUE`, user `sa`, password vuota.
- `jpa.hibernate.ddl-auto: update` · `jpa.open-in-view: false`.
- Console H2 abilitata su `/h2-console`.

**Config test** (`backend/src/test/resources/application.yml`):
- `datasource.url: jdbc:h2:mem:testdb;DB_CLOSE_DELAY=-1` (in-memory, isolato).
- `jpa.hibernate.ddl-auto: create-drop` → **lo schema dei test oggi lo crea Hibernate.**
- 66 test: 6 `@SpringBootTest`, 1 `@DataJpaTest`, più i test di logica pura.

**Seeding**: due `CommandLineRunner` (`VariantDataInitializer` @Order(1),
`StudyDataInitializer` @Order(2)) popolano dati di esempio **via Java** quando il DB è
vuoto (idempotenti, guardia `count() > 0`). Il seeding **non** passa da SQL/schema →
resta fuori da Liquibase.

**DB di esempio**: `backend/data/scacchi.mv.db` è **tracciato di proposito**
(`.gitignore` lo ri-include con `!backend/data/*.mv.db`). Contiene schema + dati di
esempio, **ma non** la tabella `DATABASECHANGELOG` di Liquibase. (Vedi §4 D1/D6: il
punto 19 della raccolta lo dà erroneamente per non committato.)

### 3.1 Schema attuale (baseline da codificare)

Cinque tabelle. Tipi indicati in forma **DB-agnostica** (per portabilità Postgres).

| Tabella | Colonne (tipo · vincoli) |
|---------|--------------------------|
| `study` | `id` BIGINT PK autoincrement · `name` VARCHAR(255) NOT NULL · `description` CLOB · `color` VARCHAR(8) · `source_provider` VARCHAR(32) · `source_study_id` VARCHAR(64) · `source_url` CLOB · `last_imported_at` TIMESTAMP · `created_at` TIMESTAMP NOT NULL |
| `variant` | `id` BIGINT PK autoincrement · `name` VARCHAR(255) NOT NULL · `color` VARCHAR(8) NOT NULL · `moves` CLOB NOT NULL · `tree` CLOB · `starting_fen` VARCHAR(255) NOT NULL · `source_pgn` CLOB · `study_id` BIGINT · `created_at` TIMESTAMP NOT NULL |
| `training_session` | `id` BIGINT PK autoincrement · `variant_id` BIGINT NOT NULL · `study_id` BIGINT · `result` VARCHAR(16) NOT NULL · `mistakes_count` INT NOT NULL · `user_id` BIGINT · `started_at` TIMESTAMP · `completed_at` TIMESTAMP · `created_at` TIMESTAMP NOT NULL |
| `training_move` | `id` BIGINT PK autoincrement · `ply` INT NOT NULL · `expected_san` VARCHAR(255) · `played_san` VARCHAR(255) · `correct` BOOLEAN NOT NULL · `session_id` BIGINT |
| `review_schedule` | `id` BIGINT PK autoincrement · `variant_id` BIGINT NOT NULL **UNIQUE** · `study_id` BIGINT · `ease_factor` DOUBLE NOT NULL · `interval_days` INT NOT NULL · `repetitions` INT NOT NULL · `next_review_date` DATE NOT NULL · `last_reviewed_at` TIMESTAMP · `created_at` TIMESTAMP NOT NULL |

**Vincoli realmente presenti** (da rispecchiare fedelmente):
- PK su ogni `id`; UNIQUE su `review_schedule.variant_id`.
- **Una sola FK reale**: `training_move.session_id → training_session.id` (unica
  associazione JPA `@OneToMany`/`@JoinColumn`).
- `variant.study_id`, `training_session.variant_id`, `review_schedule.variant_id` sono
  colonne `BIGINT` **senza** vincolo FK (mappate come `Long` semplici). La baseline
  **non** deve introdurre questi vincoli: sarebbe una modifica di schema, non una
  fotografia. Eventuale integrità referenziale → changeset futuro dedicato, fuori
  scope qui.

## 4. Decisioni da approvare

> Queste scelte determinano l'implementazione. Indico una raccomandazione per ciascuna.

**D1 — Strategia di baseline con DB di esempio committato.** *(Raccomandata: B)*
- **B (raccomandata):** changelog unico con **precondizione `MARK_RAN`** sul changeset
  baseline (`onFail=MARK_RAN` + `not tableExists(variant)`). Su un DB che ha già lo
  schema (DB di esempio committato o qualsiasi DB dev esistente) il baseline viene
  **marcato come applicato senza eseguirlo**; su un DB nuovo (clone fresco, DB di test
  in-memory) viene **eseguito** e crea lo schema. Un solo changelog vale per entrambi
  i casi. Si mantiene il DB di esempio nel repo.
- A (alternativa): smettere di tracciare `scacchi.mv.db`, ricostruire da migrazioni +
  seeder a ogni clone. Più "canonico", ma perde i dati di esempio ricchi già committati
  e contraddice la decisione del punto 18.

**D2 — Formato e struttura del changelog.** *(Raccomandato: YAML)*
- Master: `backend/src/main/resources/db/changelog/db.changelog-master.yaml`.
- Changeset: `db/changelog/changes/0001-baseline.yaml` (e `0002-…`, `0003-…` futuri).
- YAML per coerenza con `application.yml` (XML è equivalente; decidere ora).

**D3 — Valore di `ddl-auto` dopo Liquibase.** *(Raccomandato: `validate`)*
- `validate`: Hibernate verifica che lo schema (creato da Liquibase) combaci con le
  entità — rete di sicurezza contro derive. Fallback `none` se `validate` risulta
  troppo rigido con i mapping H2 (es. tipi CLOB/TEXT).

**D4 — Schema dei test.** *(Raccomandato: Liquibase anche nei test)*
- Far creare lo schema di test da Liquibase (test fedele alle migrazioni reali):
  in `src/test/resources/application.yml` passare `ddl-auto` a `none`/`validate` e
  lasciare Liquibase attivo. La precondizione `MARK_RAN` (D1) sul DB in-memory vuoto
  → baseline eseguito → schema creato. Poiché la baseline riproduce esattamente lo
  schema che Hibernate generava, i 66 test devono restare verdi.
- Fallback a basso rischio: `spring.liquibase.enabled=false` nei test + mantenere
  `create-drop`. Tests più semplici ma non validano le migrazioni.

**D5 — Portabilità PostgreSQL.** *(Raccomandato: tipi astratti)*
- Scrivere il changelog con tipi Liquibase astratti (`BIGINT`, `VARCHAR`, `CLOB`,
  `BOOLEAN`, `TIMESTAMP`, `DATE`, `autoIncrement`) così le stesse migrazioni potranno
  targettizzare Postgres senza riscrittura. Niente SQL H2-specifico nel baseline.

**D6 — Coerenza documentale/`.gitignore`.** *(Raccomandato: correggere)*
- Allineare il testo del punto 19 e di `docs/architettura.md` / `docs/stato-corrente.md`
  (che dicono erroneamente "il file non viene committato"): il DB di esempio **è**
  tracciato di proposito. Decidere inoltre se **committare una volta** il DB di esempio
  aggiornato dopo il primo avvio con Liquibase (conterrà `DATABASECHANGELOG`/`LOCK`),
  così da lasciarlo in uno stato coerente post-baseline. *(Raccomandato: sì.)*

## 5. Scope di implementazione (dopo approvazione)

1. **`pom.xml`**: aggiungere `org.liquibase:liquibase-core` (gestito dal BOM Spring
   Boot, nessuna libreria di terze parti esterna all'ecosistema).
2. **Changelog master** + **changeset baseline** (`0001-baseline.yaml`) che crea le 5
   tabelle di §3.1 con i soli vincoli realmente presenti, con precondizione `MARK_RAN`
   (D1).
3. **`application.yml` (dev)**: `ddl-auto: update` → `validate` (D3); opzionale
   `spring.liquibase.change-log` esplicito (default già corretto).
4. **`application.yml` (test)**: allineare a D4.
5. **Documentazione**: convenzione per i nuovi changeset (naming `NNNN-descrizione`,
   un changeset per modifica, mai modificare changeset già rilasciati) in
   `backend/README.md` o `docs/`; aggiornare `architettura.md`/`stato-corrente.md`
   (D6) e l'area delicata "H2 schema drift".

## 6. Criteri di accettazione

- `liquibase-core` presente; `ddl-auto` non più `update`.
- Esiste `db.changelog-master.yaml` con il baseline che rappresenta lo schema corrente.
- **Avvio su DB di esempio committato**: il backend parte, Liquibase crea
  `DATABASECHANGELOG`/`LOCK`, marca il baseline come applicato (MARK_RAN), **non**
  tenta di ricreare tabelle esistenti, nessun errore.
- **Avvio su DB fresco** (cancellando `backend/data/`): Liquibase crea le 5 tabelle, i
  seeder popolano i dati di esempio, il backend è funzionante.
- **Suite test**: 66 test backend verdi con la strategia D4.
- Convenzione changeset documentata.

## 7. Rischi e mitigazioni

| Rischio | Mitigazione |
|---------|-------------|
| Baseline non combacia con lo schema reale → `validate` fallisce o `MARK_RAN` lascia derive | Generare il baseline da Liquibase (`generateChangeLog`) contro l'H2 attuale e rivederlo, anziché scriverlo a mano; verificare con avvio su DB esistente **e** fresco |
| Tipi `CLOB`/`text` mappati diversamente tra H2 e attese Hibernate | D3 fallback `none`; in caso, allineare `columnDefinition` lato entità in un changeset successivo (non nel baseline) |
| I test in-memory si rompono col cambio `ddl-auto` | D4: baseline con `MARK_RAN` crea lo schema su DB vuoto; fallback `liquibase.enabled=false` nei test |
| DB di esempio committato acquisisce `DATABASECHANGELOG` come drift | D6: committare una volta il DB aggiornato in stato coerente |
| Console H2 + `AUTO_SERVER` durante l'avvio di Liquibase | Nessun impatto atteso; verificare l'ordine di init datasource → Liquibase → JPA |

## 8. Fuori scope (per scelta)

- Migrazione effettiva a PostgreSQL (terza tornata, issue separata).
- Automazione di rollback/tag Liquibase (non necessaria ora, single-user).
- Spostamento dei dati di seeding dentro Liquibase (restano nei `CommandLineRunner`).
- Introduzione di vincoli FK oggi assenti (changeset futuro deliberato).

## 9. Piano di verifica

1. Build backend con la dipendenza aggiunta (`mvnw.cmd -q -DskipTests package`).
2. Avvio su **DB di esempio esistente** → log Liquibase con baseline `MARK_RAN`, nessun
   errore, app risponde (`GET /api/ping`, lista studi popolata).
3. Avvio su **DB fresco** (rinominando `backend/data/`) → baseline eseguito, seeder
   attivi, stessi endpoint verdi.
4. `mvnw.cmd test` → 66 verdi.
5. Ispezione `DATABASECHANGELOG` (via console H2) per confermare il changeset registrato.
