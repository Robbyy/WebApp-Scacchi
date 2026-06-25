package com.scacchi.backend.study;

import com.scacchi.backend.variant.CreateVariantRequest;
import com.scacchi.backend.variant.InvalidVariantException;
import com.scacchi.backend.variant.ValidationError;
import com.scacchi.backend.variant.VariantDto;
import com.scacchi.backend.variant.VariantValidator;
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
 * API degli studi (Prototipo 11): elenco con conteggio varianti, dettaglio con
 * varianti, creazione, modifica e cancellazione <b>a cascata</b>.
 */
@RestController
@RequestMapping("/api/studies")
public class StudyController {

    private final StudyService service;
    private final VariantValidator variantValidator;

    public StudyController(StudyService service, VariantValidator variantValidator) {
        this.service = service;
        this.variantValidator = variantValidator;
    }

    @GetMapping
    public List<StudyDto> list() {
        return service.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<StudyDto> getById(@PathVariable Long id) {
        return service.findById(id)
            .map(ResponseEntity::ok)
            .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<StudyDto> create(@RequestBody CreateStudyRequest request) {
        StudyDto created = service.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<StudyDto> update(
        @PathVariable Long id, @RequestBody CreateStudyRequest request) {
        return service.update(id, request)
            .map(ResponseEntity::ok)
            .orElseGet(() -> ResponseEntity.notFound().build());
    }

    /** Crea una variante già agganciata allo studio (Prototipo 12). */
    @PostMapping("/{id}/variants")
    public ResponseEntity<VariantDto> createVariant(
        @PathVariable Long id, @RequestBody CreateVariantRequest request) {
        variantValidator.validate(request);
        return service.createVariant(id, request)
            .map(dto -> ResponseEntity.status(HttpStatus.CREATED).body(dto))
            .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        return service.delete(id)
            ? ResponseEntity.noContent().build()
            : ResponseEntity.notFound().build();
    }

    /** Payload studio non valido (es. nome vuoto): risposta 400 con dettaglio. */
    @ExceptionHandler(InvalidStudyException.class)
    public ResponseEntity<ValidationError> handleInvalid(InvalidStudyException ex) {
        return ResponseEntity.badRequest().body(ex.getError());
    }

    /** Variante non valida creata nello studio (es. mossa illegale): 400 con dettaglio. */
    @ExceptionHandler(InvalidVariantException.class)
    public ResponseEntity<ValidationError> handleInvalidVariant(InvalidVariantException ex) {
        return ResponseEntity.badRequest().body(ex.getError());
    }
}
