package com.scacchi.backend.variant;

import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/** Variante di apertura persistita su database (Prototipo 4). */
@Entity
@Table(name = "variant")
public class Variant {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 8)
    private Color color;

    @Convert(converter = MovesConverter.class)
    @Column(name = "moves", nullable = false, columnDefinition = "text")
    private List<String> moves = new ArrayList<>();

    @Convert(converter = TreeConverter.class)
    @Column(name = "tree", columnDefinition = "text")
    private List<MoveNode> tree = new ArrayList<>();

    @Column(name = "starting_fen", nullable = false)
    private String startingFen;

    @Column(name = "source_pgn", columnDefinition = "text")
    private String sourcePgn;

    /**
     * Studio di appartenenza (Prototipo 11). FK verso {@code study}, nullable per
     * le varianti legacy create fuori da uno studio.
     */
    @Column(name = "study_id")
    private Long studyId;

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

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public Color getColor() {
        return color;
    }

    public void setColor(Color color) {
        this.color = color;
    }

    public List<String> getMoves() {
        return moves;
    }

    public void setMoves(List<String> moves) {
        this.moves = moves;
    }

    public List<MoveNode> getTree() {
        return tree;
    }

    public void setTree(List<MoveNode> tree) {
        this.tree = tree;
    }

    public String getStartingFen() {
        return startingFen;
    }

    public void setStartingFen(String startingFen) {
        this.startingFen = startingFen;
    }

    public String getSourcePgn() {
        return sourcePgn;
    }

    public void setSourcePgn(String sourcePgn) {
        this.sourcePgn = sourcePgn;
    }

    public Long getStudyId() {
        return studyId;
    }

    public void setStudyId(Long studyId) {
        this.studyId = studyId;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
