package com.scacchi.backend.stats;

/**
 * Una mossa frequentemente sbagliata in allenamento (Prototipo 18): la mossa
 * attesa e quante volte non è stata trovata.
 */
public record MoveMistakeDto(String expectedSan, int count) {
}
