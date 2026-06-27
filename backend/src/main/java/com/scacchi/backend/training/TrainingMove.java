package com.scacchi.backend.training;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * Singola mossa tentata durante un allenamento (Prototipo 17): cosa ci si
 * aspettava, cosa è stato giocato e se era corretta. Appartiene a una
 * {@link TrainingSession} (relazione gestita dal lato sessione).
 */
@Entity
@Table(name = "training_move")
public class TrainingMove {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Semimossa (1-based) nella linea allenata. */
    @Column(nullable = false)
    private int ply;

    @Column(name = "expected_san")
    private String expectedSan;

    @Column(name = "played_san")
    private String playedSan;

    @Column(nullable = false)
    private boolean correct;

    public TrainingMove() {
    }

    public TrainingMove(int ply, String expectedSan, String playedSan, boolean correct) {
        this.ply = ply;
        this.expectedSan = expectedSan;
        this.playedSan = playedSan;
        this.correct = correct;
    }

    public Long getId() {
        return id;
    }

    public int getPly() {
        return ply;
    }

    public String getExpectedSan() {
        return expectedSan;
    }

    public String getPlayedSan() {
        return playedSan;
    }

    public boolean isCorrect() {
        return correct;
    }
}
