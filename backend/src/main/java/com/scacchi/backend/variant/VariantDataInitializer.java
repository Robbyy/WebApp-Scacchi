package com.scacchi.backend.variant;

import java.util.List;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

/**
 * Popola il database con alcune varianti di default al primo avvio (quando è
 * vuoto). Con H2 in memoria il seed viene rieseguito a ogni avvio.
 */
@Component
public class VariantDataInitializer implements CommandLineRunner {

    private final VariantRepository repository;

    public VariantDataInitializer(VariantRepository repository) {
        this.repository = repository;
    }

    @Override
    public void run(String... args) {
        if (repository.count() > 0) {
            return;
        }
        repository.save(make(
            "Partita Italiana", Color.WHITE,
            List.of("e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5", "c3", "Nf6")));
        repository.save(make(
            "Difesa Siciliana - Najdorf", Color.BLACK,
            List.of("e4", "c5", "Nf3", "d6", "d4", "cxd4", "Nxd4", "Nf6", "Nc3", "a6")));
    }

    private static Variant make(String name, Color color, List<String> moves) {
        Variant v = new Variant();
        v.setName(name);
        v.setColor(color);
        v.setMoves(moves);
        v.setStartingFen(VariantService.START_FEN);
        return v;
    }
}
