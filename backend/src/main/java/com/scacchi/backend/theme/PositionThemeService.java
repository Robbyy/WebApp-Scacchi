package com.scacchi.backend.theme;

import com.scacchi.backend.study.StudyType;
import com.scacchi.backend.variant.ValidationError;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;

/**
 * Catalogo dei temi di Mediogioco (ISSUE-016/R26.3, design.md decisione 3).
 * Sola lettura in R26.3: nessuna creazione, rinomina, disattivazione o
 * eliminazione esposta all'utente.
 */
@Service
public class PositionThemeService {

    private final PositionThemeRepository repository;

    public PositionThemeService(PositionThemeRepository repository) {
        this.repository = repository;
    }

    /** Temi attivi di una tipologia, nell'ordine del catalogo. */
    public List<PositionThemeDto> findActiveByStudyType(StudyType studyType) {
        return repository.findByStudyTypeAndActiveTrueOrderByDisplayOrderAsc(studyType).stream()
            .map(PositionThemeService::toDto)
            .toList();
    }

    /** Dato leggibile di un tema per ID (A3): usato per risolvere {@code Variant.themeId}. */
    public Optional<PositionThemeDto> findById(Long id) {
        return repository.findById(id).map(PositionThemeService::toDto);
    }

    /**
     * Risolve più temi in una sola query, indicizzati per ID. Serve a chi
     * converte un elenco di varianti: risolvendoli uno a uno, un elenco di N
     * posizioni costava N interrogazioni al catalogo.
     */
    public Map<Long, PositionThemeDto> findAllByIds(Collection<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            return Map.of();
        }
        return repository.findAllById(ids).stream()
            .collect(Collectors.toMap(PositionTheme::getId, PositionThemeService::toDto));
    }

    /**
     * Verifica lato backend (task 2.5) che {@code themeId} esista, sia attivo e sia
     * compatibile con la tipologia dello studio persistita, senza fidarsi di un
     * eventuale tipo dichiarato dal client. Restituisce l'entità per l'uso a valle
     * (es. lettura di {@code displayLabel} in A3).
     */
    public PositionTheme requireActiveCompatibleTheme(Long themeId, StudyType studyType) {
        if (themeId == null) {
            throw new InvalidThemeException(new ValidationError(
                "themeId", null, null, "Il tema è obbligatorio."));
        }
        PositionTheme theme = repository.findById(themeId).orElseThrow(() -> new InvalidThemeException(
            new ValidationError("themeId", null, null, "Tema non trovato: " + themeId + ".")));
        if (!theme.isActive()) {
            throw new InvalidThemeException(new ValidationError(
                "themeId", null, null, "Il tema selezionato non è più attivo."));
        }
        if (theme.getStudyType() != studyType) {
            throw new InvalidThemeException(new ValidationError(
                "themeId", null, null, "Il tema selezionato non è compatibile con la tipologia dello studio."));
        }
        return theme;
    }

    private static PositionThemeDto toDto(PositionTheme theme) {
        return new PositionThemeDto(
            theme.getId(),
            theme.getCode(),
            theme.getStudyType().name(),
            theme.getDisplayLabel(),
            theme.getDisplayOrder()
        );
    }
}
