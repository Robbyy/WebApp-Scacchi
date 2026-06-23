package com.scacchi.backend.variant;

import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * API delle varianti di apertura (Prototipo 2): sola lettura su dati hardcoded.
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
}
