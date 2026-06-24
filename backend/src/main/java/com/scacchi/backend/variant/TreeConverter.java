package com.scacchi.backend.variant;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import java.util.List;

/** Persiste l'albero di mosse come JSON in un'unica colonna. */
@Converter
public class TreeConverter implements AttributeConverter<List<MoveNode>, String> {

    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final TypeReference<List<MoveNode>> TREE_TYPE = new TypeReference<>() {};

    @Override
    public String convertToDatabaseColumn(List<MoveNode> attribute) {
        try {
            return MAPPER.writeValueAsString(attribute == null ? List.of() : attribute);
        } catch (Exception e) {
            throw new IllegalArgumentException("Impossibile serializzare l'albero", e);
        }
    }

    @Override
    public List<MoveNode> convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.isBlank()) {
            return List.of();
        }
        try {
            return MAPPER.readValue(dbData, TREE_TYPE);
        } catch (Exception e) {
            throw new IllegalArgumentException("Impossibile leggere l'albero", e);
        }
    }
}
