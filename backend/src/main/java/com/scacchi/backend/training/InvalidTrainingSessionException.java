package com.scacchi.backend.training;

import com.scacchi.backend.variant.ValidationError;

/**
 * Sollevata quando il payload di una sessione di allenamento non è valido
 * (es. variante mancante o esito non riconosciuto). Riusa {@link ValidationError}
 * per avere un'unica forma d'errore 400 verso il frontend.
 */
public class InvalidTrainingSessionException extends RuntimeException {

    private final transient ValidationError error;

    public InvalidTrainingSessionException(ValidationError error) {
        super(error.message());
        this.error = error;
    }

    public ValidationError getError() {
        return error;
    }
}
