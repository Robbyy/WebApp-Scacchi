package com.scacchi.backend.variant;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import org.junit.jupiter.api.Test;

/**
 * Compatibilità del JSON dell'albero attraverso l'estensione di R24: i documenti
 * scritti prima delle annotazioni devono restare leggibili, e un albero senza
 * annotazioni deve continuare a produrre lo stesso JSON minimale.
 */
class TreeConverterTest {

    private final TreeConverter converter = new TreeConverter();

    @Test
    void readsLegacyJsonWithoutAnnotations() {
        String legacy = """
            [{"san":"e4","children":[{"san":"e5","children":[]}]}]""";

        List<MoveNode> tree = converter.convertToEntityAttribute(legacy);

        assertEquals(List.of("e4", "e5"), MoveNode.mainline(tree));
        assertNull(tree.get(0).comment());
        assertNull(tree.get(0).nag());
    }

    @Test
    void readsAnnotationsWhenPresent() {
        String json = """
            [{"san":"e4","children":[],"comment":"Apertura di re","nag":"!"}]""";

        MoveNode node = converter.convertToEntityAttribute(json).get(0);

        assertEquals("Apertura di re", node.comment());
        assertEquals("!", node.nag());
    }

    @Test
    void writesNoAnnotationKeysForAnUnannotatedTree() {
        String json = converter.convertToDatabaseColumn(MoveNode.fromLine(List.of("e4", "e5")));

        assertFalse(json.contains("comment"));
        assertFalse(json.contains("nag"));
    }

    @Test
    void annotationsSurviveTheRoundTrip() {
        List<MoveNode> tree = List.of(
            new MoveNode("e4", List.of(new MoveNode("e5", List.of(), "Simmetrica", "!?")),
                "Apertura di re", "!"));

        List<MoveNode> back = converter.convertToEntityAttribute(
            converter.convertToDatabaseColumn(tree));

        assertEquals("Apertura di re", back.get(0).comment());
        assertEquals("!", back.get(0).nag());
        assertEquals("Simmetrica", back.get(0).children().get(0).comment());
        assertEquals("!?", back.get(0).children().get(0).nag());
    }

    @Test
    void anEmptyColumnGivesAnEmptyTree() {
        assertTrue(converter.convertToEntityAttribute(null).isEmpty());
        assertTrue(converter.convertToEntityAttribute("  ").isEmpty());
    }
}
