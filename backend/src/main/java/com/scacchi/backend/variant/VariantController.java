package com.scacchi.backend.variant;

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
    private final VariantValidator validator;

    public VariantController(VariantService service, VariantValidator validator) {
        this.service = service;
        this.validator = validator;
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
        validator.validate(request);
        VariantDto created = service.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<VariantDto> update(
        @PathVariable Long id, @RequestBody CreateVariantRequest request) {
        validator.validate(request);
        return service.update(id, request)
            .map(ResponseEntity::ok)
            .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        return service.delete(id)
            ? ResponseEntity.noContent().build()
            : ResponseEntity.notFound().build();
    }

    /** Payload non valido (struttura o legalità): risposta 400 con dettaglio. */
    @ExceptionHandler(InvalidVariantException.class)
    public ResponseEntity<ValidationError> handleInvalid(InvalidVariantException ex) {
        return ResponseEntity.badRequest().body(ex.getError());
    }
}
