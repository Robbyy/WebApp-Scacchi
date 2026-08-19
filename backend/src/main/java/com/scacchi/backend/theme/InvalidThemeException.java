package com.scacchi.backend.theme;

import com.scacchi.backend.variant.ValidationError;

/**
 * Sollevata quando un riferimento a un tema non è valido: inesistente, inattivo
 * o incompatibile con la tipologia dello studio (ISSUE-016/R26.3). Riusa il
 * formato {@link ValidationError} già adottato per studi e varianti.
 */
public class InvalidThemeException extends RuntimeException {

    private final transient ValidationError error;

    public InvalidThemeException(ValidationError error) {
        super(error.message());
        this.error = error;
    }

    public ValidationError getError() {
        return error;
    }
}
