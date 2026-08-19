package com.scacchi.backend.study;

import com.scacchi.backend.attempt.PositionAttemptService;
import com.scacchi.backend.attempt.PositionAttemptsSummaryDto;
import com.scacchi.backend.variant.CreateVariantRequest;
import com.scacchi.backend.variant.ValidationError;
import com.scacchi.backend.variant.VariantDto;
import com.scacchi.backend.variant.VariantOrderRequest;
import com.scacchi.backend.variant.VariantService;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Gestione degli studi (Prototipo 11). Uno studio raggruppa più varianti tramite
 * la colonna {@code study_id} sulla variante. La cancellazione è <b>a cascata</b>:
 * eliminando uno studio si eliminano anche le sue varianti (R14), che non vengono
 * mai riassegnate.
 */
@Service
public class StudyService {

    private final StudyRepository repository;
    private final VariantService variantService;
    private final PositionAttemptService attemptService;

    public StudyService(
        StudyRepository repository, VariantService variantService, PositionAttemptService attemptService) {
        this.repository = repository;
        this.variantService = variantService;
        this.attemptService = attemptService;
    }

    /** Lista studi con solo il conteggio varianti (senza l'elenco completo). */
    public List<StudyDto> findAll() {
        return repository.findAll(Sort.by(Sort.Direction.ASC, "id")).stream()
            .map(s -> toDto(s, (int) variantService.countByStudyId(s.getId()), null))
            .toList();
    }

    /** Dettaglio di uno studio con l'elenco completo delle sue varianti. */
    public Optional<StudyDto> findById(Long id) {
        return repository.findById(id).map(s -> {
            List<VariantDto> variants = variantService.findByStudy(s);
            return toDto(s, variants.size(), variants);
        });
    }

    public StudyDto create(CreateStudyRequest request) {
        validate(request);
        GamePhase phase = parsePhase(request.phase());
        StudyType studyType = parseAndRequireStudyTypeForCreate(phase, request.studyType());
        Study entity = new Study();
        entity.setName(request.name().trim());
        entity.setDescription(normalize(request.description()));
        entity.setColor(parseColor(request.color()));
        entity.setPhase(phase);
        entity.setStudyType(studyType);
        return toDto(repository.save(entity), 0, null);
    }

    /** Studi di una fase (ISSUE-016), con solo il conteggio varianti (come {@link #findAll()}). */
    public List<StudyDto> findAllByPhase(GamePhase phase) {
        return repository.findByPhaseOrderByIdAsc(phase).stream()
            .map(s -> toDto(s, (int) variantService.countByStudyId(s.getId()), null))
            .toList();
    }

    /**
     * Crea una variante già agganciata allo studio (Prototipo 12). Restituisce
     * {@code empty} se lo studio non esiste (→ 404). La validazione scacchistica
     * del payload resta a carico del controller.
     */
    public Optional<VariantDto> createVariant(Long studyId, CreateVariantRequest request) {
        Study study = repository.findById(studyId).orElse(null);
        if (study == null) {
            return Optional.empty();
        }
        ensureClassifiedForNewPosition(study);
        return Optional.of(variantService.createInStudy(studyId, request));
    }

    /**
     * Riordino atomico delle posizioni di uno studio Mediogioco (R26.3, task 3.5).
     * {@code empty} se lo studio non esiste (→ 404); la validazione di fase/payload è
     * a carico di {@code VariantService.reorder}.
     */
    public Optional<List<VariantDto>> reorderVariants(Long studyId, VariantOrderRequest request) {
        return variantService.reorder(studyId, request == null ? null : request.variantIds());
    }

    /**
     * Riepilogo dei tentativi per posizione di uno studio (R26.3, task 4.5), incluse
     * le posizioni mai tentate. {@code empty} se lo studio non esiste (→ 404).
     */
    public Optional<List<PositionAttemptsSummaryDto>> getAttemptsSummary(Long studyId) {
        return attemptService.getStudySummary(studyId);
    }

    /**
     * Un Mediogioco «Da classificare» conserva CRUD e cancellazione dello studio,
     * ma non ammette nuove posizioni finché non riceve una tipologia (R26.3, task 2.3).
     */
    private static void ensureClassifiedForNewPosition(Study study) {
        if (study.getPhase() == GamePhase.MIDDLEGAME && study.getStudyType() == null) {
            throw new InvalidStudyException(new ValidationError("studyType", null, null,
                "Classifica lo studio Mediogioco (tattico o strategico) prima di creare posizioni."));
        }
    }

