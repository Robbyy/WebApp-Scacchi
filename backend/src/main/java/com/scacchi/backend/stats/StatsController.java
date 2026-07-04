package com.scacchi.backend.stats;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * API delle statistiche di allenamento (Prototipo 18): metriche per variante e
 * aggregato per studio, derivate dalle sessioni P17. Una variante/studio di apertura
 * senza allenamenti restituisce metriche a zero (200), non 404. Le statistiche di
 * variante e di studio non sono invece disponibili (404) per elementi inesistenti o
 * appartenenti a studi non {@code OPENING} (ISSUE-016): il training non le produce mai
 * per Mediogioco/Finale e non vanno presentate come statistiche di posizione.
 */
@RestController
@RequestMapping("/api/stats")
public class StatsController {

    private final StatsService service;

    public StatsController(StatsService service) {
        this.service = service;
    }

    @GetMapping("/variants/{variantId}")
    public ResponseEntity<VariantStatsDto> variantStats(@PathVariable Long variantId) {
        return service.variantStats(variantId)
            .map(ResponseEntity::ok)
            .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping("/studies/{studyId}")
    public ResponseEntity<StudyStatsDto> studyStats(@PathVariable Long studyId) {
        return service.studyStats(studyId)
            .map(ResponseEntity::ok)
            .orElseGet(() -> ResponseEntity.notFound().build());
    }
}
