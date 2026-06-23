package com.scacchi.backend.variant;

import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Service;

/**
 * Fornisce le varianti di apertura. Nel Prototipo 2 i dati sono hardcoded in
 * memoria; nel Prototipo 4 saranno sostituiti da una persistenza H2 mantenendo
 * invariato il contratto {@link VariantDto}.
 */
@Service
public class VariantService {

    private static final String START_FEN =
        "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

    private final List<VariantDto> variants = List.of(
        new VariantDto(
            1L,
            "Partita Italiana",
            "WHITE",
            List.of("e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5", "c3", "Nf6"),
            START_FEN,
            null,
            null
        ),
        new VariantDto(
            2L,
            "Difesa Siciliana - Najdorf",
            "BLACK",
            List.of("e4", "c5", "Nf3", "d6", "d4", "cxd4", "Nxd4", "Nf6", "Nc3", "a6"),
            START_FEN,
            null,
            null
        )
    );

    public List<VariantDto> findAll() {
        return variants;
    }

    public Optional<VariantDto> findById(Long id) {
        return variants.stream().filter(v -> v.id().equals(id)).findFirst();
    }
}