    /**
     * Import in blocco (Prototipo 14): crea lo studio e tutte le sue varianti in
     * un'unica transazione. La validazione scacchistica di ogni variante è a carico
     * del controller; se un inserimento fallisce, l'intero import viene annullato.
     */
    @Transactional
    public StudyDto importStudy(ImportStudyRequest request) {
        validate(new CreateStudyRequest(request.name(), request.description(), request.color(), null));
        Study entity = new Study();
        entity.setName(request.name().trim());
        entity.setDescription(normalize(request.description()));
        entity.setColor(parseColor(request.color()));
        // Import PGN in blocco (Prototipo 14): sempre Aperture (ISSUE-016).
        entity.setPhase(GamePhase.OPENING);
        Study saved = repository.save(entity);
        for (CreateVariantRequest variant : request.variants()) {
            variantService.createInStudy(saved.getId(), variant);
        }
        return findById(saved.getId()).orElseThrow();
    }

    /**
     * Import/sync di uno studio remoto con comportamento <b>upsert</b> (Prototipo 15).
     * Se esiste già uno studio locale con lo stesso riferimento remoto
     * ({@code sourceProvider + sourceStudyId}) lo <b>aggiorna</b> sostituendo le
     * varianti e preservando i metadati locali ({@code name/description/color});
     * altrimenti ne crea uno nuovo. Transazionale: niente sostituzioni parziali.
     *
     * @return l'esito con il flag {@code created} (true = nuovo studio, false = aggiornato)
     */
    @Transactional
    public ImportResult importLichess(ImportStudyRequest request) {
        Optional<Study> existing = (request.sourceProvider() != null && request.sourceStudyId() != null)
            ? repository.findBySourceProviderAndSourceStudyId(
                request.sourceProvider(), request.sourceStudyId())
            : Optional.empty();

        boolean created = existing.isEmpty();
        Study study;
        if (existing.isPresent()) {
            // Upsert: sostituisce le varianti, conserva i metadati locali dello studio.
            study = existing.get();
            variantService.deleteByStudyId(study.getId());
            study.setSourceUrl(request.sourceUrl());
            study.setLastImportedAt(Instant.now());
        } else {
            validate(new CreateStudyRequest(request.name(), request.description(), request.color(), null));
            study = new Study();
            study.setName(request.name().trim());
            study.setDescription(normalize(request.description()));
            study.setColor(parseColor(request.color()));
            study.setSourceProvider(request.sourceProvider());
            study.setSourceStudyId(request.sourceStudyId());
            study.setSourceUrl(request.sourceUrl());
            study.setLastImportedAt(Instant.now());
            // Import/sync Lichess (Prototipo 15): sempre Aperture (ISSUE-016).
            study.setPhase(GamePhase.OPENING);
        }
        Study saved = repository.save(study);
        for (CreateVariantRequest variant : request.variants()) {
            variantService.createInStudy(saved.getId(), variant);
        }
        return new ImportResult(findById(saved.getId()).orElseThrow(), created);
    }

    /** Esito di un import upsert: lo studio risultante e se è stato creato o aggiornato. */
    public record ImportResult(StudyDto study, boolean created) {
    }

    public Optional<StudyDto> update(Long id, CreateStudyRequest request) {
        validate(request);
        return repository.findById(id).map(entity -> {
            ensurePhaseUnchanged(entity, request.phase());
            applyStudyTypeTransition(entity, request.studyType());
            entity.setName(request.name().trim());
            entity.setDescription(normalize(request.description()));
            entity.setColor(parseColor(request.color()));
            Study saved = repository.save(entity);
            return toDto(saved, (int) variantService.countByStudyId(saved.getId()), null);
        });
    }

    /**
     * La fase è scelta alla creazione e non modificabile (ISSUE-016): se la richiesta
     * di update ne indica una diversa da quella persistita, l'update viene rifiutato
     * senza toccare nulla.
     */
    private static void ensurePhaseUnchanged(Study entity, String requestedPhase) {
        if (requestedPhase == null || requestedPhase.isBlank()) {
            return;
        }
        if (GamePhase.valueOf(requestedPhase) != entity.getPhase()) {
            throw new InvalidStudyException(new ValidationError(
                "phase", null, null, "La fase dello studio non può essere modificata dopo la creazione."));
        }
    }

    /**
     * Tipologia richiesta in creazione (R26.3): obbligatoria per un nuovo Mediogioco,
     * rifiutata per le altre fasi. {@code validate(CreateStudyRequest)} ha già verificato
     * che, se presente, {@code request.studyType()} sia un valore enum riconosciuto.
     */
    private static StudyType parseAndRequireStudyTypeForCreate(GamePhase phase, String requestedType) {
        boolean present = requestedType != null && !requestedType.isBlank();
        if (phase != GamePhase.MIDDLEGAME) {
            if (present) {
                throw new InvalidStudyException(new ValidationError("studyType", null, null,
                    "La tipologia è ammessa solo per gli studi Mediogioco."));
            }
            return null;
        }
        if (!present) {
            throw new InvalidStudyException(new ValidationError("studyType", null, null,
                "La tipologia (tattica o strategica) è obbligatoria per un nuovo studio Mediogioco."));
        }
        return StudyType.valueOf(requestedType);
    }

