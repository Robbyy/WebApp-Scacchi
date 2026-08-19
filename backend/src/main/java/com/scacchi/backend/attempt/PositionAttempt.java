package com.scacchi.backend.attempt;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;

/**
 * Evento minimo e immutabile di un tentativo su una posizione Mediogioco
 * (ISSUE-016/R26.3, design.md decisione 6). Nessuna mossa, durata, sessione,
 * FEN o versione della soluzione persistita: solo posizione, esito e istante
 * assegnato dal server. Nessun endpoint modifica o elimina il singolo evento;
 * la FK verso {@code variant} ha {@code ON DELETE CASCADE} (changeset
 * {@code 0007-position-attempt}).
 */
@Entity
@Table(name = "position_attempt")
public class PositionAttempt {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "variant_id", nullable = false)
    private Long variantId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 24)
    private AttemptOutcome outcome;

    @Column(name = "occurred_at", nullable = false, updatable = false)
    private Instant occurredAt;

    @PrePersist
    void onCreate() {
        if (occurredAt == null) {
            occurredAt = Instant.now();
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

    public AttemptOutcome getOutcome() {
        return outcome;
    }

    public void setOutcome(AttemptOutcome outcome) {
        this.outcome = outcome;
    }

    public Instant getOccurredAt() {
        return occurredAt;
    }
}
