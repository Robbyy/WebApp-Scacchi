# Ripetizione spaziata (SM-2) — come funziona

> **Fonte autorevole:** il codice in `backend/src/main/java/com/scacchi/backend/review/`
> e i test in `ReviewSchedulerTest` sono la verità. Questo documento spiega la teoria e
> il comportamento dell'implementazione attuale. La *decisione* di adottare questo
> approccio è registrata nell'ADR 0012 ([`docs/adr/decisioni-tecniche.md`](adr/decisioni-tecniche.md)).

---

## A cosa serve

La **ripetizione spaziata** (spaced repetition) è una tecnica di memorizzazione: invece
di ripassare tutto con la stessa frequenza, si rivede ogni elemento poco **prima** di
dimenticarlo. Ciò che padroneggi torna sempre più di rado; ciò che sbagli torna subito.

Nella webapp ogni **variante di apertura** ha una sua pianificazione di ripasso. Dopo
ogni allenamento concluso, l'esito (completato? quanti errori?) ricalcola **quando**
quella variante andrà ripassata. La vista **«Ripeti oggi»** (`/reviews`) elenca le
varianti scadute.

L'algoritmo usato è una variante semplificata di **SM-2** (l'algoritmo storico di
SuperMemo), con un adattamento di *relearning* descritto più sotto.

---

## I parametri

Ogni variante ha **una sola** pianificazione, l'entità `ReviewSchedule`. I parametri che
governano l'algoritmo sono tre, più due date:

| Parametro | Tipo | Significato | Valore iniziale |
|-----------|------|-------------|-----------------|
| `easeFactor` (EF) | `double` | Quanto è "facile" la variante. Più è alto, più gli intervalli crescono in fretta. | `2.5` (mai sotto `1.3`) |
| `intervalDays` | `int` | Giorni di attesa fino al prossimo ripasso. `0` = ripeti **oggi**. | `0` |
| `repetitions` | `int` | Quante volte di fila la variante è stata superata con esito positivo. Azzerato a ogni esito negativo. | `0` |
| `nextReviewDate` | `LocalDate` | Data del prossimo ripasso (`oggi + intervalDays`). | — |
| `lastReviewedAt` | `Instant` | Timestamp dell'ultimo allenamento che ha aggiornato la schedule. | — |

Costanti (in `ReviewScheduler`): `INITIAL_EASE = 2.5`, `MIN_EASE = 1.3`.

---

## Passo 1 — dall'allenamento al voto di qualità

SM-2 ragiona su un **voto di qualità** da 0 a 5. L'app lo deriva dall'esito
dell'allenamento con `ReviewScheduler.quality(completed, mistakesCount)`:

- sessione **interrotta** (non completata) → **1**;
- sessione **completata** → `5 - numeroErrori`, con un **minimo di 2**.

In pratica:

| Esito allenamento | Voto qualità |
|-------------------|:------------:|
| Completato, 0 errori | 5 |
| Completato, 1 errore | 4 |
| Completato, 2 errori | 3 |
| Completato, 3 errori | 2 |
| Completato, 4+ errori | 2 (minimo) |
| Interrotto | 1 |

La **soglia di promozione** è qualità **≥ 3**. Quindi: completare con **al massimo 2
errori** è un esito *positivo*; **3 o più errori** (oppure interrompere) è *negativo*.

---

## Passo 2 — il calcolo del nuovo intervallo

La logica è in `ReviewScheduler.next(easeFactor, intervalDays, repetitions, quality)`,
una funzione **pura** (nessuno stato, nessun accesso al DB). Decide il nuovo intervallo
in base al voto.

### Esito positivo (qualità ≥ 3)

L'intervallo cresce seguendo gli scaglioni classici di SM-2:

- se `repetitions == 0` → intervallo = **1 giorno**;
- se `repetitions == 1` → intervallo = **6 giorni**;
- se `repetitions ≥ 2` → intervallo = `round(intervalDays × easeFactor)`.

Poi `repetitions` viene incrementato di 1.

> Nota: la moltiplicazione usa l'`easeFactor` **corrente** (quello memorizzato dal passo
> precedente), prima dell'aggiornamento descritto sotto.

### Esito negativo (qualità < 3) — *relearning*

`repetitions` torna a **0** e l'intervallo viene messo a **0**: la variante è dovuta
**oggi** e rientra subito nella lista «Ripeti oggi». Questo è l'adattamento di
*relearning* rispetto a SM-2 puro (che userebbe un intervallo minimo di 1 giorno) —
vedi ADR 0012 per il razionale.

### Aggiornamento del fattore di facilità (sempre)

A **ogni** allenamento, positivo o negativo, l'`easeFactor` viene ricalcolato con la
formula SM-2 standard:

```
EF_nuovo = EF + (0.1 − (5 − q) × (0.08 + (5 − q) × 0.02))
```

