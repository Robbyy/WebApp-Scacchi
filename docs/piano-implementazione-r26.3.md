# Piano di implementazione — R26.3

> Piano operativo per implementare in modo sequenziale le due change OpenSpec del rilascio
> **R26.3 — Studio guidato del Mediogioco**.
>
> Aggiornato al: **2026-08-19**. Questo documento ordina i task già definiti nei due `tasks.md`;
> non li sostituisce e non introduce requisiti nuovi.

## 1. Obiettivo e fonti

R26.3 è un solo rilascio di prodotto composto da due change sequenziali:

1. `issue-016-middlegame-guided-study-model` — modello, migrazioni, API e compatibilità legacy;
2. `issue-016-middlegame-guided-study-flows` — esercizio tattico/strategico e modalità sequenziale.

Fonti da leggere prima di iniziare:

- [preflight di dominio](preflight-mediogioco-studio-guidato.md);
- [analisi tecnica](analisi-mediogioco-studio-guidato.md);
- [proposal, design, spec e task della change modello archiviata](../openspec/changes/archive/2026-08-17-issue-016-middlegame-guided-study-model/);
- [proposal, design, spec e task della change flussi archiviata](../openspec/changes/archive/2026-08-19-issue-016-middlegame-guided-study-flows/);
- [checklist E2E R26.3](checklist-e2e.md#flussi-aggiunti-r263-change-flussi--gate-b9-verificata-il-2026-08-19).

Le specifiche OpenSpec e i due `tasks.md` sono la fonte normativa dei requisiti. Questo piano
serve soltanto a stabilire l'ordine di esecuzione e i punti di controllo.

## 2. Stato di partenza

- Branch previsto dal profilo: `master`.
- Change A e B: quattro artefatti completi ciascuna, `openspec validate --all --strict` superata.
- Change A: **40/40 task completati**, verificati e archiviati il 2026-08-17.
- Change B: **55/55 task completati**, verificati e archiviati il 2026-08-19 (gate B9).
- Evidenze finali: 191 test backend, 692 frontend, build verde, flussi E2E 68–81 verificati
  (72–81 il 2026-08-19, inclusa la riesecuzione di regressione 68–71).
- **R26.3 è rilasciata** come prodotto: entrambe le change sono implementate, verificate e archiviate.
- `backend/data/scacchi.mv.db` è una risorsa protetta: non va usata per test, migration, preview,
  ripristini o staging.

## 3. Regole di esecuzione per l'AI implementatrice

1. Prima di modificare il codice, controllare `git status`, branch, commit e disponibilità della
   CLI OpenSpec; non ripristinare modifiche preesistenti.
2. Completare i task nell'ordine di questo documento, mantenendo i checkbox dei due `tasks.md`
   coerenti con il lavoro realmente concluso.
3. Non anticipare task della change B finché A non è implementata, verificata e archiviata.
4. Dopo ogni gruppo, eseguire i test pertinenti e riportare file modificati, comandi e risultato;
   non considerare un task completo solo perché il codice compila.
5. Usare H2 temporaneo per test, migration e browser; non avviare l'applicazione contro il database
   condiviso.
6. Non modificare il dominio deciso nel preflight senza registrare prima un nuovo punto aperto e
   fermarsi per una decisione; i dettagli tecnici possono seguire i pattern esistenti senza
   cambiare i contratti delle spec.
7. Non creare risultati locali non richiesti, non introdurre dipendenze o servizi nuovi e non
   committare/pushare finché il committente non lo autorizza esplicitamente.

## 4. Gate preliminare comune

Prima del codice, per **ciascuna change** devono essere prodotti gli artefatti di governance
previsti dal workflow `openspec-v2`:

- `governance/triage.md` con esito `OPENSPEC`;
- `governance/proposal-gate.md` con esito `READY`;
- `governance/design-specs-gate.md` con esito `READY`;
- `governance/tasks-gate.md` con esito `READY`.

La validazione CLI già superata controlla la struttura, ma non sostituisce questi gate di
contenuto. Se un gate restituisce `REWORK`, si corregge soltanto l'artefatto indicato e si ripete
il gate prima di proseguire. Un esito `WAITING_DECISION`, `SPLIT_CHANGE` o `BLOCKED` sospende
l'esecuzione.

## 5. Change A — modello

File normativo: `openspec/changes/archive/2026-08-17-issue-016-middlegame-guided-study-model/tasks.md`.

| Ordine | Task sorgente | Contenuto | Uscita verificabile |
|---|---|---|---|
| A1 | 1.1–1.7 | Changeset Liquibase, colonne additive, catalogo temi, backfill ordine, `PositionAttempt`, vincoli e test migration. | Schema aggiornabile su database vuoto e legacy, seed stabile, backfill contiguo, cascade e rollback/fallimento atomico verificati su H2 temporaneo. |
| A2 | 2.1–2.6 | `studyType`, classificazione legacy una tantum, immutabilità, catalogo temi e compatibilità per fase/tipo. | API e service rifiutano stati/tipi incompatibili e conservano Aperture, Finale e legacy. |
| A3 | 3.1–3.6 | Metadati posizione, tema per ID, difficoltà, descrizione, fonte, ordine e riordino transazionale. | CRUD e riordino completo funzionano; tema mancante legacy resta modificabile ma non eleggibile. |
| A4 | 4.1–4.7 | Storico tentativi, validazione tattica backend, esiti strategici, riepiloghi e cascade. | Endpoint autorevoli, eventi immutabili, storico ordinato e riepiloghi coerenti. |
| A5 | 5.1–5.7 | UI di classificazione, metadati, temi, ordine e riepilogo senza percentuali. | Interfaccia Mediogioco aggiornata senza regressioni Aperture/Finale e senza attivare ancora il guidato. |
| A6 | 6.1–6.7 | Suite, build, E2E 68–71, protezione DB, aggiornamento stato, review e archiviazione. | Change A implementata, verificata, archiviata senza `--skip-specs`; spec canoniche e API sono baseline di B. |

### Sequenza interna consigliata per A

1. Eseguire A1 e verificare subito schema, seed e backfill.
2. Eseguire A2, perché il tipo dello studio è il discriminante per tutte le regole successive.
3. Eseguire A3, che dipende dal tipo e dal catalogo temi.
4. Eseguire A4, che dipende da modello, FEN/mainline e tema/eleggibilità.
5. Eseguire A5 dopo che gli endpoint backend sono stabili.
6. Eseguire A6 come gate di integrazione; solo dopo la sua archiviazione passare a B.

## 6. Passaggio obbligatorio A → B

La change B può iniziare soltanto quando sono vere tutte queste condizioni:

- A ha tutti i task completati;
- suite backend/frontend e build sono verdi;
- E2E 68–71 sono verificati su H2 temporaneo;
- il database condiviso è invariato;
- `openspec validate` e review di A sono positive;
- A è archiviata senza `--skip-specs`;
- le spec canoniche e gli endpoint di A sono disponibili e letti come baseline da B.

Le condizioni sono state soddisfatte: A è stata archiviata il 2026-08-17 e B è stata completata e
archiviata il 2026-08-19 (55/55 task, gate B9). La regola resta vincolante per qualsiasi
riapertura o nuova change.

## 7. Change B — flussi guidati

File normativo archiviato: `openspec/changes/archive/2026-08-19-issue-016-middlegame-guided-study-flows/tasks.md`.

| Ordine | Task sorgente | Contenuto | Uscita verificabile |
|---|---|---|---|
| B1 | 1.1–1.5 | Prerequisito A, route guidate, feature separata dal training Aperture, eleggibilità e CTA. | Accesso manuale/sequenziale solo a posizioni eleggibili e route errate gestite senza eventi. |
| B2 | 2.1–2.6 | Macchina a stati comune, FEN iniziale, board lock, albero nascosto, soluzione e replay. | Tentativo isolato dall'authoring, due soli stati di rivelazione, nessun autoplay. |
| B3 | 3.1–3.7 | Tattica: confronto mainline, risposte automatiche, deviazione, esito backend e retry. | Successo/deviazione/errori registrano soltanto l'esito validato dal server; Stockfish escluso. |
| B4 | 4.1–4.9 | Strategia: deviazione, motore opzionale, guard epoch/FEN/request, soluzione ed esito manuale. | Una risposta motore per richiesta, callback obsolete ignorate, soluzione sempre disponibile. |
| B5 | 5.1–5.5 | Modalità manuale, retry, uscita, storico e riepilogo posizione. | Tentativi multipli coerenti e nessun evento per uscita senza esito. |
| B6 | 6.1–6.5 | Configurazione sequenziale, ordine, filtri e snapshot stabile. | Filtri `ALL`, `NEVER_ATTEMPTED`, `TO_REVIEW`, `UNDERSTOOD`; nessuna sessione persistita. |
| B7 | 7.1–7.7 | Avanzamento esplicito, skip, conferma, retry e riepilogo finale non persistito. | Categorie mutuamente esclusive, posizione proposta una sola volta, skip senza tentativo. |
| B8 | 8.1–8.4 | Accessibilità, responsive, focus, layout e regressioni. | Nessun overflow, contenuto nascosto non focalizzabile, regressioni Aperture/R26.1/R26.2 assenti. |
| B9 | 9.1–9.7 | Suite completa, build, E2E 72–81, regressioni 68–71, protezione DB, review e archivio. | R26.3 rilasciabile soltanto dopo entrambe le change e tutte le evidenze. |

### Sequenza interna consigliata per B

1. B1–B2 costruiscono routing e stato comune prima di aggiungere i due comportamenti didattici.
2. B3 implementa e verifica completamente la tattica, senza introdurre il motore.
3. B4 aggiunge la strategia e la protezione dalle callback Stockfish obsolete.
4. B5 collega i tentativi alla modalità manuale e allo storico già esposto da A.
5. B6–B7 costruiscono la modalità sequenziale sopra il tentativo comune, senza persistere sessioni.
6. B8 chiude accessibilità e regressioni prima del gate finale B9.
7. B9 esegue l'integrazione completa, archivia B e aggiorna la documentazione di rilascio.

## 8. Verifica finale del rilascio

R26.3 è completata soltanto quando:

- A e B hanno implementazione, test e review positive;
- le due change sono archiviate senza `--skip-specs`;
- `openspec validate --all --strict` è positiva dopo l'archiviazione;
- test backend/frontend, build e flussi E2E 68–81 sono verificati;
- i sei viewport previsti, console e rete sono controllati;
- il database condiviso non è stato modificato;
- `README`, stato corrente, piano, backlog, roadmap e checklist riportano conteggi ed evidenze
  reali;
- R27 — Finale reale — è indicata come rilascio successivo.

## 9. Protocollo di handoff tra sessioni AI

Ad ogni passaggio la sessione ricevente deve ricevere:

1. questo piano;
2. il `tasks.md` della change corrente;
3. lo stato Git e l'ultimo commit;
4. l'elenco dei task già chiusi e quelli da eseguire nel prossimo gruppo;
5. i test già eseguiti, i risultati e gli eventuali problemi aperti.

La sessione non deve ricominciare da un riepilogo generico: deve ripartire dal primo task non
spuntato del gruppo corrente, verificare i prerequisiti e fermarsi dopo aver prodotto evidenze
leggibili per la sessione successiva.
