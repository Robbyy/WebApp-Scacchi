package com.scacchi.backend.study;

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
 * Studio che raggruppa più varianti, sul modello degli <i>studies</i> di Lichess
 * (Prototipo 11). La relazione con {@code Variant} è 1-N tramite la colonna
 * {@code study_id} (nullable) sulla variante; la cancellazione è a cascata,
 * gestita esplicitamente in {@code StudyService}.
 */
@Entity
@Table(name = "study")
public class Study {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(name = "description", columnDefinition = "text")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(length = 8)
    private StudyColor color;

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

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public StudyColor getColor() {
        return color;
    }

    public void setColor(StudyColor color) {
        this.color = color;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
