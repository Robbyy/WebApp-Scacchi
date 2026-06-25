package com.scacchi.backend.study;

import com.scacchi.backend.variant.Variant;
import com.scacchi.backend.variant.VariantRepository;
import java.util.List;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

/**
 * Deploya lo <b>studio di default</b> "Repertorio" e vi aggancia le varianti
 * preesistenti prive di studio (Prototipo 11). È la migrazione retrocompatibile
 * delle varianti legacy: non esiste un prototipo separato dedicato.
 *
 * <p>Idempotente: se lo studio di default esiste già non lo duplica, ma riaggancia
 * comunque eventuali varianti rimaste senza studio. Gira dopo
 * {@code VariantDataInitializer} ({@link Order}).
 */
@Component
@Order(2)
public class StudyDataInitializer implements CommandLineRunner {

    static final String DEFAULT_STUDY_NAME = "Repertorio";

    private final StudyRepository studies;
    private final VariantRepository variants;

    public StudyDataInitializer(StudyRepository studies, VariantRepository variants) {
        this.studies = studies;
        this.variants = variants;
    }

    @Override
    public void run(String... args) {
        Study defaultStudy = studies.findByName(DEFAULT_STUDY_NAME)
            .orElseGet(this::createDefaultStudy);

        List<Variant> orphans = variants.findByStudyIdIsNull();
        if (orphans.isEmpty()) {
            return;
        }
        orphans.forEach(v -> v.setStudyId(defaultStudy.getId()));
        variants.saveAll(orphans);
    }

    private Study createDefaultStudy() {
        Study study = new Study();
        study.setName(DEFAULT_STUDY_NAME);
        study.setDescription("Studio predefinito con le varianti esistenti.");
        study.setColor(StudyColor.MIXED);
        return studies.save(study);
    }
}
