package com.scacchi.backend.attempt;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import com.scacchi.backend.study.GamePhase;
import com.scacchi.backend.study.Study;
import com.scacchi.backend.study.StudyRepository;
import com.scacchi.backend.training.TrainingSessionRepository;
import com.scacchi.backend.variant.Color;
import com.scacchi.backend.variant.Variant;
import com.scacchi.backend.variant.VariantRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

/**
 * ISSUE-016/R26.3 (change A2 modello, task 4.1-4.7): storico e validazione dei
 * tentativi su posizioni Mediogioco.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class PositionAttemptControllerTest {

    private static final String FEN = "4k3/8/8/8/8/8/8/4K3 w - - 0 1";
    /** Ply 1/3 (dispari) = mosse utente; ply 2/4 (pari) = risposte avversarie della mainline. */
    private static final String MAINLINE = "[\"Kd2\",\"Kd8\",\"Kd3\",\"Kd7\"]";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private StudyRepository studyRepository;

    @Autowired
    private VariantRepository variantRepository;

    @Autowired
    private PositionAttemptRepository attemptRepository;

    @Autowired
    private TrainingSessionRepository trainingSessionRepository;

    @Autowired
    private EntityManager entityManager;

    // --- tattica ---

    @Test
    void tacticalSuccessSequenceIsRecordedAsUnderstood() throws Exception {
        int studyId = createClassifiedStudy("Tattica successo", "TACTICAL");
        int variantId = createPosition(studyId, "Posizione", MAINLINE, FEN, 1001);

        mockMvc.perform(post("/api/variants/" + variantId + "/attempts")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"userMoves\":[\"Kd2\",\"Kd3\"]}"))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.variantId").value(variantId))
            .andExpect(jsonPath("$.outcome").value("UNDERSTOOD"))
            .andExpect(jsonPath("$.occurredAt").isNotEmpty());

        assertEquals(1, attemptRepository.count());
    }

    @Test
    void tacticalDeviationIsRecordedAsFailed() throws Exception {
        int studyId = createClassifiedStudy("Tattica deviazione", "TACTICAL");
        int variantId = createPosition(studyId, "Posizione", MAINLINE, FEN, 1001);

        // "Ke2" è legale dalla FEN ma diverge dalla mainline ("Kd2" atteso al ply 1).
        mockMvc.perform(post("/api/variants/" + variantId + "/attempts")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"userMoves\":[\"Ke2\"]}"))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.outcome").value("FAILED"));
    }

    @Test
    void tacticalIncompletePrefixIsRejectedWithoutAnEvent() throws Exception {
        int studyId = createClassifiedStudy("Tattica incompleta", "TACTICAL");
        int variantId = createPosition(studyId, "Posizione", MAINLINE, FEN, 1001);

        // Corretto ma incompleto: manca la mossa utente del ply 3.
        mockMvc.perform(post("/api/variants/" + variantId + "/attempts")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"userMoves\":[\"Kd2\"]}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.field").value("userMoves"));

        assertEquals(0, attemptRepository.count());
    }

    @Test
    void tacticalIllegalMoveIsRejectedWithoutAnEvent() throws Exception {
        int studyId = createClassifiedStudy("Tattica illegale", "TACTICAL");
        int variantId = createPosition(studyId, "Posizione", MAINLINE, FEN, 1001);

        mockMvc.perform(post("/api/variants/" + variantId + "/attempts")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"userMoves\":[\"Qh5\"]}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.field").value("userMoves"))
            .andExpect(jsonPath("$.ply").value(1));

        assertEquals(0, attemptRepository.count());
    }

    @Test
    void tacticalRejectsADeclaredOutcome() throws Exception {
        int studyId = createClassifiedStudy("Tattica esito dichiarato", "TACTICAL");
        int variantId = createPosition(studyId, "Posizione", MAINLINE, FEN, 1001);

        mockMvc.perform(post("/api/variants/" + variantId + "/attempts")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"userMoves\":[\"Kd2\",\"Kd3\"],\"outcome\":\"UNDERSTOOD\"}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.field").value("outcome"));

        assertEquals(0, attemptRepository.count());
    }

    // --- strategia ---

    @Test
    void strategicRecordsUnderstoodOutcome() throws Exception {
        int studyId = createClassifiedStudy("Strategia compresa", "STRATEGIC");
        int variantId = createPosition(studyId, "Posizione", MAINLINE, FEN, 2001);

        mockMvc.perform(post("/api/variants/" + variantId + "/attempts")
                .contentType(MediaType.APPLICATION_JSON).content("{\"outcome\":\"UNDERSTOOD\"}"))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.outcome").value("UNDERSTOOD"));
    }

    @Test
    void strategicRecordsNotUnderstoodOutcome() throws Exception {
        int studyId = createClassifiedStudy("Strategia non compresa", "STRATEGIC");
        int variantId = createPosition(studyId, "Posizione", MAINLINE, FEN, 2001);

        mockMvc.perform(post("/api/variants/" + variantId + "/attempts")
                .contentType(MediaType.APPLICATION_JSON).content("{\"outcome\":\"NOT_UNDERSTOOD\"}"))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.outcome").value("NOT_UNDERSTOOD"));
    }

    @Test
    void strategicRejectsFailedOutcome() throws Exception {
        int studyId = createClassifiedStudy("Strategia failed", "STRATEGIC");
        int variantId = createPosition(studyId, "Posizione", MAINLINE, FEN, 2001);

        mockMvc.perform(post("/api/variants/" + variantId + "/attempts")
                .contentType(MediaType.APPLICATION_JSON).content("{\"outcome\":\"FAILED\"}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.field").value("outcome"));

        assertEquals(0, attemptRepository.count());
    }

    @Test
    void strategicRejectsUserMovesPayload() throws Exception {
        int studyId = createClassifiedStudy("Strategia mosse", "STRATEGIC");
        int variantId = createPosition(studyId, "Posizione", MAINLINE, FEN, 2001);

        mockMvc.perform(post("/api/variants/" + variantId + "/attempts")
                .contentType(MediaType.APPLICATION_JSON).content("{\"userMoves\":[\"Kd2\"]}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.field").value("userMoves"));

        assertEquals(0, attemptRepository.count());
    }

    @Test
    void strategicRejectsAMissingOutcome() throws Exception {
        int studyId = createClassifiedStudy("Strategia mancante", "STRATEGIC");
        int variantId = createPosition(studyId, "Posizione", MAINLINE, FEN, 2001);

        mockMvc.perform(post("/api/variants/" + variantId + "/attempts")
                .contentType(MediaType.APPLICATION_JSON).content("{}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.field").value("outcome"));
    }

    // --- precondizioni: fase, classificazione, bozza, tema ---

    @Test
    void rejectsAttemptOnAnOpeningPosition() throws Exception {
        MvcResult variants = mockMvc.perform(get("/api/variants")).andReturn();
        int variantId = JsonPath.read(variants.getResponse().getContentAsString(), "$[0].id");

        mockMvc.perform(post("/api/variants/" + variantId + "/attempts")
                .contentType(MediaType.APPLICATION_JSON).content("{\"outcome\":\"UNDERSTOOD\"}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.field").value("phase"));
    }

    @Test
    void rejectsAttemptOnAnUnclassifiedStudy() throws Exception {
        Study legacy = new Study();
        legacy.setName("Da classificare");
        legacy.setPhase(GamePhase.MIDDLEGAME);
        long studyId = studyRepository.save(legacy).getId();
        long variantId = saveRawPosition(studyId, "Posizione", java.util.List.of("Kd2", "Kd8"), null, 1);

        mockMvc.perform(post("/api/variants/" + variantId + "/attempts")
                .contentType(MediaType.APPLICATION_JSON).content("{\"userMoves\":[\"Kd2\"]}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.field").value("studyType"));
    }

    @Test
    void rejectsAttemptOnADraftPosition() throws Exception {
        int studyId = createClassifiedStudy("Bozza", "TACTICAL");
        int variantId = createPosition(studyId, "Bozza", "[]", FEN, 1001);

        mockMvc.perform(post("/api/variants/" + variantId + "/attempts")
                .contentType(MediaType.APPLICATION_JSON).content("{\"userMoves\":[]}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.field").value("variantId"));

        assertEquals(0, attemptRepository.count());
    }

    @Test
    void rejectsAttemptOnAPositionWithoutTheme() throws Exception {
        int studyId = createClassifiedStudy("Senza tema", "STRATEGIC");
        long variantId = saveRawPosition((long) studyId, "Legacy", java.util.List.of("Kd2", "Kd8"), null, 1);

        mockMvc.perform(post("/api/variants/" + variantId + "/attempts")
                .contentType(MediaType.APPLICATION_JSON).content("{\"outcome\":\"UNDERSTOOD\"}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.field").value("themeId"));

        assertEquals(0, attemptRepository.count());
    }

    @Test
    void attemptReturns404WhenPositionMissing() throws Exception {
        mockMvc.perform(post("/api/variants/999999/attempts")
                .contentType(MediaType.APPLICATION_JSON).content("{\"outcome\":\"UNDERSTOOD\"}"))
            .andExpect(status().isNotFound());
    }

    @Test
    void listReturns404WhenPositionMissing() throws Exception {
        mockMvc.perform(get("/api/variants/999999/attempts")).andExpect(status().isNotFound());
    }

    @Test
    void summaryReturns404WhenStudyMissing() throws Exception {
        mockMvc.perform(get("/api/studies/999999/attempts/summary")).andExpect(status().isNotFound());
    }

    // --- storico, tie-break, aggregati ---

    @Test
    void listOrdersMostRecentFirstWithIdAsTiebreak() throws Exception {
        int studyId = createClassifiedStudy("Storico", "STRATEGIC");
        int variantId = createPosition(studyId, "Posizione", MAINLINE, FEN, 2001);

        recordStrategic(variantId, "NOT_UNDERSTOOD");
        recordStrategic(variantId, "UNDERSTOOD");

        // Forza lo stesso istante sui due eventi per isolare il tie-break sull'ID (design.md decisione 8).
        entityManager.createNativeQuery(
                "UPDATE position_attempt SET occurred_at = "
                    + "(SELECT MIN(occurred_at) FROM position_attempt WHERE variant_id = :vid) "
                    + "WHERE variant_id = :vid")
            .setParameter("vid", (long) variantId)
            .executeUpdate();
        entityManager.flush();
        entityManager.clear();

        mockMvc.perform(get("/api/variants/" + variantId + "/attempts"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(2))
            .andExpect(jsonPath("$[0].outcome").value("UNDERSTOOD"))
            .andExpect(jsonPath("$[1].outcome").value("NOT_UNDERSTOOD"));
    }

    @Test
    void summaryIncludesNeverAttemptedPositionsAndAggregatesMultipleEvents() throws Exception {
        int studyId = createClassifiedStudy("Riepilogo", "STRATEGIC");
        int attempted = createPosition(studyId, "Tentata", MAINLINE, FEN, 2001);
        int neverAttempted = createPosition(studyId, "Mai tentata", MAINLINE, FEN, 2001);

        recordStrategic(attempted, "NOT_UNDERSTOOD");
        MvcResult second = recordStrategic(attempted, "UNDERSTOOD");
        String lastUnderstoodAt = JsonPath.read(second.getResponse().getContentAsString(), "$.occurredAt");

        mockMvc.perform(get("/api/studies/" + studyId + "/attempts/summary"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(2))
            .andExpect(jsonPath("$[0].variantId").value(attempted))
            .andExpect(jsonPath("$[0].lastOutcome").value("UNDERSTOOD"))
            .andExpect(jsonPath("$[0].attemptCount").value(2))
            .andExpect(jsonPath("$[0].lastUnderstoodAt").value(lastUnderstoodAt))
            .andExpect(jsonPath("$[1].variantId").value(neverAttempted))
            .andExpect(jsonPath("$[1].lastOutcome").doesNotExist())
            .andExpect(jsonPath("$[1].attemptCount").value(0))
            .andExpect(jsonPath("$[1].lastUnderstoodAt").doesNotExist());
    }

    @Test
    void historyAndFutureValidationUseTheCurrentFenAndMainlineAfterAnEdit() throws Exception {
        int studyId = createClassifiedStudy("Modifica posizione", "TACTICAL");
        int variantId = createPosition(studyId, "Posizione", MAINLINE, FEN, 1001);

        mockMvc.perform(post("/api/variants/" + variantId + "/attempts")
                .contentType(MediaType.APPLICATION_JSON).content("{\"userMoves\":[\"Kd2\",\"Kd3\"]}"))
            .andExpect(status().isCreated());

        // L'autore cambia FEN e mainline della posizione.
        String newFen = "3k4/8/8/8/8/8/8/3K4 w - - 0 1";
        String update = """
            {"name":"Posizione","moves":["Ke2","Ke8","Ke3","Ke7"],"startingFen":"%s","themeId":1001}"""
            .formatted(newFen);
        mockMvc.perform(put("/api/variants/" + variantId)
                .contentType(MediaType.APPLICATION_JSON).content(update))
            .andExpect(status().isOk());

        // Lo storico esistente non cambia.
        mockMvc.perform(get("/api/variants/" + variantId + "/attempts"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(1))
            .andExpect(jsonPath("$[0].outcome").value("UNDERSTOOD"));

        // La validazione successiva usa la mainline/FEN correnti, non quelle originali.
        mockMvc.perform(post("/api/variants/" + variantId + "/attempts")
                .contentType(MediaType.APPLICATION_JSON).content("{\"userMoves\":[\"Ke2\",\"Ke3\"]}"))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.outcome").value("UNDERSTOOD"));

        assertEquals(2, attemptRepository.count());
    }

    // --- cascade, assenza di endpoint di modifica/cancellazione, isolamento ---

    @Test
    void deletingAPositionCascadesItsAttempts() throws Exception {
        int studyId = createClassifiedStudy("Cascade posizione", "STRATEGIC");
        int variantId = createPosition(studyId, "Posizione", MAINLINE, FEN, 2001);
        recordStrategic(variantId, "UNDERSTOOD");
        assertEquals(1, attemptRepository.count());

        mockMvc.perform(delete("/api/variants/" + variantId)).andExpect(status().isNoContent());

        assertEquals(0, attemptRepository.count());
    }

    @Test
    void deletingAStudyCascadesThroughPositionsToAttempts() throws Exception {
        int studyId = createClassifiedStudy("Cascade studio", "STRATEGIC");
        int first = createPosition(studyId, "Prima", MAINLINE, FEN, 2001);
        int second = createPosition(studyId, "Seconda", MAINLINE, FEN, 2001);
        recordStrategic(first, "UNDERSTOOD");
        recordStrategic(second, "NOT_UNDERSTOOD");
        assertEquals(2, attemptRepository.count());

        mockMvc.perform(delete("/api/studies/" + studyId)).andExpect(status().isNoContent());

        assertEquals(0, attemptRepository.count());
    }

    @Test
    void noEndpointExistsToModifyOrDeleteASingleAttempt() throws Exception {
        int studyId = createClassifiedStudy("Nessuna modifica", "STRATEGIC");
        int variantId = createPosition(studyId, "Posizione", MAINLINE, FEN, 2001);
        MvcResult created = recordStrategic(variantId, "UNDERSTOOD");
        int attemptId = JsonPath.read(created.getResponse().getContentAsString(), "$.id");

        mockMvc.perform(delete("/api/variants/" + variantId + "/attempts/" + attemptId))
            .andExpect(status().isNotFound());
        mockMvc.perform(put("/api/variants/" + variantId + "/attempts/" + attemptId)
                .contentType(MediaType.APPLICATION_JSON).content("{\"outcome\":\"NOT_UNDERSTOOD\"}"))
            .andExpect(status().isNotFound());

        assertEquals(1, attemptRepository.count());
    }

    @Test
    void middlegameAttemptDoesNotCreateTrainingData() throws Exception {
        int studyId = createClassifiedStudy("Isolamento training", "STRATEGIC");
        int variantId = createPosition(studyId, "Posizione", MAINLINE, FEN, 2001);
        long before = trainingSessionRepository.count();

        recordStrategic(variantId, "UNDERSTOOD");

        assertEquals(before, trainingSessionRepository.count());
        assertEquals(1, attemptRepository.count());
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

    private int createPosition(
        int studyId, String name, String movesJsonArray, String fen, long themeId) throws Exception {
        String body = "{\"name\":\"%s\",\"moves\":%s,\"startingFen\":\"%s\",\"themeId\":%d}"
            .formatted(name, movesJsonArray, fen, themeId);
        MvcResult result = mockMvc.perform(post("/api/studies/" + studyId + "/variants")
                .contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isCreated())
            .andReturn();
        return JsonPath.read(result.getResponse().getContentAsString(), "$.id");
    }

    private MvcResult recordStrategic(int variantId, String outcome) throws Exception {
        return mockMvc.perform(post("/api/variants/" + variantId + "/attempts")
                .contentType(MediaType.APPLICATION_JSON).content("{\"outcome\":\"%s\"}".formatted(outcome)))
            .andExpect(status().isCreated())
            .andReturn();
    }

    /** Simula una posizione Mediogioco (legacy o in studio non classificato), priva di tema. */
    private long saveRawPosition(
        long studyId, String name, java.util.List<String> moves, Long themeId, int order) {
        Variant v = new Variant();
        v.setName(name);
        v.setColor(Color.WHITE);
        v.setMoves(moves);
        v.setTree(java.util.List.of());
        v.setStartingFen(FEN);
        v.setStudyId(studyId);
        v.setThemeId(themeId);
        v.setPositionOrder(order);
        return variantRepository.save(v).getId();
    }
}
