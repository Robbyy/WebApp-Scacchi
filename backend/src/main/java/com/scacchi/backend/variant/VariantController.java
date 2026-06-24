package com.scacchi.backend.variant;

import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * API delle varianti di apertura (Prototipo 4): lettura, creazione e
 * cancellazione su persistenza H2.
 */
@RestController
@RequestMapping("/api/variants")
public class VariantController {

    private final VariantService service;

    public VariantController(VariantService service) {
        this.service = service;
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
        if (!isValid(request)) {
            return ResponseEntity.badRequest().build();
        }
        VariantDto created = service.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<VariantDto> update(
        @PathVariable Long id, @RequestBody CreateVariantRequest request) {
        if (!isValid(request)) {
            return ResponseEntity.badRequest().build();
        }
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

    private static boolean isValid(CreateVariantRequest request) {
        if (request == null
            || request.name() == null || request.name().isBlank()
            || request.moves() == null || request.moves().isEmpty()
            || request.color() == null) {
            return false;
        }
        try {
            Color.valueOf(request.color());
            return true;
        } catch (IllegalArgumentException e) {
            return false;
        }
    }
}
