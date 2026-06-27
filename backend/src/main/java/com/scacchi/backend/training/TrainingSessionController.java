package com.scacchi.backend.training;

import com.scacchi.backend.variant.ValidationError;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * API delle sessioni di allenamento (Prototipo 17): registrazione di una sessione
 * conclusa e lettura dello storico (riepilogo) / dettaglio (con mosse).
 */
@RestController
@RequestMapping("/api/training-sessions")
public class TrainingSessionController {

    private final TrainingSessionService service;

    public TrainingSessionController(TrainingSessionService service) {
        this.service = service;
    }

    @GetMapping
    public List<TrainingSessionDto> list(
        @RequestParam(required = false) Long variantId,
        @RequestParam(required = false) Long studyId) {
        return service.findAll(variantId, studyId);
    }

    @GetMapping("/{id}")
    public ResponseEntity<TrainingSessionDto> getById(@PathVariable Long id) {
        return service.findById(id)
            .map(ResponseEntity::ok)
            .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<TrainingSessionDto> create(
        @RequestBody CreateTrainingSessionRequest request) {
        return service.create(request)
            .map(dto -> ResponseEntity.status(HttpStatus.CREATED).body(dto))
            .orElseGet(() -> ResponseEntity.notFound().build());
    }

    /** Payload non valido (es. variante mancante, esito errato): 400 con dettaglio. */
    @ExceptionHandler(InvalidTrainingSessionException.class)
    public ResponseEntity<ValidationError> handleInvalid(InvalidTrainingSessionException ex) {
        return ResponseEntity.badRequest().body(ex.getError());
    }
}
