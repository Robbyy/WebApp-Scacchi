package com.scacchi.backend.variant;

import java.util.List;

/**
 * Payload del riordino atomico delle posizioni di uno studio Mediogioco
 * (ISSUE-016/R26.3, design.md decisione 5): la permutazione completa, senza
 * duplicati né ID estranei, degli ID delle posizioni dello studio nell'ordine
 * desiderato.
 */
public record VariantOrderRequest(List<Long> variantIds) {
}
