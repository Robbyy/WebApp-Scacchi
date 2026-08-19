package com.scacchi.backend.attempt;

import com.scacchi.backend.variant.ValidationError;

/**
 * Sollevata quando una richiesta di tentativo non è valida: fase non Mediogioco,
 * studio non classificato, posizione bozza o senza tema, payload incoerente con
 * lo {@code studyType} persistito, o mossa tattica illegale/incompleta. Riusa il
 * formato {@link ValidationError} già adottato da studi, varianti e temi.
 */
public class InvalidAttemptException extends RuntimeException {

    private final transient ValidationError error;

    public InvalidAttemptException(ValidationError error) {
        super(error.message());
        this.error = error;
    }

    public ValidationError getError() {
        return error;
    }
}
