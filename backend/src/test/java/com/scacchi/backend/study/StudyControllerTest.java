package com.scacchi.backend.study;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class StudyControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private StudyRepository studyRepository;

    @Test
    void listReturnsTheDefaultStudyWithItsSeededVariants() throws Exception {
        // Il seed crea lo studio di default "Repertorio" e vi aggancia le 2 varianti seed.
        // ISSUE-016: gli studi esistenti/legacy sono trattati come OPENING.
        mockMvc.perform(get("/api/studies"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].name").value("Repertorio"))
            .andExpect(jsonPath("$[0].phase").value("OPENING"))
            .andExpect(jsonPath("$[0].variantCount").value(2))
            .andExpect(jsonPath("$[0].variants").doesNotExist());
    }

    @Test
    void detailReturnsTheStudyWithTheVariantList() throws Exception {
        int defaultId = defaultStudyId();
        mockMvc.perform(get("/api/studies/" + defaultId))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.name").value("Repertorio"))
            .andExpect(jsonPath("$.variantCount").value(2))
            .andExpect(jsonPath("$.variants.length()").value(2))
            .andExpect(jsonPath("$.variants[0].studyId").value(defaultId));
    }

    @Test
    void getByIdReturns404WhenMissing() throws Exception {
        mockMvc.perform(get("/api/studies/999999"))
            .andExpect(status().isNotFound());
    }

    @Test
    void createPersistsAndReturns201() throws Exception {
        String body = """
            {"name":"Siciliana","description":"Repertorio col Nero","color":"BLACK"}""";
        mockMvc.perform(post("/api/studies").contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.id").isNumber())
            .andExpect(jsonPath("$.name").value("Siciliana"))
            .andExpect(jsonPath("$.description").value("Repertorio col Nero"))
            .andExpect(jsonPath("$.color").value("BLACK"))
            // ISSUE-016: fase assente nel payload -> default OPENING.
            .andExpect(jsonPath("$.phase").value("OPENING"))
            .andExpect(jsonPath("$.variantCount").value(0))
            .andExpect(jsonPath("$.createdAt").isNotEmpty());
    }

    @Test
    void createAcceptsAnExplicitNonOpeningPhase() throws Exception {
        String body = """
            {"name":"Finali di torre","phase":"ENDGAME"}""";
        mockMvc.perform(post("/api/studies").contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.name").value("Finali di torre"))
            .andExpect(jsonPath("$.phase").value("ENDGAME"));
    }

    @Test
    void createRejectsAnInvalidPhase() throws Exception {
        String body = """
            {"name":"Strana fase","phase":"BOH"}""";
        mockMvc.perform(post("/api/studies").contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.field").value("phase"));
    }

    @Test
    void listCanBeFilteredByPhase() throws Exception {
        createStudyWithPhase("Mediogioco tipico", "MIDDLEGAME");
        createStudyWithPhase("Un altro di finale", "ENDGAME");

        mockMvc.perform(get("/api/studies").param("phase", "MIDDLEGAME"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(1))
            .andExpect(jsonPath("$[0].name").value("Mediogioco tipico"))
            .andExpect(jsonPath("$[0].phase").value("MIDDLEGAME"));

        // Lo studio seed di default resta filtrabile come OPENING.
        mockMvc.perform(get("/api/studies").param("phase", "OPENING"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].name").value("Repertorio"));
    }

    @Test
    void listRejectsAnInvalidPhaseFilter() throws Exception {
        mockMvc.perform(get("/api/studies").param("phase", "BOH"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.field").value("phase"));
    }

    @Test
    void createRejectsABlankName() throws Exception {
        String body = """
            {"name":"  ","color":"MIXED"}""";
        mockMvc.perform(post("/api/studies").contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.field").value("name"))
            .andExpect(jsonPath("$.message").isNotEmpty());
    }

    @Test
    void createRejectsAnInvalidColor() throws Exception {
        String body = """
            {"name":"Strano","color":"GREEN"}""";
        mockMvc.perform(post("/api/studies").contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.field").value("color"));
    }

    @Test
    void updateChangesNameDescriptionAndColor() throws Exception {
        int id = createStudy("""
            {"name":"Da rinominare","color":"WHITE"}""");

        String update = """
            {"name":"Rinominato","description":"aggiornata","color":"MIXED"}""";
        mockMvc.perform(put("/api/studies/" + id).contentType(MediaType.APPLICATION_JSON).content(update))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(id))
            .andExpect(jsonPath("$.name").value("Rinominato"))
            .andExpect(jsonPath("$.description").value("aggiornata"))
            .andExpect(jsonPath("$.color").value("MIXED"));
    }

    @Test
    void updateWithoutPhaseKeepsTheExistingPhase() throws Exception {
        int id = createStudyWithPhase("Studio finali", "ENDGAME");

        String update = """
            {"name":"Studio finali rinominato"}""";
        mockMvc.perform(put("/api/studies/" + id).contentType(MediaType.APPLICATION_JSON).content(update))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.name").value("Studio finali rinominato"))
            .andExpect(jsonPath("$.phase").value("ENDGAME"));
    }

    @Test
    void updateAcceptingTheSamePhaseSucceeds() throws Exception {
        int id = createStudyWithPhase("Studio mediogioco", "MIDDLEGAME");

        String update = """
            {"name":"Rinominato","phase":"MIDDLEGAME"}""";
        mockMvc.perform(put("/api/studies/" + id).contentType(MediaType.APPLICATION_JSON).content(update))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.phase").value("MIDDLEGAME"));
    }

    @Test
    void updateRejectsChangingThePhase() throws Exception {
        int id = createStudyWithPhase("Studio apertura", "OPENING");

        String update = """
            {"name":"Provo a cambiare fase","phase":"MIDDLEGAME"}""";
        mockMvc.perform(put("/api/studies/" + id).contentType(MediaType.APPLICATION_JSON).content(update))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.field").value("phase"));

        // La fase persistita non è cambiata.
        mockMvc.perform(get("/api/studies/" + id))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.phase").value("OPENING"))
            .andExpect(jsonPath("$.name").value("Studio apertura"));
    }

    @Test
    void updateReturns404WhenMissing() throws Exception {
        String body = """
            {"name":"X"}""";
        mockMvc.perform(put("/api/studies/999999").contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isNotFound());
    }

    @Test
    void createsAVariantAlreadyAttachedToTheStudy() throws Exception {
        int studyId = createStudy("""
            {"name":"Con variante"}""");

        String variant = """
            {"name":"Italiana","color":"WHITE","moves":["e4","e5","Nf3"]}""";
        mockMvc.perform(post("/api/studies/" + studyId + "/variants")
                .contentType(MediaType.APPLICATION_JSON).content(variant))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.name").value("Italiana"))
            .andExpect(jsonPath("$.studyId").value(studyId));

        // Compare anche nel dettaglio dello studio.
        mockMvc.perform(get("/api/studies/" + studyId))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.variantCount").value(1))
            .andExpect(jsonPath("$.variants[0].name").value("Italiana"));
    }

    @Test
    void creatingAVariantInAMissingStudyReturns404() throws Exception {
        String variant = """
            {"name":"X","color":"WHITE","moves":["e4"]}""";
        mockMvc.perform(post("/api/studies/999999/variants")
                .contentType(MediaType.APPLICATION_JSON).content(variant))
            .andExpect(status().isNotFound());
    }

    @Test
    void creatingAnIllegalVariantInAStudyReturns400() throws Exception {
        int studyId = createStudy("""
            {"name":"Studio"}""");
        String variant = """
            {"name":"Illegale","color":"WHITE","moves":["e4","e4"]}""";
        mockMvc.perform(post("/api/studies/" + studyId + "/variants")
                .contentType(MediaType.APPLICATION_JSON).content(variant))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.field").value("moves"))
            .andExpect(jsonPath("$.ply").value(2));
    }

    @Test
    void createsAnEmptyPositionWithCustomFenAndDerivedColor() throws Exception {
        int studyId = createStudyWithPhase("Posizioni di finale", "ENDGAME");
        String body = """
            {"name":"Re e pedone","moves":[],"tree":[],
             "startingFen":"4k3/8/8/8/8/8/8/4K3 b - - 17 42"}""";

        mockMvc.perform(post("/api/studies/" + studyId + "/variants")
                .contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.name").value("Re e pedone"))
            .andExpect(jsonPath("$.studyId").value(studyId))
            .andExpect(jsonPath("$.color").value("BLACK"))
            .andExpect(jsonPath("$.startingFen").value("4k3/8/8/8/8/8/8/4K3 b - - 0 1"))
            .andExpect(jsonPath("$.moves.length()").value(0))
            .andExpect(jsonPath("$.tree.length()").value(0));
    }

    @Test
    void rejectsAnEmptyPositionWithoutCustomStartingFen() throws Exception {
        int studyId = createStudyWithPhase("Posizioni", "MIDDLEGAME");
        String body = """
            {"name":"FEN mancante","moves":[],"tree":[]}""";

        mockMvc.perform(post("/api/studies/" + studyId + "/variants")
                .contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.field").value("startingFen"));

        mockMvc.perform(get("/api/studies/" + studyId))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.variantCount").value(0));
    }

    @Test
    void rejectsAnEmptyPositionWithABlankCustomStartingFen() throws Exception {
        int studyId = createStudyWithPhase("Posizioni", "ENDGAME");
        String body = """
            {"name":"FEN vuota","moves":[],"tree":[],"startingFen":"   "}""";

        mockMvc.perform(post("/api/studies/" + studyId + "/variants")
                .contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.field").value("startingFen"));

        mockMvc.perform(get("/api/studies/" + studyId))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.variantCount").value(0));
    }

    @Test
    void rejectsAnIllegalCustomStartingFenWithoutSavingThePosition() throws Exception {
        int studyId = createStudyWithPhase("Posizioni", "MIDDLEGAME");
        String body = """
            {"name":"Re mancanti","moves":[],"startingFen":"8/8/8/8/8/8/8/8 w - - 0 1"}""";

        mockMvc.perform(post("/api/studies/" + studyId + "/variants")
                .contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.field").value("startingFen"));

        mockMvc.perform(get("/api/studies/" + studyId))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.variantCount").value(0));
    }

    @Test
    void rejectsACustomFenForAnOpeningVariant() throws Exception {
        int studyId = createStudy("""
            {"name":"Aperture"}""");
        String body = """
            {"name":"Non consentita","color":"WHITE","moves":["e4"],
             "startingFen":"4k3/8/8/8/8/8/8/4K3 w - - 0 1"}""";

        mockMvc.perform(post("/api/studies/" + studyId + "/variants")
                .contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.field").value("startingFen"));
    }

    @Test
    void changingAStartingFenRejectsAnIncompatibleExistingTreeAtomically() throws Exception {
        int studyId = createStudyWithPhase("Posizioni", "MIDDLEGAME");
        String originalFen = "4k3/8/8/8/8/8/8/4K3 w - - 0 1";
        String create = """
            {"name":"Re in movimento","moves":["Ke2"],"startingFen":"%s","themeId":1001}"""
            .formatted(originalFen);
        int variantId = JsonPath.read(mockMvc.perform(post("/api/studies/" + studyId + "/variants")
                .contentType(MediaType.APPLICATION_JSON).content(create))
            .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString(), "$.id");

        String update = """
            {"name":"Non deve salvarsi","moves":["Ke2"],
             "startingFen":"4k3/8/8/8/8/8/8/4K3 b - - 0 1"}""";
        mockMvc.perform(put("/api/variants/" + variantId)
                .contentType(MediaType.APPLICATION_JSON).content(update))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.field").value("moves"));

        mockMvc.perform(get("/api/variants/" + variantId))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.name").value("Re in movimento"))
            .andExpect(jsonPath("$.startingFen").value(originalFen));
    }

    @Test
    void rejectsAnUpdateWithoutCustomStartingFenAndPreservesThePosition() throws Exception {
        int studyId = createStudyWithPhase("Posizioni", "MIDDLEGAME");
        String originalFen = "4k3/8/8/8/8/8/8/4K3 w - - 0 1";
        String create = """
            {"name":"Posizione originale","moves":[],"startingFen":"%s","themeId":1001}"""
            .formatted(originalFen);
        int variantId = JsonPath.read(mockMvc.perform(post("/api/studies/" + studyId + "/variants")
                .contentType(MediaType.APPLICATION_JSON).content(create))
            .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString(), "$.id");

        String update = """
            {"name":"Non deve salvarsi","moves":[]}""";
        mockMvc.perform(put("/api/variants/" + variantId)
                .contentType(MediaType.APPLICATION_JSON).content(update))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.field").value("startingFen"));

        mockMvc.perform(get("/api/variants/" + variantId))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.name").value("Posizione originale"))
            .andExpect(jsonPath("$.startingFen").value(originalFen));
    }

    @Test
    void importsAStudyWithMultipleVariants() throws Exception {
        String body = """
            {"name":"Repertorio Lichess","description":"importato","color":"WHITE","variants":[
              {"name":"Cap. 1","color":"WHITE","moves":["e4","e5","Nf3"]},
              {"name":"Cap. 2","color":"WHITE","moves":["d4","d5","c4"]}
            ]}""";
        mockMvc.perform(post("/api/studies/import").contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.name").value("Repertorio Lichess"))
            // ISSUE-016: l'import in blocco crea sempre uno studio OPENING.
            .andExpect(jsonPath("$.phase").value("OPENING"))
            .andExpect(jsonPath("$.variantCount").value(2))
            .andExpect(jsonPath("$.variants.length()").value(2))
            .andExpect(jsonPath("$.variants[0].name").value("Cap. 1"))
            .andExpect(jsonPath("$.variants[0].studyId").isNumber());
    }

    @Test
    void importRollsBackEntirelyWhenAVariantIsIllegal() throws Exception {
        int before = studyCount();
        String body = """
            {"name":"Import rotto","variants":[
              {"name":"Buono","color":"WHITE","moves":["e4","e5"]},
              {"name":"Illegale","color":"WHITE","moves":["e4","e4"]}
            ]}""";
        mockMvc.perform(post("/api/studies/import").contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.field").value("moves"));

        // Nessuno studio creato: l'import è transazionale.
        org.junit.jupiter.api.Assertions.assertEquals(before, studyCount());
    }

    @Test
    void importRejectsAnEmptyChapterList() throws Exception {
        String body = """
            {"name":"Vuoto","variants":[]}""";
        mockMvc.perform(post("/api/studies/import").contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.field").value("variants"));
    }

    @Test
    void importLichessCreatesANewStudyWithRemoteReference() throws Exception {
        String body = """
            {"name":"Da Lichess","color":"WHITE",
             "sourceProvider":"LICHESS","sourceStudyId":"abcd1234",
             "sourceUrl":"https://lichess.org/study/abcd1234","variants":[
              {"name":"Cap. 1","color":"WHITE","moves":["e4","e5"]}
            ]}""";
        mockMvc.perform(post("/api/studies/import/lichess").contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.name").value("Da Lichess"))
            // ISSUE-016: import/sync Lichess crea sempre uno studio OPENING.
            .andExpect(jsonPath("$.phase").value("OPENING"))
            .andExpect(jsonPath("$.sourceProvider").value("LICHESS"))
            .andExpect(jsonPath("$.sourceStudyId").value("abcd1234"))
            .andExpect(jsonPath("$.lastImportedAt").isNotEmpty())
            .andExpect(jsonPath("$.variantCount").value(1));
    }

    @Test
    void reimportingTheSameLichessStudyUpdatesInsteadOfDuplicating() throws Exception {
        String first = """
            {"name":"Repertorio Lichess","sourceProvider":"LICHESS","sourceStudyId":"sync0001","variants":[
              {"name":"A","color":"WHITE","moves":["e4","e5"]},
              {"name":"B","color":"WHITE","moves":["d4","d5"]}
            ]}""";
        int before = studyCount();
        MvcResult created = mockMvc.perform(
                post("/api/studies/import/lichess").contentType(MediaType.APPLICATION_JSON).content(first))
            .andExpect(status().isCreated())
            .andReturn();
        int id = JsonPath.read(created.getResponse().getContentAsString(), "$.id");
        org.junit.jupiter.api.Assertions.assertEquals(before + 1, studyCount());

        // Re-import dello stesso studio remoto con capitoli diversi → aggiorna, non duplica.
        String second = """
            {"name":"IGNORATO","sourceProvider":"LICHESS","sourceStudyId":"sync0001","variants":[
              {"name":"C","color":"BLACK","moves":["c4","e5"]}
            ]}""";
        mockMvc.perform(post("/api/studies/import/lichess").contentType(MediaType.APPLICATION_JSON).content(second))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(id))
            .andExpect(jsonPath("$.phase").value("OPENING"))
            .andExpect(jsonPath("$.variantCount").value(1))
            .andExpect(jsonPath("$.variants[0].name").value("C"));

        // Nessun duplicato: stesso numero di studi di prima del re-import.
        org.junit.jupiter.api.Assertions.assertEquals(before + 1, studyCount());
    }

    @Test
    void reimportPreservesLocallyEditedMetadata() throws Exception {
        String first = """
            {"name":"Nome Lichess","sourceProvider":"LICHESS","sourceStudyId":"keep0001","variants":[
              {"name":"A","color":"WHITE","moves":["e4"]}
            ]}""";
        MvcResult created = mockMvc.perform(
                post("/api/studies/import/lichess").contentType(MediaType.APPLICATION_JSON).content(first))
            .andExpect(status().isCreated())
            .andReturn();
        int id = JsonPath.read(created.getResponse().getContentAsString(), "$.id");

        // L'utente rinomina lo studio e aggiunge una descrizione locale.
        mockMvc.perform(put("/api/studies/" + id).contentType(MediaType.APPLICATION_JSON).content("""
            {"name":"Nome mio","description":"nota locale","color":"MIXED"}"""))
            .andExpect(status().isOk());

        // Re-import: i metadati locali restano, le varianti vengono sostituite.
        mockMvc.perform(post("/api/studies/import/lichess").contentType(MediaType.APPLICATION_JSON).content("""
            {"name":"Nome Lichess","sourceProvider":"LICHESS","sourceStudyId":"keep0001","variants":[
              {"name":"B","color":"WHITE","moves":["d4"]}
            ]}"""))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.name").value("Nome mio"))
            .andExpect(jsonPath("$.description").value("nota locale"))
            .andExpect(jsonPath("$.color").value("MIXED"))
            .andExpect(jsonPath("$.variants[0].name").value("B"));
    }

    @Test
    void reimportRollsBackWhenAChapterIsIllegal() throws Exception {
        String first = """
            {"name":"Studio","sourceProvider":"LICHESS","sourceStudyId":"roll0001","variants":[
              {"name":"Buono","color":"WHITE","moves":["e4","e5"]}
            ]}""";
        int id = JsonPath.read(mockMvc.perform(
                post("/api/studies/import/lichess").contentType(MediaType.APPLICATION_JSON).content(first))
            .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString(), "$.id");

        // Re-import con un capitolo illegale: deve fallire SENZA toccare le varianti esistenti.
        mockMvc.perform(post("/api/studies/import/lichess").contentType(MediaType.APPLICATION_JSON).content("""
            {"name":"Studio","sourceProvider":"LICHESS","sourceStudyId":"roll0001","variants":[
              {"name":"Nuovo","color":"WHITE","moves":["e4","e5"]},
              {"name":"Illegale","color":"WHITE","moves":["e4","e4"]}
            ]}"""))
            .andExpect(status().isBadRequest());

        // La variante originale è ancora lì: la sostituzione non è avvenuta.
        mockMvc.perform(get("/api/studies/" + id))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.variantCount").value(1))
            .andExpect(jsonPath("$.variants[0].name").value("Buono"));
    }

    @Test
    void deleteAnEmptyStudyReturns204() throws Exception {
        int id = createStudy("""
            {"name":"Vuoto"}""");
        mockMvc.perform(delete("/api/studies/" + id)).andExpect(status().isNoContent());
        mockMvc.perform(get("/api/studies/" + id)).andExpect(status().isNotFound());
    }

    @Test
    void deleteReturns404WhenMissing() throws Exception {
        mockMvc.perform(delete("/api/studies/999999")).andExpect(status().isNotFound());
    }

    @Test
    void deletingTheDefaultStudyCascadesToItsVariants() throws Exception {
        int defaultId = defaultStudyId();

        // Prima della cancellazione le 2 varianti seed esistono.
        mockMvc.perform(get("/api/variants"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(2));

        // Cancellazione a cascata: spariscono studio e varianti associate.
        mockMvc.perform(delete("/api/studies/" + defaultId)).andExpect(status().isNoContent());

        mockMvc.perform(get("/api/studies/" + defaultId)).andExpect(status().isNotFound());
        mockMvc.perform(get("/api/variants"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(0));
    }

    // --- R26.3 (ISSUE-016, change A2): tipologia dello studio Mediogioco ---

    @Test
    void createPersistsATacticalMiddlegameStudy() throws Exception {
        String body = """
            {"name":"Attacchi di scoperta","phase":"MIDDLEGAME","studyType":"TACTICAL"}""";
        mockMvc.perform(post("/api/studies").contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.phase").value("MIDDLEGAME"))
            .andExpect(jsonPath("$.studyType").value("TACTICAL"))
            .andExpect(jsonPath("$.color").doesNotExist());
    }

    @Test
    void createPersistsAStrategicEmptyMiddlegameStudy() throws Exception {
        String body = """
            {"name":"Pianificazione","phase":"MIDDLEGAME","studyType":"STRATEGIC"}""";
        mockMvc.perform(post("/api/studies").contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.studyType").value("STRATEGIC"))
            .andExpect(jsonPath("$.variantCount").value(0));
    }

    @Test
    void createRejectsANewUnclassifiedMiddlegameStudy() throws Exception {
        int before = studyCount();
        String body = """
            {"name":"Senza tipo","phase":"MIDDLEGAME"}""";
        mockMvc.perform(post("/api/studies").contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.field").value("studyType"));

        org.junit.jupiter.api.Assertions.assertEquals(before, studyCount());
    }

    @Test
    void createRejectsAStudyTypeOnAnOpeningStudy() throws Exception {
        String body = """
            {"name":"Apertura con tipo","studyType":"TACTICAL"}""";
        mockMvc.perform(post("/api/studies").contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.field").value("studyType"));
    }

    @Test
    void createRejectsAStudyTypeOnAnEndgameStudy() throws Exception {
        String body = """
            {"name":"Finale con tipo","phase":"ENDGAME","studyType":"STRATEGIC"}""";
        mockMvc.perform(post("/api/studies").contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.field").value("studyType"));
    }

    @Test
    void createRejectsAnInvalidStudyType() throws Exception {
        String body = """
            {"name":"Boh","phase":"MIDDLEGAME","studyType":"BOH"}""";
        mockMvc.perform(post("/api/studies").contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.field").value("studyType"));
    }

    @Test
    void legacyUnclassifiedMiddlegameStudyIsReadableAndEditableWithoutAType() throws Exception {
        int id = saveLegacyUnclassifiedMiddlegameStudy("Mediogioco legacy");

        mockMvc.perform(get("/api/studies/" + id))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.phase").value("MIDDLEGAME"))
            .andExpect(jsonPath("$.studyType").doesNotExist());

        String update = """
            {"name":"Mediogioco legacy rinominato"}""";
        mockMvc.perform(put("/api/studies/" + id).contentType(MediaType.APPLICATION_JSON).content(update))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.name").value("Mediogioco legacy rinominato"))
            .andExpect(jsonPath("$.studyType").doesNotExist());
    }

    @Test
    void classifyingALegacyStudyPersistsTheChoiceAndMakesItImmutable() throws Exception {
        int id = saveLegacyUnclassifiedMiddlegameStudy("Legacy da classificare");

        String classify = """
            {"name":"Legacy classificato","studyType":"STRATEGIC"}""";
        mockMvc.perform(put("/api/studies/" + id).contentType(MediaType.APPLICATION_JSON).content(classify))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.studyType").value("STRATEGIC"));

        // Una seconda transizione verso un altro tipo è rifiutata...
        String change = """
            {"name":"Provo a cambiare","studyType":"TACTICAL"}""";
        mockMvc.perform(put("/api/studies/" + id).contentType(MediaType.APPLICATION_JSON).content(change))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.field").value("studyType"));

        // ...e il tipo persistito resta invariato.
        mockMvc.perform(get("/api/studies/" + id))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.studyType").value("STRATEGIC"));
    }

    @Test
    void updateAcceptingTheSameStudyTypeSucceeds() throws Exception {
        int id = createTacticalMiddlegameStudy("Ripetizione tipo");

        String update = """
            {"name":"Rinominato","studyType":"TACTICAL"}""";
        mockMvc.perform(put("/api/studies/" + id).contentType(MediaType.APPLICATION_JSON).content(update))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.studyType").value("TACTICAL"));
    }

    @Test
    void updateRejectsAStudyTypeOnAnOpeningStudy() throws Exception {
        int id = createStudy("""
            {"name":"Apertura senza tipo"}""");

        String update = """
            {"name":"Provo a classificarla","studyType":"TACTICAL"}""";
        mockMvc.perform(put("/api/studies/" + id).contentType(MediaType.APPLICATION_JSON).content(update))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.field").value("studyType"));
    }

    @Test
    void blocksCreatingAPositionInAnUnclassifiedMiddlegameStudy() throws Exception {
        int id = saveLegacyUnclassifiedMiddlegameStudy("Da classificare per posizioni");

        String variant = """
            {"name":"Posizione","moves":[],"startingFen":"4k3/8/8/8/8/8/8/4K3 w - - 0 1"}""";
        mockMvc.perform(post("/api/studies/" + id + "/variants")
                .contentType(MediaType.APPLICATION_JSON).content(variant))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.field").value("studyType"));

        mockMvc.perform(get("/api/studies/" + id))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.variantCount").value(0));
    }

    @Test
    void allowsCreatingAPositionAfterClassification() throws Exception {
        int id = createTacticalMiddlegameStudy("Classificato per posizioni");

        String variant = """
            {"name":"Posizione","moves":[],"startingFen":"4k3/8/8/8/8/8/8/4K3 w - - 0 1","themeId":1001}""";
        mockMvc.perform(post("/api/studies/" + id + "/variants")
                .contentType(MediaType.APPLICATION_JSON).content(variant))
            .andExpect(status().isCreated());
    }

    private int createTacticalMiddlegameStudy(String name) throws Exception {
        String body = "{\"name\":\"%s\",\"phase\":\"MIDDLEGAME\",\"studyType\":\"TACTICAL\"}".formatted(name);
        return createStudy(body);
    }

    /** Simula una riga Mediogioco preesistente alla R26.3, priva di tipologia. */
    private int saveLegacyUnclassifiedMiddlegameStudy(String name) {
        Study legacy = new Study();
        legacy.setName(name);
        legacy.setPhase(GamePhase.MIDDLEGAME);
        return studyRepository.save(legacy).getId().intValue();
    }

    private int defaultStudyId() throws Exception {
        MvcResult result = mockMvc.perform(get("/api/studies"))
            .andExpect(status().isOk())
            .andReturn();
        return JsonPath.read(result.getResponse().getContentAsString(), "$[0].id");
    }

    private int studyCount() throws Exception {
        MvcResult result = mockMvc.perform(get("/api/studies"))
            .andExpect(status().isOk())
            .andReturn();
        List<?> studies = JsonPath.read(result.getResponse().getContentAsString(), "$");
        return studies.size();
    }

    private int createStudy(String body) throws Exception {
        MvcResult result = mockMvc.perform(
                post("/api/studies").contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isCreated())
            .andReturn();
        return JsonPath.read(result.getResponse().getContentAsString(), "$.id");
    }

    /**
     * Un nuovo Mediogioco richiede la tipologia (R26.3, task 2.2): qui i test che non
     * riguardano la classificazione ricevono un default {@code TACTICAL} per restare
     * concentrati sul proprio comportamento (posizioni, ordine, filtri).
     */
    private int createStudyWithPhase(String name, String phase) throws Exception {
        String type = "MIDDLEGAME".equals(phase) ? ",\"studyType\":\"TACTICAL\"" : "";
        String body = "{\"name\":\"%s\",\"phase\":\"%s\"%s}".formatted(name, phase, type);
        return createStudy(body);
    }
}