con `EF_nuovo` mai inferiore a **1.3** e arrotondato a 2 decimali. La variazione dipende
solo dal voto `q`:

| Voto `q` | Δ EF |
|:--------:|:----:|
| 5 | +0.10 |
| 4 |  0.00 |
| 3 | −0.14 |
| 2 | −0.32 |
| 1 | −0.54 |
| 0 | −0.80 |

Una variante sbagliata di continuo vede il proprio EF scendere fino al pavimento di
1.3, e da lì i suoi intervalli crescono il più lentamente possibile.

---

## Esempi concreti

### Variante sempre eseguita alla perfezione (voto 5)

| Allenamento | EF prima | reps prima | int. prima | regola applicata | int. dopo | reps dopo | EF dopo |
|:-----------:|:--------:|:----------:|:----------:|------------------|:---------:|:---------:|:-------:|
| 1° | 2.5 | 0 | 0 | reps 0 → 1 giorno | **1** | 1 | 2.6 |
| 2° | 2.6 | 1 | 1 | reps 1 → 6 giorni | **6** | 2 | 2.7 |
| 3° | 2.7 | 2 | 6 | round(6 × 2.7) | **16** | 3 | 2.8 |
| 4° | 2.8 | 3 | 16 | round(16 × 2.8) | **45** | 4 | 2.9 |

Gli intervalli si allargano rapidamente: 1 → 6 → 16 → 45 giorni.

### Variante consolidata, poi un allenamento con 4 errori

Partendo da `EF=2.5, intervalDays=15, repetitions=3`, un allenamento completato con 4
errori dà voto 2 (negativo):

- `repetitions` → **0**, intervallo → **0** (dovuta oggi);
- `EF` → `2.5 − 0.32` = **2.18**.

L'intervallo crolla da 15 giorni a "oggi": la variante torna immediatamente in coda di
ripasso. (Verifica live in ADR 0012.)

---

## Passo 3 — come si decide cosa allenare

La vista «Ripeti oggi» chiama `GET /api/reviews/due`. Il servizio (`ReviewService.due()`)
restituisce tutte le schedule la cui `nextReviewDate` è **oggi o nel passato**, ordinate
per data crescente (le più in ritardo prima). Per ciascuna risolve nome/colore della
variante e nome dello studio, per la visualizzazione.

Le schedule **orfane** (variante nel frattempo eliminata) sono **ignorate** in lettura,
coerentemente con sessioni e statistiche, che non vengono cancellate a cascata.

Nel dettaglio di una variante, `GET /api/reviews/variants/{id}` restituisce la sua
schedule (con un flag `due` = "la prossima ripetizione è oggi o nel passato"), oppure
**204 No Content** se la variante non è ancora stata allenata e quindi non ha ancora una
pianificazione.

---

## Dove vive nel flusso applicativo

```
Allenamento concluso (POST /api/training-sessions)
        │
        ▼
TrainingSessionService.create()   ── @Transactional ──┐
   salva la sessione (P17)                             │  stessa transazione
        │                                              │
        ▼                                              │
ReviewService.recordSession(variantId, studyId, completed, mistakesCount)
   1. quality(...)  → voto                             │
   2. carica la schedule, o ne crea una nuova          │
      (EF=2.5, interval=0, reps=0)                      │
   3. next(...)     → nuovi EF / intervallo / reps      │
   4. nextReviewDate = oggi + intervalDays              │
   5. lastReviewedAt = adesso                           │
   6. salva ───────────────────────────────────────────┘
```

L'aggiornamento dello scheduling avviene **a fine allenamento**, dentro la **stessa
transazione** che salva la sessione: non esiste un endpoint per modificare la schedule
"a mano".

### Mappatura sui tipi

- **Entità:** `ReviewSchedule` — una per variante (`variant_id` unique). `studyId`
  denormalizzato dalla variante (per future viste per studio).
- **Logica pura:** `ReviewScheduler` (`quality`, `next`, record `Outcome`), con unit test
  in `ReviewSchedulerTest`.
- **Servizio:** `ReviewService` (`recordSession`, `due`, `forVariant`).
- **API:** `ReviewController` → `GET /api/reviews/due`, `GET /api/reviews/variants/{id}`.

---

## Limiti attuali (per scelta)

- Algoritmo volutamente **semplice**: niente SM-2+/FSRS (sovradimensionati per uso
  personale single-user).
- Nessuna notifica push/email, nessuna sincronizzazione multi-dispositivo.
- `userId` non ancora attivo: la pianificazione è single-user finché non arriva
  Supabase Auth.

Per il razionale completo delle scelte e delle alternative scartate → **ADR 0012** in
[`docs/adr/decisioni-tecniche.md`](adr/decisioni-tecniche.md).
