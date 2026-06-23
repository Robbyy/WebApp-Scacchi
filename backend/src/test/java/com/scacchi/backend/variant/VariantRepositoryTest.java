package com.scacchi.backend.variant;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;

@DataJpaTest
class VariantRepositoryTest {

    @Autowired
    private VariantRepository repository;

    @Test
    void persistsMovesAsJsonAndReadsThemBack() {
        Variant v = new Variant();
        v.setName("Test");
        v.setColor(Color.WHITE);
        v.setMoves(List.of("e4", "e5", "Nf3"));
        v.setStartingFen(VariantService.START_FEN);

        Variant saved = repository.saveAndFlush(v);
        repository.flush();
        Variant found = repository.findById(saved.getId()).orElseThrow();

        assertEquals(3, found.getMoves().size());
        assertEquals("Nf3", found.getMoves().get(2));
        assertEquals(Color.WHITE, found.getColor());
        assertNotNull(found.getCreatedAt());
    }
}
