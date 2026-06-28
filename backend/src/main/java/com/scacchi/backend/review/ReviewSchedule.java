package com.scacchi.backend.review;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;

/**
 * Pianificazione delle ripetizioni di una variante (Prototipo 19, spaced repetition).
 * C'è al più <b>una</b> schedule per variante: l'esito di ogni allenamento aggiorna i
 * parametri SM-2 ({@code easeFactor}, {@code intervalDays}, {@code repetitions}) e la
 * prossima data di ripetizione. {@code studyId} è denormalizzato dalla variante (come
 * per le sessioni P17), utile per future viste per studio.
 */
@Entity
@Table(name = "review_schedule")
public class ReviewSchedule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "variant_id", nullable = false, unique = true)
    private Long variantId;

    @Column(name = "study_id")
    private Long studyId;

    /** Fattore di facilità SM-2 (parte da 2.5, mai sotto 1.3). */
    @Column(name = "ease_factor", nullable = false)
    private double easeFactor;

    /** Intervallo in giorni fino alla prossima ripetizione (0 = ripeti oggi). */
    @Column(name = "interval_days", nullable = false)
    private int intervalDays;

    /** Numero di ripetizioni consecutive riuscite (azzerato a ogni esito negativo). */
    @Column(nullable = false)
    private int repetitions;

    @Column(name = "next_review_date", nullable = false)
    private LocalDate nextReviewDate;

    @Column(name = "last_reviewed_at")
    private Instant lastReviewedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }

    public Long getId() {
        return id;
    }

    public Long getVariantId() {
        return variantId;
    }

    public void setVariantId(Long variantId) {
        this.variantId = variantId;
    }

    public Long getStudyId() {
        return studyId;
    }

    public void setStudyId(Long studyId) {
        this.studyId = studyId;
    }

    public double getEaseFactor() {
        return easeFactor;
    }

    public void setEaseFactor(double easeFactor) {
        this.easeFactor = easeFactor;
    }

    public int getIntervalDays() {
        return intervalDays;
    }

    public void setIntervalDays(int intervalDays) {
        this.intervalDays = intervalDays;
    }

    public int getRepetitions() {
        return repetitions;
    }

    public void setRepetitions(int repetitions) {
        this.repetitions = repetitions;
    }

    public LocalDate getNextReviewDate() {
        return nextReviewDate;
    }

    public void setNextReviewDate(LocalDate nextReviewDate) {
        this.nextReviewDate = nextReviewDate;
    }

    public Instant getLastReviewedAt() {
        return lastReviewedAt;
    }

    public void setLastReviewedAt(Instant lastReviewedAt) {
        this.lastReviewedAt = lastReviewedAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
