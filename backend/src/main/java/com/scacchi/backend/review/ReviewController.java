package com.scacchi.backend.review;

import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * API della spaced repetition (Prototipo 19): elenco delle varianti dovute e schedule di
 * una singola variante. L'aggiornamento dello scheduling avviene a fine allenamento (vedi
 * {@code TrainingSessionService}), non da qui.
 */
@RestController
@RequestMapping("/api/reviews")
public class ReviewController {

    private final ReviewService service;

    public ReviewController(ReviewService service) {
        this.service = service;
    }

    /** Varianti da ripetere oggi (o in ritardo). 200 con lista, eventualmente vuota. */
    @GetMapping("/due")
    public List<ReviewItemDto> due() {
        return service.due();
    }

    /** Schedule di una variante; 204 se la variante non è ancora pianificata. */
    @GetMapping("/variants/{variantId}")
    public ResponseEntity<ReviewScheduleDto> forVariant(@PathVariable Long variantId) {
        return service.forVariant(variantId)
            .map(ResponseEntity::ok)
            .orElseGet(() -> ResponseEntity.noContent().build());
    }
}
