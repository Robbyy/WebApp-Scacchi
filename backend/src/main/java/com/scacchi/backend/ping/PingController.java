package com.scacchi.backend.ping;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Endpoint di salute usato per validare l'integrazione frontend/backend
 * nel Prototipo 0 (vedi planning-prototipi-webapp.md).
 */
@RestController
@RequestMapping("/api")
public class PingController {

    @GetMapping("/ping")
    public PingResponse ping() {
        return new PingResponse("pong");
    }
}
