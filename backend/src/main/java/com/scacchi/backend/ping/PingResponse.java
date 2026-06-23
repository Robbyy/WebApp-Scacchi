package com.scacchi.backend.ping;

/**
 * Risposta dell'endpoint di ping. Contratto: { "status": "pong" }.
 */
public record PingResponse(String status) {
}
