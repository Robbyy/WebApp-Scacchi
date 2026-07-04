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

    /**
     * Fase di gioco dello studio (ISSUE-016): {@code OPENING}, {@code MIDDLEGAME} o
     * {@code ENDGAME}. Scelta alla creazione e immutabile (vedi {@code StudyService}).
     * Tutti gli elementi figli ({@code Variant}) ereditano questa fase dallo studio.
     */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private GamePhase phase;

    /**
     * Provenienza remota (Prototipo 15): per gli studi importati da Lichess
     * {@code sourceProvider="LICHESS"} e {@code sourceStudyId} è l'id Lichess.
     * La coppia (provider, sourceStudyId) identifica univocamente l'origine ed
     * evita duplicati al re-import. {@code null} per studi creati localmente.
     */
    @Column(name = "source_provider", length = 32)
    private String sourceProvider;

    @Column(name = "source_study_id", length = 64)
    private String sourceStudyId;

    @Column(name = "source_url", columnDefinition = "text")
    private String sourceUrl;

    @Column(name = "last_imported_at")
    private Instant lastImportedAt;

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

    public GamePhase getPhase() {
        return phase;
    }

    public void setPhase(GamePhase phase) {
        this.phase = phase;
    }

    public String getSourceProvider() {
        return sourceProvider;
    }

    public void setSourceProvider(String sourceProvider) {
        this.sourceProvider = sourceProvider;
    }

    public String getSourceStudyId() {
        return sourceStudyId;
    }

    public void setSourceStudyId(String sourceStudyId) {
        this.sourceStudyId = sourceStudyId;
    }

    public String getSourceUrl() {
        return sourceUrl;
    }

    public void setSourceUrl(String sourceUrl) {
        this.sourceUrl = sourceUrl;
    }

    public Instant getLastImportedAt() {
        return lastImportedAt;
    }

    public void setLastImportedAt(Instant lastImportedAt) {
        this.lastImportedAt = lastImportedAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
