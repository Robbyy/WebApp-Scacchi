package com.scacchi.backend.study;

import com.scacchi.backend.variant.CreateVariantRequest;
import java.util.List;

/**
 * Richiesta di import in blocco di uno studio (Prototipo 14): crea uno studio
 * locale e tutte le sue varianti in un'unica transazione. Le varianti arrivano
 * già parse dal frontend (parser PGN di P13), tipicamente da uno studio/capitolo
 * pubblico Lichess.
 */
public record ImportStudyRequest(
    String name,
    String description,
    String color,               // "WHITE" | "BLACK" | "MIXED" (opzionale)
    List<CreateVariantRequest> variants
) {
}
