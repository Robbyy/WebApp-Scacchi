package com.scacchi.backend.review;

/**
 * Algoritmo di scheduling delle ripetizioni (Prototipo 19), variante semplificata di
 * <b>SM-2</b> (SuperMemo). Logica pura e senza stato: data la situazione corrente di una
 * variante e un voto di qualità derivato dall'allenamento, calcola i nuovi parametri.
 *
 * <p>Adattamento "relearning": un esito negativo (qualità &lt; 3) azzera le ripetizioni e
 * imposta l'intervallo a <b>0</b> (ripeti oggi), così che la variante torni subito nella
 * lista "da ripetere"; gli esiti positivi seguono gli intervalli SM-2 (1, 6, poi
 * {@code intervallo * easeFactor}).
 */
public final class ReviewScheduler {

    /** Fattore di facilità iniziale per una variante mai pianificata. */
    public static final double INITIAL_EASE = 2.5;

    /** Limite inferiore del fattore di facilità (vincolo SM-2). */
    public static final double MIN_EASE = 1.3;

    private ReviewScheduler() {
    }

    /** Nuovi parametri di scheduling dopo un allenamento. */
    public record Outcome(double easeFactor, int intervalDays, int repetitions) {
    }

    /**
     * Traduce l'esito di un allenamento in un voto di qualità SM-2 (0..5):
     * sessione interrotta → 1; completata → {@code 5 - errori}, con un minimo di 2.
     * La soglia di "promozione" è qualità ≥ 3 (quindi da 3 errori in su l'esito è negativo).
     */
    public static int quality(boolean completed, int mistakesCount) {
        if (!completed) {
            return 1;
        }
        return Math.max(2, 5 - Math.max(0, mistakesCount));
    }

    /**
     * Applica un passo SM-2 semplificato.
     *
     * @param easeFactor  fattore di facilità corrente
     * @param intervalDays intervallo corrente (giorni)
     * @param repetitions  ripetizioni consecutive riuscite finora
     * @param quality      voto 0..5 (vedi {@link #quality(boolean, int)})
     */
    public static Outcome next(double easeFactor, int intervalDays, int repetitions, int quality) {
        int reps = repetitions;
        int interval;
        if (quality >= 3) {
            if (reps == 0) {
                interval = 1;
            } else if (reps == 1) {
                interval = 6;
            } else {
                interval = (int) Math.round(intervalDays * easeFactor);
            }
            reps += 1;
        } else {
            // Esito negativo: riparti da capo e riproponi oggi (relearning).
            reps = 0;
            interval = 0;
        }

        double ef = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
        if (ef < MIN_EASE) {
            ef = MIN_EASE;
        }
        return new Outcome(round2(ef), Math.max(0, interval), reps);
    }

    private static double round2(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}
