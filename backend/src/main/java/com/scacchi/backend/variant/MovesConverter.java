package com.scacchi.backend.variant;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import java.util.Arrays;
import java.util.List;

/**
 * Persiste la lista di mosse SAN come singola stringa, con separatore spazio
 * (le mosse SAN non contengono spazi). Mantiene il campo dell'entità come
 * {@code List<String>} senza una tabella separata (scelta del planning per i
 * prototipi, rischio R2).
 */
@Converter
public class MovesConverter implements AttributeConverter<List<String>, String> {

    @Override
    public String convertToDatabaseColumn(List<String> attribute) {
        return attribute == null || attribute.isEmpty() ? "" : String.join(" ", attribute);
    }

    @Override
    public List<String> convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.isBlank()) {
            return List.of();
        }
        return Arrays.asList(dbData.trim().split("\\s+"));
    }
}
