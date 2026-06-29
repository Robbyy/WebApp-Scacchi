package com.scacchi.backend.review;

import static org.assertj.core.api.Assertions.assertThat;

import com.scacchi.backend.review.ReviewScheduler.Outcome;
import org.junit.jupiter.api.Test;

class ReviewSchedulerTest {

    @Test
    void qualityMapsResultAndMistakes() {
        assertThat(ReviewScheduler.quality(true, 0)).isEqualTo(5);
        assertThat(ReviewScheduler.quality(true, 1)).isEqualTo(4);
        assertThat(ReviewScheduler.quality(true, 2)).isEqualTo(3);
        // Da 3 errori in su l'esito è "negativo" (qualità < 3).
        assertThat(ReviewScheduler.quality(true, 3)).isEqualTo(2);
        assertThat(ReviewScheduler.quality(true, 9)).isEqualTo(2);
        // Sessione interrotta = esito negativo.
        assertThat(ReviewScheduler.quality(false, 0)).isEqualTo(1);
    }

    @Test
    void firstSuccessSchedulesOneDay() {
        Outcome o = ReviewScheduler.next(ReviewScheduler.INITIAL_EASE, 0, 0, 5);
        assertThat(o.intervalDays()).isEqualTo(1);
        assertThat(o.repetitions()).isEqualTo(1);
        // Una risposta perfetta alza il fattore di facilità.
        assertThat(o.easeFactor()).isGreaterThan(ReviewScheduler.INITIAL_EASE);
    }

    @Test
    void secondSuccessSchedulesSixDays() {
        Outcome o = ReviewScheduler.next(2.6, 1, 1, 5);
        assertThat(o.intervalDays()).isEqualTo(6);
        assertThat(o.repetitions()).isEqualTo(2);
    }

    @Test
    void laterSuccessIsCappedAtMaximumInterval() {
        // reps >= 2: round(6 * 2.5) supererebbe il massimo praticabile.
        Outcome o = ReviewScheduler.next(2.5, 6, 2, 5);
        assertThat(o.intervalDays()).isEqualTo(ReviewScheduler.MAX_INTERVAL_DAYS);
        assertThat(o.repetitions()).isEqualTo(3);
    }

    @Test
    void hundredPerfectReviewsStayWithinMaximumInterval() {
        double ease = ReviewScheduler.INITIAL_EASE;
        int interval = 0;
        int repetitions = 0;
        Outcome outcome = null;

        for (int i = 0; i < 100; i++) {
            outcome = ReviewScheduler.next(ease, interval, repetitions, 5);
            assertThat(outcome.intervalDays()).isLessThanOrEqualTo(ReviewScheduler.MAX_INTERVAL_DAYS);
            ease = outcome.easeFactor();
            interval = outcome.intervalDays();
            repetitions = outcome.repetitions();
        }

        assertThat(outcome).isNotNull();
        assertThat(outcome.intervalDays()).isEqualTo(ReviewScheduler.MAX_INTERVAL_DAYS);
        assertThat(outcome.repetitions()).isEqualTo(100);
    }

    @Test
    void failureResetsAndSchedulesToday() {
        // Variante ben consolidata, poi un esito con molti errori: l'intervallo crolla a 0.
        Outcome o = ReviewScheduler.next(2.5, 15, 3, ReviewScheduler.quality(true, 4));
        assertThat(o.intervalDays()).isEqualTo(0);
        assertThat(o.repetitions()).isZero();
        // L'esito negativo abbassa anche il fattore di facilità.
        assertThat(o.easeFactor()).isLessThan(2.5);
    }

    @Test
    void easeFactorNeverDropsBelowFloor() {
        double ease = ReviewScheduler.INITIAL_EASE;
        for (int i = 0; i < 20; i++) {
            ease = ReviewScheduler.next(ease, 0, 0, 0).easeFactor();
        }
        assertThat(ease).isEqualTo(ReviewScheduler.MIN_EASE);
    }
}
