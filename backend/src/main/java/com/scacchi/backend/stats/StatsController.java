package com.scacchi.backend.stats;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * API delle statistiche di allenamento (Prototipo 18): metriche per variante e
 * aggregato per studio, derivate dalle sessioni P17. Una variante/studio senza
 * allenamenti restituisce metriche a zero (200), non 404.
 */
@RestController
@RequestMapping("/api/stats")
public class StatsController {

    private final StatsService service;

    public StatsController(StatsService service) {
        this.service = service;
    }

    @GetMapping("/variants/{variantId}")
    public VariantStatsDto variantStats(@PathVariable Long variantId) {
        return service.variantStats(variantId);
    }

    @GetMapping("/studies/{studyId}")
    public StudyStatsDto studyStats(@PathVariable Long studyId) {
        return service.studyStats(studyId);
    }
}