    /**
     * Applica in aggiornamento l'unica transizione ammessa per un Mediogioco legacy
     * «Da classificare» (R26.3): {@code NULL → valore}, una sola volta. Un valore già
     * persistito è immutabile (guard simmetrica a {@link #ensurePhaseUnchanged}); un
     * tipo su una fase diversa da {@code MIDDLEGAME} è rifiutato. Nessuna richiesta di
     * tipologia lascia lo stato invariato, per restare compatibile con i chiamanti
     * (es. Aperture) che non inviano mai il campo.
     */
    private static void applyStudyTypeTransition(Study entity, String requestedType) {
        if (requestedType == null || requestedType.isBlank()) {
            return;
        }
        if (entity.getPhase() != GamePhase.MIDDLEGAME) {
            throw new InvalidStudyException(new ValidationError("studyType", null, null,
                "La tipologia è ammessa solo per gli studi Mediogioco."));
        }
        StudyType requested = StudyType.valueOf(requestedType);
        if (entity.getStudyType() != null) {
            if (entity.getStudyType() != requested) {
                throw new InvalidStudyException(new ValidationError("studyType", null, null,
                    "La tipologia dello studio Mediogioco non può essere modificata dopo la classificazione."));
            }
            return;
        }
        entity.setStudyType(requested);
    }

    /** Cancellazione a cascata: prima le varianti dello studio, poi lo studio stesso. */
    @Transactional
    public boolean delete(Long id) {
        if (!repository.existsById(id)) {
            return false;
        }
        variantService.deleteByStudyId(id);
        repository.deleteById(id);
        return true;
    }

    private static void validate(CreateStudyRequest request) {
        if (request == null || request.name() == null || request.name().isBlank()) {
            throw new InvalidStudyException(
                new ValidationError("name", null, null, "Il nome dello studio è obbligatorio."));
        }
        // Il colore è opzionale, ma se presente deve essere valido.
        String color = request.color();
        if (color != null && !color.isBlank()) {
            try {
                StudyColor.valueOf(color);
            } catch (IllegalArgumentException e) {
                throw new InvalidStudyException(new ValidationError(
                    "color", null, null, "Colore non valido: \"" + color + "\"."));
            }
        }
        // La fase è opzionale (default OPENING in creazione), ma se presente deve essere valida.
        String phase = request.phase();
        if (phase != null && !phase.isBlank()) {
            try {
                GamePhase.valueOf(phase);
            } catch (IllegalArgumentException e) {
                throw new InvalidStudyException(new ValidationError(
                    "phase", null, null, "Fase non valida: \"" + phase + "\"."));
            }
        }
        // La tipologia (R26.3) è contestuale alla fase (vedi create/update), ma se presente
        // deve comunque essere un valore enum riconosciuto.
        String studyType = request.studyType();
        if (studyType != null && !studyType.isBlank()) {
            try {
                StudyType.valueOf(studyType);
            } catch (IllegalArgumentException e) {
                throw new InvalidStudyException(new ValidationError(
                    "studyType", null, null, "Tipologia non valida: \"" + studyType + "\"."));
            }
        }
    }

    private static StudyColor parseColor(String color) {
        if (color == null || color.isBlank()) {
            return null;
        }
        return StudyColor.valueOf(color);
    }

    /** Fase richiesta in creazione, con default {@code OPENING} se assente (ISSUE-016). */
    private static GamePhase parsePhase(String phase) {
        if (phase == null || phase.isBlank()) {
            return GamePhase.OPENING;
        }
        return GamePhase.valueOf(phase);
    }

    private static String normalize(String text) {
        if (text == null) {
            return null;
        }
        String trimmed = text.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private static StudyDto toDto(Study s, int variantCount, List<VariantDto> variants) {
        return new StudyDto(
            s.getId(),
            s.getName(),
            s.getDescription(),
            s.getColor() == null ? null : s.getColor().name(),
            s.getPhase() == null ? null : s.getPhase().name(),
            s.getStudyType() == null ? null : s.getStudyType().name(),
            variantCount,
            variants,
            s.getSourceProvider(),
            s.getSourceStudyId(),
            s.getSourceUrl(),
            s.getLastImportedAt() == null ? null : s.getLastImportedAt().toString(),
            s.getCreatedAt() == null ? null : s.getCreatedAt().toString()
        );
    }
}
