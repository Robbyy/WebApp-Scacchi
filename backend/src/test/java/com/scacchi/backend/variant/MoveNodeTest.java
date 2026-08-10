package com.scacchi.backend.variant;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import org.junit.jupiter.api.Test;

class MoveNodeTest {

    @Test
    void mainlineFollowsTheFirstChild() {
        // e4 -> ( e5 -> Nf3 ; c5 ) => mainline: e4 e5 Nf3
        List<MoveNode> tree = List.of(
            new MoveNode("e4", List.of(
                new MoveNode("e5", List.of(new MoveNode("Nf3", List.of()))),
                new MoveNode("c5", List.of()))));
        assertEquals(List.of("e4", "e5", "Nf3"), MoveNode.mainline(tree));
    }

    @Test
    void fromLineBuildsALinearChain() {
        List<MoveNode> tree = MoveNode.fromLine(List.of("e4", "e5", "Nf3"));
        assertEquals(1, tree.size());
        assertEquals(List.of("e4", "e5", "Nf3"), MoveNode.mainline(tree));
    }

    @Test
    void emptyLineGivesEmptyTree() {
        assertEquals(List.of(), MoveNode.fromLine(List.of()));
        assertEquals(List.of(), MoveNode.mainline(List.of()));
    }

    @Test
    void reorderingChildrenChangesTheDerivedMainline() {
        // Vincolo ufficiale (ADR 0002): children.get(0) è la mainline.
        List<MoveNode> e5First = List.of(new MoveNode("e4", List.of(
            new MoveNode("e5", List.of()),
            new MoveNode("c5", List.of()))));
        assertEquals(List.of("e4", "e5"), MoveNode.mainline(e5First));

        List<MoveNode> c5First = List.of(new MoveNode("e4", List.of(
            new MoveNode("c5", List.of()),
            new MoveNode("e5", List.of()))));
        assertEquals(List.of("e4", "c5"), MoveNode.mainline(c5First));
    }

    // R24: annotazioni opzionali, con la firma storica ancora disponibile.
    @Test
    void theTwoArgumentConstructorLeavesTheNodeUnannotated() {
        MoveNode node = new MoveNode("e4", List.of());
        assertNull(node.comment());
        assertNull(node.nag());
    }

    @Test
    void fromLineBuildsNodesWithoutAnnotations() {
        MoveNode first = MoveNode.fromLine(List.of("e4", "e5")).get(0);
        assertNull(first.comment());
        assertNull(first.nag());
    }

    @Test
    void aBlankCommentIsNotKept() {
        assertNull(new MoveNode("e4", List.of(), "   ", null).comment());
        assertNull(new MoveNode("e4", List.of(), null, null).comment());
    }

    @Test
    void theCommentIsTrimmed() {
        assertEquals("Apertura di re", new MoveNode("e4", List.of(), "  Apertura di re  ", null).comment());
    }

    @Test
    void theSixNagsAreTheOnlyOnesAdmitted() {
        assertEquals(6, MoveNode.NAGS.size());
        assertTrue(MoveNode.NAGS.containsAll(List.of("!", "?", "!!", "??", "!?", "?!")));
    }
}
