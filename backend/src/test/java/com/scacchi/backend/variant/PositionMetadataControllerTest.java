package com.scacchi.backend.variant;

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

/**
 * ISSUE-016/R26.3 (change A2 modello, task 3.1-3.6): metadati di studio guidato
 * sulle posizioni Mediogioco (tema, descrizioni, difficoltà, fonte, ordine).
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class PositionMetadataControllerTest {

    private static final String FEN = "4k3/8/8/8/8/8/8/4K3 w - - 0 1";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private VariantRepository variantRepository;

    // --- round-trip metadati ---

    @Test
    void createRoundTripsAllMetadataAndDerivesEligibility() throws Exception {
        int studyId = createClassifiedStudy("Round-trip", "TACTICAL");
        String body = """
            {"name":"Matto in due","moves":["Kd2"],"startingFen":"%s",
             "themeId":1001,"themeDescription":"doppio attacco su re e torre",
             "description":"Esercizio introduttivo","difficulty":"EASY","source":"Manuale personale"}"""
            .formatted(FEN);

        MvcResult created = mockMvc.perform(post("/api/studies/" + studyId + "/variants")
                .contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.themeId").value(1001))
            .andExpect(jsonPath("$.theme.id").value(1001))
            .andExpect(jsonPath("$.theme.code").value("DOUBLE_ATTACK"))
            .andExpect(jsonPath("$.theme.studyType").value("TACTICAL"))
            .andExpect(jsonPath("$.theme.displayLabel").value("doppio attacco"))
            .andExpect(jsonPath("$.themeDescription").value("doppio attacco su re e torre"))
            .andExpect(jsonPath("$.description").value("Esercizio introduttivo"))
            .andExpect(jsonPath("$.difficulty").value("EASY"))
            .andExpect(jsonPath("$.source").value("Manuale personale"))
            .andExpect(jsonPath("$.positionOrder").value(1))
            .andExpect(jsonPath("$.eligibleForGuidedStudy").value(true))
            .andReturn();
        int id = JsonPath.read(created.getResponse().getContentAsString(), "$.id");

        // Rilettura indipendente: tutti i metadati sopravvivono al round-trip.
        mockMvc.perform(get("/api/variants/" + id))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.themeId").value(1001))
            .andExpect(jsonPath("$.theme.code").value("DOUBLE_ATTACK"))
            .andExpect(jsonPath("$.themeDescription").value("doppio attacco su re e torre"))
            .andExpect(jsonPath("$.description").value("Esercizio introduttivo"))
            .andExpect(jsonPath("$.difficulty").value("EASY"))
            .andExpect(jsonPath("$.source").value("Manuale personale"))
            .andExpect(jsonPath("$.positionOrder").value(1))
            .andExpect(jsonPath("$.eligibleForGuidedStudy").value(true));
    }

    // --- cinque difficoltà ---

    @Test
    void acceptsAllFiveDifficultyLevels() throws Exception {
        int studyId = createClassifiedStudy("Difficoltà", "TACTICAL");
        for (Difficulty difficulty : Difficulty.values()) {
            String body = """
                {"name":"Posizione %s","moves":[],"startingFen":"%s","themeId":1001,"difficulty":"%s"}"""
                .formatted(difficulty, FEN, difficulty);
            mockMvc.perform(post("/api/studies/" + studyId + "/variants")
                    .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.difficulty").value(difficulty.name()));
        }
    }

    @Test
    void createRejectsAnInvalidDifficulty() throws Exception {
        int studyId = createClassifiedStudy("Difficoltà invalida", "TACTICAL");
        String body = """
            {"name":"Boh","moves":[],"startingFen":"%s","themeId":1001,"difficulty":"BOH"}"""
            .formatted(FEN);
        mockMvc.perform(post("/api/studies/" + studyId + "/variants")
                .contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.field").value("difficulty"));
    }

    // --- tema: obbligo, compatibilità, cambio ---

    @Test
    void createRejectsAPositionWithoutTheme() throws Exception {
        int studyId = createClassifiedStudy("Senza tema", "TACTICAL");
        String body = """
            {"name":"Senza tema","moves":[],"startingFen":"%s"}""".formatted(FEN);
        mockMvc.perform(post("/api/studies/" + studyId + "/variants")
                .contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.field").value("themeId"));

        mockMvc.perform(get("/api/studies/" + studyId))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.variantCount").value(0));
    }

    @Test
    void createRejectsAThemeOfTheOtherStudyType() throws Exception {
        int studyId = createClassifiedStudy("Tema incompatibile", "TACTICAL");
        // 2001 è PAWN_STRUCTURE (STRATEGIC): incompatibile con uno studio TACTICAL.
        String body = """
            {"name":"Sbagliato","moves":[],"startingFen":"%s","themeId":2001}""".formatted(FEN);
        mockMvc.perform(post("/api/studies/" + studyId + "/variants")
                .contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.field").value("themeId"));

        mockMvc.perform(get("/api/studies/" + studyId))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.variantCount").value(0));
    }

    @Test
    void createRejectsANonExistentTheme() throws Exception {
        int studyId = createClassifiedStudy("Tema inesistente", "STRATEGIC");
        String body = """
            {"name":"Sbagliato","moves":[],"startingFen":"%s","themeId":999999}""".formatted(FEN);
        mockMvc.perform(post("/api/studies/" + studyId + "/variants")
                .contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.field").value("themeId"));
    }

    @Test
    void updateChangesToAnotherCompatibleThemePreservingOtherMetadataAndHistory() throws Exception {
        int studyId = createClassifiedStudy("Cambio tema", "TACTICAL");
        String create = """
            {"name":"Prima","moves":["Kd2"],"startingFen":"%s",
             "themeId":1001,"description":"nota","difficulty":"EASY"}""".formatted(FEN);
        MvcResult result = mockMvc.perform(post("/api/studies/" + studyId + "/variants")
                .contentType(MediaType.APPLICATION_JSON).content(create))
            .andExpect(status().isCreated())
            .andReturn();
        int id = JsonPath.read(result.getResponse().getContentAsString(), "$.id");

        String update = """
            {"name":"Prima","moves":["Kd2"],"startingFen":"%s",
             "themeId":1002,"description":"nota","difficulty":"EASY"}""".formatted(FEN);
        mockMvc.perform(put("/api/variants/" + id).contentType(MediaType.APPLICATION_JSON).content(update))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.themeId").value(1002))
            .andExpect(jsonPath("$.theme.code").value("PIN"))
            .andExpect(jsonPath("$.description").value("nota"))
            .andExpect(jsonPath("$.difficulty").value("EASY"))
            .andExpect(jsonPath("$.startingFen").value(FEN));
    }

    // --- posizione legacy senza tema ---

    @Test
    void legacyPositionWithoutThemeIsReadableAndEditableWithoutForcingATheme() throws Exception {
        int studyId = createClassifiedStudy("Legacy senza tema", "STRATEGIC");
        long variantId = saveLegacyPositionWithoutTheme(studyId, "Posizione legacy", 1);

        mockMvc.perform(get("/api/variants/" + variantId))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.themeId").doesNotExist())
            .andExpect(jsonPath("$.theme").doesNotExist())
            .andExpect(jsonPath("$.eligibleForGuidedStudy").value(false));

        String update = """
            {"name":"Posizione legacy rinominata","moves":[],"startingFen":"%s"}""".formatted(FEN);
        mockMvc.perform(put("/api/variants/" + variantId)
                .contentType(MediaType.APPLICATION_JSON).content(update))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.name").value("Posizione legacy rinominata"))
            .andExpect(jsonPath("$.themeId").doesNotExist());
    }

    @Test
    void legacyPositionCanLaterReceiveACompatibleTheme() throws Exception {
        int studyId = createClassifiedStudy("Assegna tema", "STRATEGIC");
        long variantId = saveLegacyPositionWithoutTheme(studyId, "Da assegnare", 1);

        String update = """
            {"name":"Da assegnare","moves":["Kd2"],"startingFen":"%s","themeId":2001}"""
            .formatted(FEN);
        mockMvc.perform(put("/api/variants/" + variantId)
                .contentType(MediaType.APPLICATION_JSON).content(update))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.themeId").value(2001))
            .andExpect(jsonPath("$.eligibleForGuidedStudy").value(true));
    }

    // --- Apertura/Finale: contratti invariati ---

    @Test
    void openingVariantsIgnoreMiddlegameMetadataFields() throws Exception {
        String body = """
            {"name":"Apertura con metadati estranei","color":"WHITE","moves":["e4","e5"],
             "themeId":1001,"difficulty":"EASY"}""";
        mockMvc.perform(post("/api/variants").contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.themeId").doesNotExist())
            .andExpect(jsonPath("$.theme").doesNotExist())
            .andExpect(jsonPath("$.difficulty").doesNotExist())
            .andExpect(jsonPath("$.positionOrder").doesNotExist());
    }

    // --- ordine: default, inserimento, range ---

    @Test
    void newPositionsAppendAtTheEndByDefault() throws Exception {
        int studyId = createClassifiedStudy("Ordine default", "TACTICAL");
        int first = createPositionReturningId(studyId, "Prima", null);
        int second = createPositionReturningId(studyId, "Seconda", null);
        int third = createPositionReturningId(studyId, "Terza", null);

        mockMvc.perform(get("/api/studies/" + studyId))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.variants.length()").value(3))
            .andExpect(jsonPath("$.variants[0].id").value(first))
            .andExpect(jsonPath("$.variants[0].positionOrder").value(1))
            .andExpect(jsonPath("$.variants[1].id").value(second))
            .andExpect(jsonPath("$.variants[1].positionOrder").value(2))
            .andExpect(jsonPath("$.variants[2].id").value(third))
            .andExpect(jsonPath("$.variants[2].positionOrder").value(3));
    }

    @Test
    void insertingAtAnExplicitOrderShiftsSubsequentPositions() throws Exception {
        int studyId = createClassifiedStudy("Inserimento", "TACTICAL");
        int first = createPositionReturningId(studyId, "Prima", null);
        int second = createPositionReturningId(studyId, "Seconda", null);
        int inserted = createPositionReturningId(studyId, "Inserita", 2);

        mockMvc.perform(get("/api/studies/" + studyId))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.variants.length()").value(3))
            .andExpect(jsonPath("$.variants[0].id").value(first))
            .andExpect(jsonPath("$.variants[0].positionOrder").value(1))
            .andExpect(jsonPath("$.variants[1].id").value(inserted))
            .andExpect(jsonPath("$.variants[1].positionOrder").value(2))
            .andExpect(jsonPath("$.variants[2].id").value(second))
            .andExpect(jsonPath("$.variants[2].positionOrder").value(3));
    }

    @Test
    void createRejectsAnOutOfRangePositionOrder() throws Exception {
        int studyId = createClassifiedStudy("Ordine fuori range", "TACTICAL");
        createPositionReturningId(studyId, "Unica", null);
        String body = """
            {"name":"Fuori range","moves":[],"startingFen":"%s","themeId":1001,"positionOrder":5}"""
            .formatted(FEN);
        mockMvc.perform(post("/api/studies/" + studyId + "/variants")
                .contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.field").value("positionOrder"));
    }

    // --- eliminazione con compattazione ---

    @Test
    void deletingAPositionCompactsRemainingOrders() throws Exception {
        int studyId = createClassifiedStudy("Eliminazione", "TACTICAL");
        int first = createPositionReturningId(studyId, "Prima", null);
        int second = createPositionReturningId(studyId, "Seconda", null);
        int third = createPositionReturningId(studyId, "Terza", null);

        mockMvc.perform(delete("/api/variants/" + second)).andExpect(status().isNoContent());

        mockMvc.perform(get("/api/studies/" + studyId))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.variants.length()").value(2))
            .andExpect(jsonPath("$.variants[0].id").value(first))
            .andExpect(jsonPath("$.variants[0].positionOrder").value(1))
            .andExpect(jsonPath("$.variants[1].id").value(third))
            .andExpect(jsonPath("$.variants[1].positionOrder").value(2));
    }

    // --- riordino atomico ---

    @Test
    void reorderAppliesTheRequestedPermutationAtomically() throws Exception {
        int studyId = createClassifiedStudy("Riordino", "TACTICAL");
        int first = createPositionReturningId(studyId, "Prima", null);
        int second = createPositionReturningId(studyId, "Seconda", null);
        int third = createPositionReturningId(studyId, "Terza", null);

        String body = "{\"variantIds\":[%d,%d,%d]}".formatted(third, first, second);
        mockMvc.perform(put("/api/studies/" + studyId + "/variants/order")
                .contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].id").value(third))
            .andExpect(jsonPath("$[0].positionOrder").value(1))
            .andExpect(jsonPath("$[1].id").value(first))
            .andExpect(jsonPath("$[1].positionOrder").value(2))
            .andExpect(jsonPath("$[2].id").value(second))
            .andExpect(jsonPath("$[2].positionOrder").value(3));

        mockMvc.perform(get("/api/studies/" + studyId))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.variants[0].id").value(third))
            .andExpect(jsonPath("$.variants[1].id").value(first))
            .andExpect(jsonPath("$.variants[2].id").value(second));
    }

    @Test
    void reorderReturns404WhenStudyMissing() throws Exception {
        mockMvc.perform(put("/api/studies/999999/variants/order")
                .contentType(MediaType.APPLICATION_JSON).content("{\"variantIds\":[]}"))
            .andExpect(status().isNotFound());
    }

    @Test
    void reorderRejectsAnIncompletePayloadAndKeepsThePreviousOrder() throws Exception {
        int studyId = createClassifiedStudy("Riordino incompleto", "TACTICAL");
        int first = createPositionReturningId(studyId, "Prima", null);
        int second = createPositionReturningId(studyId, "Seconda", null);

        String body = "{\"variantIds\":[%d]}".formatted(second);
        mockMvc.perform(put("/api/studies/" + studyId + "/variants/order")
                .contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.field").value("variantIds"));

        mockMvc.perform(get("/api/studies/" + studyId))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.variants[0].id").value(first))
            .andExpect(jsonPath("$.variants[0].positionOrder").value(1))
            .andExpect(jsonPath("$.variants[1].id").value(second))
            .andExpect(jsonPath("$.variants[1].positionOrder").value(2));
    }

    @Test
    void reorderRejectsADuplicateIdAndKeepsThePreviousOrder() throws Exception {
        int studyId = createClassifiedStudy("Riordino duplicato", "TACTICAL");
        int first = createPositionReturningId(studyId, "Prima", null);
        int second = createPositionReturningId(studyId, "Seconda", null);

        String body = "{\"variantIds\":[%d,%d]}".formatted(first, first);
        mockMvc.perform(put("/api/studies/" + studyId + "/variants/order")
                .contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.field").value("variantIds"));

        mockMvc.perform(get("/api/studies/" + studyId))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.variants[0].id").value(first))
            .andExpect(jsonPath("$.variants[1].id").value(second));
    }

    @Test
    void reorderRejectsAForeignIdAndKeepsThePreviousOrder() throws Exception {
        int studyId = createClassifiedStudy("Riordino estraneo", "TACTICAL");
        int first = createPositionReturningId(studyId, "Prima", null);
        int otherStudyId = createClassifiedStudy("Altro studio", "STRATEGIC");
        int foreign = createPositionReturningId(otherStudyId, "Estranea", null, 2001);

        String body = "{\"variantIds\":[%d]}".formatted(foreign);
        mockMvc.perform(put("/api/studies/" + studyId + "/variants/order")
                .contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.field").value("variantIds"));

        mockMvc.perform(get("/api/studies/" + studyId))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.variants[0].id").value(first))
            .andExpect(jsonPath("$.variants[0].positionOrder").value(1));
    }

    // --- helper ---

    private int createClassifiedStudy(String name, String studyType) throws Exception {
        String body = "{\"name\":\"%s\",\"phase\":\"MIDDLEGAME\",\"studyType\":\"%s\"}"
            .formatted(name, studyType);
        MvcResult result = mockMvc.perform(
                post("/api/studies").contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isCreated())
            .andReturn();
        return JsonPath.read(result.getResponse().getContentAsString(), "$.id");
    }

    private int createPositionReturningId(int studyId, String name, Integer order) throws Exception {
        return createPositionReturningId(studyId, name, order, 1001);
    }

    private int createPositionReturningId(
        int studyId, String name, Integer order, long themeId) throws Exception {
        String orderField = order == null ? "" : ",\"positionOrder\":" + order;
        String body = "{\"name\":\"%s\",\"moves\":[],\"startingFen\":\"%s\",\"themeId\":%d%s}"
            .formatted(name, FEN, themeId, orderField);
        MvcResult result = mockMvc.perform(post("/api/studies/" + studyId + "/variants")
                .contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isCreated())
            .andReturn();
        return JsonPath.read(result.getResponse().getContentAsString(), "$.id");
    }

    /** Simula una posizione Mediogioco preesistente alla R26.3, priva di tema. */
    private long saveLegacyPositionWithoutTheme(int studyId, String name, int order) {
        Variant legacy = new Variant();
        legacy.setName(name);
        legacy.setColor(Color.WHITE);
        legacy.setMoves(List.of());
        legacy.setTree(List.of());
        legacy.setStartingFen(FEN);
        legacy.setStudyId((long) studyId);
        legacy.setPositionOrder(order);
        return variantRepository.save(legacy).getId();
    }
}
