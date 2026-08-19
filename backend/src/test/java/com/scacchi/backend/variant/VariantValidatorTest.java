package com.scacchi.backend.variant;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.List;
import org.junit.jupiter.api.Test;

class VariantValidatorTest {

    private final VariantValidator validator = new VariantValidator();
    private static final String KINGS_ONLY_WHITE = "4k3/8/8/8/8/8/8/4K3 w - - 0 1";

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

    // R24: annotazioni delle mosse (commento entro il limite, NAG fra i sei).
    private static CreateVariantRequest annotated(String comment, String nag) {
        MoveNode tree = new MoveNode("e4", List.of(new MoveNode("e5", List.of(), comment, nag)));
        return new CreateVariantRequest("Test", "WHITE", null, List.of(tree), null);
    }

    @Test
    void acceptsAnAnnotatedMove() {
        assertDoesNotThrow(() -> validator.validate(annotated("Buona mossa", "!?")));
    }

    @Test
    void acceptsATreeWithoutAnnotations() {
        assertDoesNotThrow(() -> validator.validate(annotated(null, null)));
    }

    @Test
    void acceptsACommentAtTheLimit() {
        assertDoesNotThrow(
            () -> validator.validate(annotated("x".repeat(MoveNode.MAX_COMMENT_LENGTH), null)));
    }

    @Test
    void rejectsACommentBeyondTheLimit() {
        InvalidVariantException ex = assertThrows(
            InvalidVariantException.class,
            () -> validator.validate(annotated("x".repeat(MoveNode.MAX_COMMENT_LENGTH + 1), null)));
        assertEquals("tree", ex.getError().field());
        assertEquals(List.of(0, 0), ex.getError().branchPath());
    }

    @Test
    void rejectsANagOutsideTheAllowedSet() {
        InvalidVariantException ex = assertThrows(
            InvalidVariantException.class, () -> validator.validate(annotated(null, "!!!")));
        assertEquals("tree", ex.getError().field());
        assertEquals(List.of(0, 0), ex.getError().branchPath());
    }

    @Test
    void normalizesAValidCustomStartingFen() {
        String normalized = validator.validateAndNormalizeStartingFen(
            "4k3/8/8/8/8/8/8/4K3 b - - 7 22");

        assertEquals("4k3/8/8/8/8/8/8/4K3 b - - 0 1", normalized);
    }

    @Test
    void rejectsAdjacentKingsInStartingFen() {
        InvalidVariantException ex = assertThrows(InvalidVariantException.class,
            () -> validator.validateAndNormalizeStartingFen("8/8/8/8/8/8/4k3/4K3 w - - 0 1"));

        assertEquals("startingFen", ex.getError().field());
    }

    @Test
    void rejectsAPawnOnTheLastRankInStartingFen() {
        InvalidVariantException ex = assertThrows(InvalidVariantException.class,
            () -> validator.validateAndNormalizeStartingFen("4k3/8/8/8/8/8/8/P3K3 w - - 0 1"));

        assertEquals("startingFen", ex.getError().field());
    }

    @Test
    void rejectsCastlingRightsWithoutTheRequiredRook() {
        InvalidVariantException ex = assertThrows(InvalidVariantException.class,
            () -> validator.validateAndNormalizeStartingFen("4k3/8/8/8/8/8/8/4K3 w K - 0 1"));

        assertEquals("startingFen", ex.getError().field());
    }

    @Test
    void rejectsAPositionWhereTheSideThatJustMovedIsStillInCheck() {
        InvalidVariantException ex = assertThrows(InvalidVariantException.class,
            () -> validator.validateAndNormalizeStartingFen("4k3/8/8/8/8/8/8/r3K3 b - - 0 1"));

        assertEquals("startingFen", ex.getError().field());
    }

    @Test
    void acceptsAnImmediatelyCapturableEnPassantRight() {
        String normalized = validator.validateAndNormalizeStartingFen(
            "4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1");

        assertEquals("4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1", normalized);
    }

    @Test
    void rejectsAnEnPassantRightWithoutALegalCapturer() {
        InvalidVariantException ex = assertThrows(InvalidVariantException.class,
            () -> validator.validateAndNormalizeStartingFen("4k3/8/8/3p4/8/8/8/4K3 w - d6 0 1"));

        assertEquals("startingFen", ex.getError().field());
    }

