package com.scacchi.backend.variant;

import java.util.List;
import java.util.Optional;
import com.scacchi.backend.study.GamePhase;
import com.scacchi.backend.study.Study;
import com.scacchi.backend.study.StudyRepository;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

/**
 * Gestione delle varianti su database (Prototipo 4). Il contratto verso il
 * frontend ({@link VariantDto}) resta invariato rispetto al Prototipo 2.
 */
@Service
public class VariantService {

    /** Posizione iniziale standard, usata dalle varianti create nel Prototipo 4. */
    public static final String START_FEN =
        "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

    private final VariantRepository repository;
    private final StudyRepository studyRepository;
    private final VariantValidator validator;

    public VariantService(
        VariantRepository repository, StudyRepository studyRepository, VariantValidator validator) {
        this.repository = repository;
        this.studyRepository = studyRepository;
        this.validator = validator;
    }

    public List<VariantDto> findAll() {
        return repository.findAll(Sort.by(Sort.Direction.ASC, "id")).stream()
            .map(VariantService::toDto)
            .toList();
    }

    public Optional<VariantDto> findById(Long id) {
        return repository.findById(id).map(VariantService::toDto);
    }

    public VariantDto create(CreateVariantRequest request) {
        return create(request, null);
    }

    /** Crea una variante già agganciata a uno studio (Prototipo 12, endpoint nidificato). */
    public VariantDto createInStudy(Long studyId, CreateVariantRequest request) {
        return create(request, studyId);
    }

    private VariantDto create(CreateVariantRequest request, Long studyId) {
        PreparedVariant prepared = prepare(request, phaseFor(studyId));
        Variant entity = new Variant();
        entity.setName(prepared.request().name().trim());
        entity.setColor(prepared.color());
        List<MoveNode> tree = resolveTree(prepared.request());
        entity.setTree(tree);
        entity.setMoves(MoveNode.mainline(tree));
        entity.setStartingFen(prepared.startingFen());
        entity.setSourcePgn(prepared.request().sourcePgn());
        entity.setStudyId(studyId);
        return toDto(repository.save(entity));
    }

    public Optional<VariantDto> update(Long id, CreateVariantRequest request) {
        return repository.findById(id).map(entity -> {
            PreparedVariant prepared = prepare(request, phaseFor(entity.getStudyId()));
            entity.setName(prepared.request().name().trim());
            entity.setColor(prepared.color());
            List<MoveNode> tree = resolveTree(prepared.request());
            entity.setTree(tree);
            entity.setMoves(MoveNode.mainline(tree));
            entity.setSourcePgn(prepared.request().sourcePgn());
            entity.setStartingFen(prepared.startingFen());
            return toDto(repository.save(entity));
        });
    }

    /** Albero dalla richiesta: usa tree se presente, altrimenti lo costruisce dalla linea. */
    private static List<MoveNode> resolveTree(CreateVariantRequest request) {
        if (request.tree() != null && !request.tree().isEmpty()) {
            return request.tree();
        }
        return request.moves() == null ? List.of() : MoveNode.fromLine(request.moves());
    }

    public boolean delete(Long id) {
        if (!repository.existsById(id)) {
            return false;
        }
        repository.deleteById(id);
        return true;
    }

    /** Varianti appartenenti a uno studio (Prototipo 11), ordinate per id. */
    public List<VariantDto> findByStudyId(Long studyId) {
        return repository.findByStudyIdOrderByIdAsc(studyId).stream()
            .map(VariantService::toDto)
            .toList();
    }

    /** Numero di varianti in uno studio (per il conteggio in lista, Prototipo 11). */
    public long countByStudyId(Long studyId) {
        return repository.countByStudyId(studyId);
    }

    /** Cancella in blocco tutte le varianti di uno studio: cascata di {@code StudyService}. */
    public void deleteByStudyId(Long studyId) {
        repository.deleteByStudyId(studyId);
    }

    private static VariantDto toDto(Variant v) {
        // Righe legacy senza albero: lo si deriva dalla linea principale.
        List<MoveNode> tree = v.getTree() != null && !v.getTree().isEmpty()
            ? v.getTree()
            : MoveNode.fromLine(v.getMoves());
        return new VariantDto(
            v.getId(),
            v.getName(),
            v.getColor().name(),
            MoveNode.mainline(tree),
            tree,
            v.getStartingFen(),
            v.getSourcePgn(),
            v.getStudyId(),
            v.getCreatedAt() == null ? null : v.getCreatedAt().toString()
        );
    }

    private GamePhase phaseFor(Long studyId) {
        if (studyId == null) {
            return GamePhase.OPENING;
        }
        return studyRepository.findById(studyId)
            .map(Study::getPhase)
            .orElse(GamePhase.OPENING);
    }

    private PreparedVariant prepare(CreateVariantRequest request, GamePhase phase) {
        boolean nonOpening = phase == GamePhase.MIDDLEGAME || phase == GamePhase.ENDGAME;
        if (!nonOpening) {
            validator.validateOpening(request);
            return new PreparedVariant(request, Color.valueOf(request.color()), START_FEN);
        }

        if (request == null) {
            validator.validate(request, START_FEN, true, false);
        }
        String startingFen = validator.validateAndNormalizeStartingFen(request.startingFen());
        Color color = startingFen.split(" ")[1].equals("w") ? Color.WHITE : Color.BLACK;
        CreateVariantRequest normalized = new CreateVariantRequest(
            request.name(), color.name(), request.moves(), request.tree(), null, startingFen);
        validator.validate(normalized, startingFen, true, false);
        return new PreparedVariant(normalized, color, startingFen);
    }

    private record PreparedVariant(CreateVariantRequest request, Color color, String startingFen) {
    }
}
