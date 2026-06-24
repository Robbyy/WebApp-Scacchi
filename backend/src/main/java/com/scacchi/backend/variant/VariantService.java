package com.scacchi.backend.variant;

import java.util.List;
import java.util.Optional;
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

    public VariantService(VariantRepository repository) {
        this.repository = repository;
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
        Variant entity = new Variant();
        entity.setName(request.name().trim());
        entity.setColor(Color.valueOf(request.color()));
        List<MoveNode> tree = resolveTree(request);
        entity.setTree(tree);
        entity.setMoves(MoveNode.mainline(tree));
        entity.setStartingFen(START_FEN);
        entity.setSourcePgn(request.sourcePgn());
        return toDto(repository.save(entity));
    }

    public Optional<VariantDto> update(Long id, CreateVariantRequest request) {
        return repository.findById(id).map(entity -> {
            entity.setName(request.name().trim());
            entity.setColor(Color.valueOf(request.color()));
            List<MoveNode> tree = resolveTree(request);
            entity.setTree(tree);
            entity.setMoves(MoveNode.mainline(tree));
            entity.setSourcePgn(request.sourcePgn());
            // startingFen e createdAt restano invariati
            return toDto(repository.save(entity));
        });
    }

    /** Albero dalla richiesta: usa tree se presente, altrimenti lo costruisce dalla linea. */
    private static List<MoveNode> resolveTree(CreateVariantRequest request) {
        if (request.tree() != null && !request.tree().isEmpty()) {
            return request.tree();
        }
        return MoveNode.fromLine(request.moves());
    }

    public boolean delete(Long id) {
        if (!repository.existsById(id)) {
            return false;
        }
        repository.deleteById(id);
        return true;
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
            v.getCreatedAt() == null ? null : v.getCreatedAt().toString()
        );
    }
}