    // --- limiti di lunghezza: il contratto non può dipendere dai `maxlength` della UI ---

    @Test
    void acceptsANameUpToTheColumnCapacity() {
        assertDoesNotThrow(() -> validator.validate(new CreateVariantRequest(
            "A".repeat(Variant.MAX_NAME_LENGTH), "WHITE", List.of("e4"), null, null)));
    }

    /** Oltre la capienza della colonna il nome arrivava al database: 500 invece di 400. */
    @Test
    void rejectsANameLongerThanTheColumnCapacity() {
        InvalidVariantException ex = assertThrows(InvalidVariantException.class,
            () -> validator.validate(new CreateVariantRequest(
                "A".repeat(Variant.MAX_NAME_LENGTH + 1), "WHITE", List.of("e4"), null, null)));

        assertEquals("name", ex.getError().field());
    }

    @Test
    void acceptsMiddlegameMetadataAtTheLimit() {
        assertDoesNotThrow(() -> validator.validateMiddlegameMetadata(metadata(
            "t".repeat(Variant.MAX_THEME_DESCRIPTION_LENGTH),
            "d".repeat(Variant.MAX_DESCRIPTION_LENGTH),
            "s".repeat(Variant.MAX_SOURCE_LENGTH))));
    }

    @Test
    void acceptsAbsentMiddlegameMetadata() {
        assertDoesNotThrow(() -> validator.validateMiddlegameMetadata(metadata(null, null, null)));
    }

    @Test
    void rejectsAThemeDescriptionOverTheLimit() {
        InvalidVariantException ex = assertThrows(InvalidVariantException.class,
            () -> validator.validateMiddlegameMetadata(
                metadata("t".repeat(Variant.MAX_THEME_DESCRIPTION_LENGTH + 1), null, null)));

        assertEquals("themeDescription", ex.getError().field());
    }

    @Test
    void rejectsADescriptionOverTheLimit() {
        InvalidVariantException ex = assertThrows(InvalidVariantException.class,
            () -> validator.validateMiddlegameMetadata(
                metadata(null, "d".repeat(Variant.MAX_DESCRIPTION_LENGTH + 1), null)));

        assertEquals("description", ex.getError().field());
    }

    @Test
    void rejectsASourceOverTheLimit() {
        InvalidVariantException ex = assertThrows(InvalidVariantException.class,
            () -> validator.validateMiddlegameMetadata(
                metadata(null, null, "s".repeat(Variant.MAX_SOURCE_LENGTH + 1))));

        assertEquals("source", ex.getError().field());
    }

    /** Il testo è misurato ripulito, come viene poi persistito: gli spazi non contano. */
    @Test
    void measuresTheMetadataAfterTrimming() {
        String padded = "   " + "s".repeat(Variant.MAX_SOURCE_LENGTH) + "   ";
        assertDoesNotThrow(() -> validator.validateMiddlegameMetadata(metadata(null, null, padded)));
    }

    private static CreateVariantRequest metadata(
        String themeDescription, String description, String source) {
        return new CreateVariantRequest(
            "Posizione", "WHITE", List.of(), null, null, KINGS_ONLY_WHITE,
            1001L, themeDescription, description, null, source, null);
    }

    @Test
    void validatesMovesFromTheCustomStartingFen() {
        CreateVariantRequest request = new CreateVariantRequest(
            "Posizione", "WHITE", List.of("Ke2"), null, null, KINGS_ONLY_WHITE);
        assertDoesNotThrow(() -> validator.validate(request, KINGS_ONLY_WHITE, true, false));
    }

    @Test
    void rejectsMovesThatAreIllegalFromTheCustomStartingFen() {
        CreateVariantRequest request = new CreateVariantRequest(
            "Posizione", "WHITE", List.of("e4"), null, null, KINGS_ONLY_WHITE);
        InvalidVariantException ex = assertThrows(InvalidVariantException.class,
            () -> validator.validate(request, KINGS_ONLY_WHITE, true, false));

        assertEquals("moves", ex.getError().field());
    }
}
