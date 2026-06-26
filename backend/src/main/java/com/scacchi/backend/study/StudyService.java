package com.scacchi.backend.study;

import com.scacchi.backend.variant.CreateVariantRequest;
import com.scacchi.backend.variant.ValidationError;
import com.scacchi.backend.variant.VariantDto;
import com.scacchi.backend.variant.VariantService;
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

    public StudyService(StudyRepository repository, VariantService variantService) {
        this.repository = repository;
        this.variantService = variantService;
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
            List<VariantDto> variants = variantService.findByStudyId(s.getId());
            return toDto(s, variants.size(), variants);
        });
    }

    public StudyDto create(CreateStudyRequest request) {
        validate(request);
        Study entity = new Study();
        entity.setName(request.name().trim());
        entity.setDescription(normalize(request.description()));
        entity.setColor(parseColor(request.color()));
        return toDto(repository.save(entity), 0, null);
    }

    /**
     * Crea una variante già agganciata allo studio (Prototipo 12). Restituisce
     * {@code empty} se lo studio non esiste (→ 404). La validazione scacchistica
     * del payload resta a carico del controller.
     */
    public Optional<VariantDto> createVariant(Long studyId, CreateVariantRequest request) {
        if (!repository.existsById(studyId)) {
            return Optional.empty();
        }
        return Optional.of(variantService.createInStudy(studyId, request));
    }

    /**
     * Import in blocco (Prototipo 14): crea lo studio e tutte le sue varianti in
     * un'unica transazione. La validazione scacchistica di ogni variante è a carico
     * del controller; se un inserimento fallisce, l'intero import viene annullato.
     */
    @Transactional
    public StudyDto importStudy(ImportStudyRequest request) {
        validate(new CreateStudyRequest(request.name(), request.description(), request.color()));
        Study entity = new Study();
        entity.setName(request.name().trim());
        entity.setDescription(normalize(request.description()));
        entity.setColor(parseColor(request.color()));
        Study saved = repository.save(entity);
        for (CreateVariantRequest variant : request.variants()) {
            variantService.createInStudy(saved.getId(), variant);
        }
        return findById(saved.getId()).orElseThrow();
    }

    public Optional<StudyDto> update(Long id, CreateStudyRequest request) {
        validate(request);
        return repository.findById(id).map(entity -> {
            entity.setName(request.name().trim());
            entity.setDescription(normalize(request.description()));
            entity.setColor(parseColor(request.color()));
            Study saved = repository.save(entity);
            return toDto(saved, (int) variantService.countByStudyId(saved.getId()), null);
        });
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
    }

    private static StudyColor parseColor(String color) {
        if (color == null || color.isBlank()) {
            return null;
        }
        return StudyColor.valueOf(color);
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
            variantCount,
            variants,
            s.getCreatedAt() == null ? null : s.getCreatedAt().toString()
        );
    }
}
