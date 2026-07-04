package com.scacchi.backend.training;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
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
class TrainingSessionControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void recordsACompletedSessionAndReadsItBack() throws Exception {
        int variantId = firstVariantId();
        String body = """
            {"variantId":%d,"result":"COMPLETED","mistakesCount":2,
             "startedAt":"2026-06-27T10:00:00Z","completedAt":"2026-06-27T10:02:30Z","moves":[
              {"ply":1,"expectedSan":"e4","playedSan":"e4","correct":true},
              {"ply":3,"expectedSan":"Nf3","playedSan":"Nc3","correct":false},
              {"ply":3,"expectedSan":"Nf3","playedSan":"Nf3","correct":true}
            ]}""".formatted(variantId);

        MvcResult created = mockMvc.perform(
                post("/api/training-sessions").contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.id").isNumber())
            .andExpect(jsonPath("$.variantId").value(variantId))
            .andExpect(jsonPath("$.studyId").isNumber())
            .andExpect(jsonPath("$.result").value("COMPLETED"))
            .andExpect(jsonPath("$.mistakesCount").value(2))
            .andExpect(jsonPath("$.moveCount").value(3))
            .andReturn();
        int id = JsonPath.read(created.getResponse().getContentAsString(), "$.id");

        // Dettaglio: le mosse tentate sono persistite e rilette in ordine di ply.
        mockMvc.perform(get("/api/training-sessions/" + id))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.moves.length()").value(3))
            .andExpect(jsonPath("$.moves[1].playedSan").value("Nc3"))
            .andExpect(jsonPath("$.moves[1].correct").value(false))
            .andExpect(jsonPath("$.completedAt").value("2026-06-27T10:02:30Z"));
    }

    @Test
    void listsSessionsFilteredByVariant() throws Exception {
        int variantId = firstVariantId();
        createSession(variantId, "COMPLETED", 0);

        mockMvc.perform(get("/api/training-sessions").param("variantId", String.valueOf(variantId)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(1))
            .andExpect(jsonPath("$[0].variantId").value(variantId))
            // la lista è un riepilogo: niente mosse
            .andExpect(jsonPath("$[0].moves").doesNotExist());
    }

    @Test
    void recordsTheMistakeCount() throws Exception {
        int variantId = firstVariantId();
        int id = createSession(variantId, "COMPLETED", 5);
        mockMvc.perform(get("/api/training-sessions/" + id))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.mistakesCount").value(5));
    }

    @Test
    void rejectsAMissingVariant() throws Exception {
        String body = """
            {"result":"COMPLETED","mistakesCount":0}""";
        mockMvc.perform(post("/api/training-sessions").contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.field").value("variantId"));
    }

    @Test
    void rejectsAnInvalidResult() throws Exception {
        int variantId = firstVariantId();
        String body = """
            {"variantId":%d,"result":"BOH","mistakesCount":0}""".formatted(variantId);
        mockMvc.perform(post("/api/training-sessions").contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.field").value("result"));
    }

    @Test
    void returns404ForANonExistentVariant() throws Exception {
        String body = """
            {"variantId":999999,"result":"COMPLETED","mistakesCount":0}""";
        mockMvc.perform(post("/api/training-sessions").contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isNotFound());
    }

    @Test
    void rejectsTrainingForAMiddlegamePosition() throws Exception {
        int variantId = createVariantInStudyWithPhase("MIDDLEGAME");
        String body = """
            {"variantId":%d,"result":"COMPLETED","mistakesCount":0,"moves":[]}""".formatted(variantId);
        mockMvc.perform(post("/api/training-sessions").contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.field").value("variantId"));
    }

    @Test
    void rejectsTrainingForAnEndgamePosition() throws Exception {
        int variantId = createVariantInStudyWithPhase("ENDGAME");
        String body = """
            {"variantId":%d,"result":"COMPLETED","mistakesCount":0,"moves":[]}""".formatted(variantId);
        mockMvc.perform(post("/api/training-sessions").contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.field").value("variantId"));
    }

    /** Crea uno studio della fase indicata con una variante agganciata, e ne restituisce l'id. */
    private int createVariantInStudyWithPhase(String phase) throws Exception {
        String studyBody = "{\"name\":\"Studio %s\",\"phase\":\"%s\"}".formatted(phase, phase);
        MvcResult study = mockMvc.perform(
                post("/api/studies").contentType(MediaType.APPLICATION_JSON).content(studyBody))
            .andExpect(status().isCreated())
            .andReturn();
        int studyId = JsonPath.read(study.getResponse().getContentAsString(), "$.id");

        String variantBody = """
            {"name":"Posizione","color":"WHITE","moves":["e4"]}""";
        MvcResult variant = mockMvc.perform(post("/api/studies/" + studyId + "/variants")
                .contentType(MediaType.APPLICATION_JSON).content(variantBody))
            .andExpect(status().isCreated())
            .andReturn();
        return JsonPath.read(variant.getResponse().getContentAsString(), "$.id");
    }

    private int firstVariantId() throws Exception {
        MvcResult result = mockMvc.perform(get("/api/variants"))
            .andExpect(status().isOk())
            .andReturn();
        return JsonPath.read(result.getResponse().getContentAsString(), "$[0].id");
    }

    private int createSession(int variantId, String result, int mistakes) throws Exception {
        String body = """
            {"variantId":%d,"result":"%s","mistakesCount":%d,"moves":[]}"""
            .formatted(variantId, result, mistakes);
        MvcResult res = mockMvc.perform(
                post("/api/training-sessions").contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isCreated())
            .andReturn();
        return JsonPath.read(res.getResponse().getContentAsString(), "$.id");
    }
}
