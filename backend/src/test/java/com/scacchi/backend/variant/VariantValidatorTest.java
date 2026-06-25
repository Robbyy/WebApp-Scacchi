package com.scacchi.backend.variant;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.List;
import org.junit.jupiter.api.Test;

class VariantValidatorTest {

    private final VariantValidator validator = new VariantValidator();

    private static CreateVariantRequest line(String... moves) {
        return new CreateVariantRequest("Test", "WHITE", List.of(moves), null, null);
    }

    @Test
    void acceptsALegalMainline() {
        assertDoesNotThrow(() -> validator.validate(line("e4", "e5", "Nf3", "Nc6", "Bb5")));
    }

    @Test
    void rejectsAnIllegalMoveWithFieldAndPly() {
        InvalidVariantException ex = assertThrows(
            InvalidVariantException.class, () -> validator.validate(line("e4", "e4")));
        assertEquals("moves", ex.getError().field());
        assertEquals(2, ex.getError().ply());
    }

    @Test
    void rejectsAnIllegalBranchWithBranchPath() {
        MoveNode tree = new MoveNode("e4", List.of(
            new MoveNode("e5", List.of()),
            new MoveNode("Xx9", List.of()) // ramo illegale/non riconosciuto
        ));
        CreateVariantRequest req =
            new CreateVariantRequest("Test", "WHITE", null, List.of(tree), null);
        InvalidVariantException ex = assertThrows(
            InvalidVariantException.class, () -> validator.validate(req));
        assertEquals("tree", ex.getError().field());
        assertEquals(List.of(0, 1), ex.getError().branchPath());
    }

    @Test
    void rejectsABlankName() {
        CreateVariantRequest req =
            new CreateVariantRequest("  ", "WHITE", List.of("e4"), null, null);
        assertThrows(InvalidVariantException.class, () -> validator.validate(req));
    }

    @Test
    void rejectsAnInvalidColor() {
        CreateVariantRequest req =
            new CreateVariantRequest("Test", "VERDE", List.of("e4"), null, null);
        InvalidVariantException ex = assertThrows(
            InvalidVariantException.class, () -> validator.validate(req));
        assertEquals("color", ex.getError().field());
    }
}
