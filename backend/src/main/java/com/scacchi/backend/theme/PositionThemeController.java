package com.scacchi.backend.theme;

import com.scacchi.backend.study.StudyType;
import com.scacchi.backend.variant.ValidationError;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * API di sola lettura del catalogo temi di Mediogioco (ISSUE-016/R26.3).
 * {@code studyType} è obbligatorio: non esiste un elenco combinato dei due
 * cataloghi, che restano indipendenti.
 */
@RestController
@RequestMapping("/api/position-themes")
public class PositionThemeController {

    private final PositionThemeService service;

    public PositionThemeController(PositionThemeService service) {
        this.service = service;
    }

    @GetMapping
    public List<PositionThemeDto> list(@RequestParam(required = false) String studyType) {
        if (studyType == null || studyType.isBlank()) {
            throw new InvalidThemeException(new ValidationError(
                "studyType", null, null, "La tipologia è obbligatoria."));
        }
        try {
            return service.findActiveByStudyType(StudyType.valueOf(studyType));
        } catch (IllegalArgumentException e) {
            throw new InvalidThemeException(new ValidationError(
                "studyType", null, null, "Tipologia non valida: \"" + studyType + "\"."));
        }
    }

    /** Riferimento tema non valido: risposta 400 con dettaglio. */
    @ExceptionHandler(InvalidThemeException.class)
    public ResponseEntity<ValidationError> handleInvalid(InvalidThemeException ex) {
        return ResponseEntity.badRequest().body(ex.getError());
    }
}
