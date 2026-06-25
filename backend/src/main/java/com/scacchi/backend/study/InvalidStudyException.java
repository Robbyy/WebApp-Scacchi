package com.scacchi.backend.study;

import com.scacchi.backend.variant.ValidationError;

/**
 * Sollevata quando il payload di uno studio non è valido (es. nome vuoto o
 * colore non riconosciuto). Riusa il formato {@link ValidationError} già adottato
 * per le varianti (Prototipo 7), così il frontend ha un'unica forma d'errore 400.
 */
public class InvalidStudyException extends RuntimeException {

    private final transient ValidationError error;

    public InvalidStudyException(ValidationError error) {
        super(error.message());
        this.error = error;
    }

    public ValidationError getError() {
        return error;
    }
}
