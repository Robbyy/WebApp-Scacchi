package com.scacchi.backend.training;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * Sessione di allenamento conclusa (Prototipo 17): quale variante, esito, numero
 * di errori, durata e l'elenco delle mosse tentate. È la base dati per statistiche
 * (P18) e ripetizione (P19). {@code userId} è predisposto ma inattivo (nullable).
 */
@Entity
@Table(name = "training_session")
public class TrainingSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "variant_id", nullable = false)
    private Long variantId;

    /** Studio della variante al momento dell'allenamento (denormalizzato per le stats). */
    @Column(name = "study_id")
    private Long studyId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private TrainingResult result;

    @Column(name = "mistakes_count", nullable = false)
    private int mistakesCount;

    @Column(name = "user_id")
    private Long userId;

    @Column(name = "started_at")
    private Instant startedAt;

    @Column(name = "completed_at")
    private Instant completedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true)
    @JoinColumn(name = "session_id")
    @OrderBy("ply ASC")
    private List<TrainingMove> moves = new ArrayList<>();

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

    public TrainingResult getResult() {
        return result;
    }

    public void setResult(TrainingResult result) {
        this.result = result;
    }

    public int getMistakesCount() {
        return mistakesCount;
    }

    public void setMistakesCount(int mistakesCount) {
        this.mistakesCount = mistakesCount;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public Instant getStartedAt() {
        return startedAt;
    }

    public void setStartedAt(Instant startedAt) {
        this.startedAt = startedAt;
    }

    public Instant getCompletedAt() {
        return completedAt;
    }

    public void setCompletedAt(Instant completedAt) {
        this.completedAt = completedAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public List<TrainingMove> getMoves() {
        return moves;
    }

    public void setMoves(List<TrainingMove> moves) {
        this.moves = moves;
    }
}
