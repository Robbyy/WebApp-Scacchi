package com.scacchi.backend.variant;

import com.scacchi.backend.study.GamePhase;
import com.scacchi.backend.study.Study;
import com.scacchi.backend.study.StudyRepository;
import com.scacchi.backend.theme.InvalidThemeException;
import com.scacchi.backend.theme.PositionThemeDto;
import com.scacchi.backend.theme.PositionThemeService;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
    private final PositionThemeService themeService;

    public VariantService(
        VariantRepository repository, StudyRepository studyRepository, VariantValidator validator,
        PositionThemeService themeService) {
        this.repository = repository;
        this.studyRepository = studyRepository;
        this.validator = validator;
        this.themeService = themeService;
    }

    public List<VariantDto> findAll() {
        return repository.findAll(Sort.by(Sort.Direction.ASC, "id")).stream()
            .map(this::toDto)
            .toList();
    }

    public Optional<VariantDto> findById(Long id) {
        return repository.findById(id).map(this::toDto);
    }

    @Transactional
    public VariantDto create(CreateVariantRequest request) {
        return create(request, null);
    }

    /** Crea una variante già agganciata a uno studio (Prototipo 12, endpoint nidificato). */
    @Transactional
    public VariantDto createInStudy(Long studyId, CreateVariantRequest request) {
        return create(request, studyId);
    }

    private VariantDto create(CreateVariantRequest request, Long studyId) {
        Study study = studyFor(studyId);
        GamePhase phase = phaseOf(study);
        PreparedVariant prepared = prepare(request, phase, study);

        Variant entity = new Variant();
        entity.setName(prepared.request().name().trim());
        entity.setColor(prepared.color());
        List<MoveNode> tree = resolveTree(prepared.request());
        entity.setTree(tree);
        entity.setMoves(MoveNode.mainline(tree));
        entity.setStartingFen(prepared.startingFen());
        entity.setSourcePgn(prepared.request().sourcePgn());
        entity.setStudyId(studyId);

        if (phase == GamePhase.MIDDLEGAME) {
            requireThemeForNewPosition(prepared.themeId());
            entity.setThemeId(prepared.themeId());
            entity.setThemeDescription(prepared.themeDescription());
            entity.setDescription(prepared.description());
            entity.setDifficulty(prepared.difficulty());
            entity.setSource(prepared.source());
            int targetOrder = resolvePositionOrderForInsert(studyId, prepared.requestedPositionOrder());
            shiftOrders(studyId, targetOrder, 1);
            entity.setPositionOrder(targetOrder);
        }

        return toDto(repository.save(entity));
    }

    @Transactional
    public Optional<VariantDto> update(Long id, CreateVariantRequest request) {
        return repository.findById(id).map(entity -> {
            Study study = studyFor(entity.getStudyId());
            GamePhase phase = phaseOf(study);
            PreparedVariant prepared = prepare(request, phase, study);
            entity.setName(prepared.request().name().trim());
            entity.setColor(prepared.color());
            List<MoveNode> tree = resolveTree(prepared.request());
            entity.setTree(tree);
            entity.setMoves(MoveNode.mainline(tree));
            entity.setSourcePgn(prepared.request().sourcePgn());
            entity.setStartingFen(prepared.startingFen());
            if (phase == GamePhase.MIDDLEGAME) {
                entity.setThemeId(prepared.themeId());
                entity.setThemeDescription(prepared.themeDescription());
                entity.setDescription(prepared.description());
                entity.setDifficulty(prepared.difficulty());
                entity.setSource(prepared.source());
                // positionOrder invariato: il riordino passa solo dal contratto dedicato (task 3.5).
            }
            return toDto(repository.save(entity));
        });
    }

    /**
     * Aggiorna nome, colore (solo Aperture) e albero lasciando invariati la FEN
     * iniziale e i metadati Mediogioco. È il contratto dell'editor delle mosse,
     * che non possiede quei campi: con il full-replace di {@link #update} ogni
     * salvataggio delle mosse azzerava tema, descrizioni, difficoltà e fonte,
     * facendo uscire la posizione dallo studio guidato.
     *
     * <p>L'albero è validato dalla FEN già persistita, non da una inviata dal
     * client: qui la posizione iniziale non è modificabile.
     */
    @Transactional
    public Optional<VariantDto> updateTree(Long id, UpdateVariantTreeRequest request) {
        if (request == null) {
            throw new InvalidVariantException(new ValidationError(
                "request", null, null, "Richiesta mancante."));
        }
        return repository.findById(id).map(entity -> {
            boolean opening = phaseOf(studyFor(entity.getStudyId())) == GamePhase.OPENING;
            // Il validatore lavora sul contratto di creazione: gli si passa solo ciò
            // che questo endpoint possiede, con la FEN persistita come radice.
            CreateVariantRequest asCreate = new CreateVariantRequest(
                request.name(), request.color(), request.moves(), request.tree(), null, null);
            validator.validate(asCreate, entity.getStartingFen(), !opening, opening);

            entity.setName(request.name().trim());
            if (opening) {
                entity.setColor(Color.valueOf(request.color()));
            }
            List<MoveNode> tree = resolveTree(asCreate);
            entity.setTree(tree);
            entity.setMoves(MoveNode.mainline(tree));
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

    @Transactional
    public boolean delete(Long id) {
        Variant entity = repository.findById(id).orElse(null);
        if (entity == null) {
            return false;
        }
        Long studyId = entity.getStudyId();
        Integer order = entity.getPositionOrder();
        repository.deleteById(id);
        if (order != null && studyId != null) {
            // positionOrder è valorizzato solo per le posizioni Mediogioco (task 1.5/3.2):
            // nessun controllo di fase esplicito necessario per sapere se compattare.
            shiftOrders(studyId, order + 1, -1);
        }
        return true;
    }

    /** Varianti appartenenti a uno studio (Prototipo 11): per ordine esplicito in Mediogioco, per id altrove. */
    public List<VariantDto> findByStudyId(Long studyId) {
        Study study = studyFor(studyId);
        List<Variant> variants = (study != null && study.getPhase() == GamePhase.MIDDLEGAME)
            ? repository.findByStudyIdOrderByPositionOrderAsc(studyId)
            : repository.findByStudyIdOrderByIdAsc(studyId);
        return variants.stream().map(this::toDto).toList();
    }

    /** Numero di varianti in uno studio (per il conteggio in lista, Prototipo 11). */
    public long countByStudyId(Long studyId) {
        return repository.countByStudyId(studyId);
    }

    /**
     * Cancella in blocco tutte le varianti di uno studio: cascata di {@code StudyService}.
     * Il flush esplicito esegue subito i {@code DELETE} sulle righe {@code variant} (Spring
     * Data JPA rimuove le entità trovate una a una, senza garanzia di flush immediato), così
     * la cascade reale {@code ON DELETE CASCADE} verso {@code position_attempt} (R26.3,
     * design.md decisione 6) scatta nella stessa transazione, prima che {@code StudyService}
     * cancelli lo studio padre.
     */
    public void deleteByStudyId(Long studyId) {
        repository.deleteByStudyId(studyId);
        repository.flush();
    }

    /**
     * Riordino atomico delle posizioni di uno studio Mediogioco (task 3.5, design.md
     * decisione 5): {@code empty} se lo studio non esiste (→ 404 lato controller).
     * Rifiuta l'intera richiesta, senza scrivere nulla, se lo studio non è Mediogioco o
     * se il payload non è la permutazione completa e senza duplicati degli ID dello studio.
     */
    @Transactional
    public Optional<List<VariantDto>> reorder(Long studyId, List<Long> orderedIds) {
        Study study = studyRepository.findById(studyId).orElse(null);
        if (study == null) {
            return Optional.empty();
        }
        if (study.getPhase() != GamePhase.MIDDLEGAME) {
            throw new InvalidVariantException(new ValidationError(
                "studyId", null, null, "Il riordino è disponibile solo per gli studi Mediogioco."));
        }
        List<Variant> existing = repository.findByStudyIdOrderByPositionOrderAsc(studyId);
        validateReorderPayload(existing, orderedIds);

        Map<Long, Variant> byId = existing.stream().collect(Collectors.toMap(Variant::getId, v -> v));
        // fase 1: valori negativi temporanei per evitare collisioni sul vincolo unique
        // (study_id, position_order) durante lo spostamento (design.md decisione 5).
        existing.forEach(v -> v.setPositionOrder(-v.getPositionOrder()));
        repository.saveAll(existing);
        repository.flush();
        // fase 2: ordine definitivo secondo la permutazione richiesta, nella stessa transazione.
        for (int i = 0; i < orderedIds.size(); i++) {
            byId.get(orderedIds.get(i)).setPositionOrder(i + 1);
        }
        repository.saveAll(existing);

        return Optional.of(repository.findByStudyIdOrderByPositionOrderAsc(studyId).stream()
            .map(this::toDto)
            .toList());
    }

    private static void validateReorderPayload(List<Variant> existing, List<Long> orderedIds) {
        if (orderedIds == null) {
            throw new InvalidVariantException(new ValidationError(
                "variantIds", null, null, "L'elenco delle posizioni è obbligatorio."));
        }
        Set<Long> existingIds = existing.stream().map(Variant::getId).collect(Collectors.toSet());
        Set<Long> seen = new HashSet<>();
        for (Long id : orderedIds) {
            if (id == null || !existingIds.contains(id) || !seen.add(id)) {
                throw new InvalidVariantException(new ValidationError(
                    "variantIds", null, null,
                    "L'elenco deve contenere, senza duplicati, esattamente gli ID delle posizioni dello studio."));
            }
        }
        if (seen.size() != existingIds.size()) {
            throw new InvalidVariantException(new ValidationError(
                "variantIds", null, null,
                "L'elenco deve contenere, senza duplicati, esattamente gli ID delle posizioni dello studio."));
        }
    }

    /**
     * Sposta di {@code delta} l'ordine delle posizioni Mediogioco di uno studio a partire
     * da {@code fromOrderInclusive} (incluso), in due fasi con valori negativi temporanei
     * per evitare collisioni sul vincolo unique {@code (study_id, position_order)}
     * (design.md decisione 5). Usata da inserimento (delta +1) ed eliminazione (delta -1).
     */
    private void shiftOrders(Long studyId, int fromOrderInclusive, int delta) {
        List<Variant> toShift = repository.findByStudyIdAndPositionOrderGreaterThanEqual(
            studyId, fromOrderInclusive);
        if (toShift.isEmpty()) {
            return;
        }
        Map<Long, Integer> targets = toShift.stream()
            .collect(Collectors.toMap(Variant::getId, v -> v.getPositionOrder() + delta));
        toShift.forEach(v -> v.setPositionOrder(-v.getPositionOrder()));
        repository.saveAll(toShift);
        repository.flush();
        toShift.forEach(v -> v.setPositionOrder(targets.get(v.getId())));
        repository.saveAll(toShift);
    }

    /** Indice di inserimento richiesto (1..N+1), o fine lista (N+1) se assente (task 3.4). */
    private int resolvePositionOrderForInsert(Long studyId, Integer requested) {
        int max = (int) repository.countByStudyId(studyId) + 1;
        if (requested == null) {
            return max;
        }
        if (requested < 1 || requested > max) {
            throw new InvalidVariantException(new ValidationError(
                "positionOrder", null, null, "L'ordine deve essere compreso tra 1 e " + max + "."));
        }
        return requested;
    }

    private static void requireThemeForNewPosition(Long themeId) {
        if (themeId == null) {
            throw new InvalidVariantException(new ValidationError(
                "themeId", null, null, "Il tema è obbligatorio per una nuova posizione di Mediogioco."));
        }
    }

    private Study studyFor(Long studyId) {
        return studyId == null ? null : studyRepository.findById(studyId).orElse(null);
    }

    /** Fase dello studio padre; le varianti legacy senza studio restano Aperture. */
    private static GamePhase phaseOf(Study study) {
        return study != null ? study.getPhase() : GamePhase.OPENING;
    }

    private VariantDto toDto(Variant v) {
        // Righe legacy senza albero: lo si deriva dalla linea principale.
        List<MoveNode> tree = v.getTree() != null && !v.getTree().isEmpty()
            ? v.getTree()
            : MoveNode.fromLine(v.getMoves());
        PositionThemeDto theme = v.getThemeId() == null
            ? null
            : themeService.findById(v.getThemeId()).orElse(null);
        boolean eligible = v.getThemeId() != null && v.getMoves() != null && !v.getMoves().isEmpty();
        return new VariantDto(
            v.getId(),
            v.getName(),
            v.getColor().name(),
            MoveNode.mainline(tree),
            tree,
            v.getStartingFen(),
            v.getSourcePgn(),
            v.getStudyId(),
            v.getThemeId(),
            theme,
            v.getThemeDescription(),
            v.getDescription(),
            v.getDifficulty() == null ? null : v.getDifficulty().name(),
            v.getSource(),
            v.getPositionOrder(),
            eligible,
            v.getCreatedAt() == null ? null : v.getCreatedAt().toString()
        );
    }

    private PreparedVariant prepare(CreateVariantRequest request, GamePhase phase, Study study) {
        boolean nonOpening = phase == GamePhase.MIDDLEGAME || phase == GamePhase.ENDGAME;
        if (!nonOpening) {
            validator.validateOpening(request);
            return new PreparedVariant(
                request, Color.valueOf(request.color()), START_FEN,
                null, null, null, null, null, null);
        }

        if (request == null) {
            throw new InvalidVariantException(new ValidationError(
                "request", null, null, "Richiesta mancante."));
        }
        String startingFen = validator.validateAndNormalizeStartingFen(request.startingFen());
        Color color = startingFen.split(" ")[1].equals("w") ? Color.WHITE : Color.BLACK;
        CreateVariantRequest normalized = new CreateVariantRequest(
            request.name(), color.name(), request.moves(), request.tree(), null, startingFen);
        validator.validate(normalized, startingFen, true, false);

        if (phase != GamePhase.MIDDLEGAME) {
            // Finale (ENDGAME): fuori scope R26.3, i metadati Mediogioco non si applicano
            // (spec.md, "Opening and endgame children keep their contracts").
            return new PreparedVariant(normalized, color, startingFen, null, null, null, null, null, null);
        }

        validator.validateMiddlegameMetadata(request);
        Long themeId = request.themeId();
        if (themeId != null) {
            if (study == null || study.getStudyType() == null) {
                throw new InvalidVariantException(new ValidationError(
                    "themeId", null, null,
                    "Classifica lo studio Mediogioco (tattico o strategico) prima di assegnare un tema."));
            }
            try {
                themeService.requireActiveCompatibleTheme(themeId, study.getStudyType());
            } catch (InvalidThemeException e) {
                throw new InvalidVariantException(e.getError());
            }
        }
        Difficulty difficulty = parseDifficulty(request.difficulty());
        return new PreparedVariant(
            normalized, color, startingFen, themeId,
            normalizeText(request.themeDescription()), normalizeText(request.description()),
            difficulty, normalizeText(request.source()), request.positionOrder());
    }

    private static Difficulty parseDifficulty(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return Difficulty.valueOf(value);
        } catch (IllegalArgumentException e) {
            throw new InvalidVariantException(new ValidationError(
                "difficulty", null, null, "Difficoltà non valida: \"" + value + "\"."));
        }
    }

    private static String normalizeText(String text) {
        if (text == null) {
            return null;
        }
        String trimmed = text.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private record PreparedVariant(
        CreateVariantRequest request,
        Color color,
        String startingFen,
        Long themeId,
        String themeDescription,
        String description,
        Difficulty difficulty,
        String source,
        Integer requestedPositionOrder
    ) {
    }
}
