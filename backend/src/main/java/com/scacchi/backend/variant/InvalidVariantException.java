package com.scacchi.backend.variant;

/**
 * Sollevata quando il payload di una variante non è valido (Prototipo 7):
 * trasporta il dettaglio strutturato dell'errore restituito al client.
 */
public class InvalidVariantException extends RuntimeException {

    private final transient ValidationError error;

    public InvalidVariantException(ValidationError error) {
        super(error.message());
        this.error = error;
    }

    public ValidationError getError() {
        return error;
    }
}
