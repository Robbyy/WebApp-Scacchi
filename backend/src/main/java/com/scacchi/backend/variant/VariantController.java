package com.scacchi.backend.variant;

import com.scacchi.backend.attempt.InvalidAttemptException;
import com.scacchi.backend.attempt.PositionAttemptDto;
import com.scacchi.backend.attempt.PositionAttemptService;
import com.scacchi.backend.attempt.RecordAttemptRequest;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * API delle varianti di apertura: lettura, creazione, modifica e cancellazione
 * su persistenza H2. Dal Prototipo 7 i payload sono validati anche sulla
 * legalità scacchistica ({@link VariantValidator}).
 */
@RestController
@RequestMapping("/api/variants")
public class VariantController {

    private final VariantService service;
    private final PositionAttemptService attemptService;

    public VariantController(VariantService service, PositionAttemptService attemptService) {
        this.service = service;
        this.attemptService = attemptService;
    }

    @GetMapping
    public List<VariantDto> list() {
        return service.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<VariantDto> getById(@PathVariable Long id) {
        return service.findById(id)
            .map(ResponseEntity::ok)
            .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<VariantDto> create(@RequestBody CreateVariantRequest request) {
        VariantDto created = service.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<VariantDto> update(
        @PathVariable Long id, @RequestBody CreateVariantRequest request) {
        return service.update(id, request)
            .map(ResponseEntity::ok)
            .orElseGet(() -> ResponseEntity.notFound().build());
    }

    /**
     * Aggiorna il solo albero (nome, colore per le Aperture, mosse) lasciando
     * invariati FEN iniziale e metadati Mediogioco: è il contratto dell'editor
     * delle mosse, che non possiede quei campi e con il full-replace di
     * {@link #update} li azzerava a ogni salvataggio.
     */
    @PutMapping("/{id}/tree")
    public ResponseEntity<VariantDto> updateTree(
        @PathVariable Long id, @RequestBody UpdateVariantTreeRequest request) {
        return service.updateTree(id, request)
            .map(ResponseEntity::ok)
            .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        return service.delete(id)
            ? ResponseEntity.noContent().build()
            : ResponseEntity.notFound().build();
    }

    /**
     * Registra un tentativo su una posizione (ISSUE-016/R26.3, task 4.2): un solo
     * endpoint, discriminato dallo {@code studyType} persistito. Nessun endpoint per
     * modificare o eliminare il singolo tentativo (task 4.6).
     */
    @PostMapping("/{id}/attempts")
    public ResponseEntity<PositionAttemptDto> recordAttempt(
        @PathVariable Long id, @RequestBody RecordAttemptRequest request) {
        return attemptService.recordAttempt(id, request)
            .map(dto -> ResponseEntity.status(HttpStatus.CREATED).body(dto))
            .orElseGet(() -> ResponseEntity.notFound().build());
    }

    /** Storico dei tentativi di una posizione, più recente prima (task 4.5). */
    @GetMapping("/{id}/attempts")
    public ResponseEntity<List<PositionAttemptDto>> listAttempts(@PathVariable Long id) {
        return attemptService.findByVariantId(id)
            .map(ResponseEntity::ok)
            .orElseGet(() -> ResponseEntity.notFound().build());
    }

    /** Payload non valido (struttura o legalità): risposta 400 con dettaglio. */
    @ExceptionHandler(InvalidVariantException.class)
    public ResponseEntity<ValidationError> handleInvalid(InvalidVariantException ex) {
        return ResponseEntity.badRequest().body(ex.getError());
    }

    /** Tentativo non valido (fase, classificazione, tema, mossa o esito): 400 con dettaglio. */
    @ExceptionHandler(InvalidAttemptException.class)
    public ResponseEntity<ValidationError> handleInvalidAttempt(InvalidAttemptException ex) {
        return ResponseEntity.badRequest().body(ex.getError());
    }
}
