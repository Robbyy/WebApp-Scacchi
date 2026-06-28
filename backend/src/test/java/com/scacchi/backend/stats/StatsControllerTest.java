package com.scacchi.backend.stats;

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
class StatsControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void variantStatsAggregateSessionsMistakesAndTopMistakes() throws Exception {
        int variantId = firstVariantId();
        // Sessione 1: 1 errore (Nf3 mancata), poi corretta.
        postSession("""
            {"variantId":%d,"result":"COMPLETED","mistakesCount":1,"moves":[
              {"ply":1,"expectedSan":"e4","playedSan":"e4","correct":true},
              {"ply":3,"expectedSan":"Nf3","playedSan":"Nc3","correct":false},
              {"ply":3,"expectedSan":"Nf3","playedSan":"Nf3","correct":true}
            ]}""".formatted(variantId));
        // Sessione 2: 1 errore (Nf3 di nuovo mancata).
        postSession("""
            {"variantId":%d,"result":"COMPLETED","mistakesCount":1,"moves":[
              {"ply":1,"expectedSan":"e4","playedSan":"e4","correct":true},
              {"ply":3,"expectedSan":"Nf3","playedSan":"Bc4","correct":false}
            ]}""".formatted(variantId));

        mockMvc.perform(get("/api/stats/variants/" + variantId))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.sessionCount").value(2))
            .andExpect(jsonPath("$.completedCount").value(2))
            .andExpect(jsonPath("$.totalMistakes").value(2))
            .andExpect(jsonPath("$.avgMistakes").value(1.0))
            // 3 mosse corrette su 5 totali = 0.6
            .andExpect(jsonPath("$.accuracy").value(0.6))
            .andExpect(jsonPath("$.lastTrainedAt").isNotEmpty())
            .andExpect(jsonPath("$.topMistakes[0].expectedSan").value("Nf3"))
            .andExpect(jsonPath("$.topMistakes[0].count").value(2));
    }

    @Test
    void variantWithNoTrainingReturnsZeroedStats() throws Exception {
        int variantId = firstVariantId();
        mockMvc.perform(get("/api/stats/variants/" + variantId))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.sessionCount").value(0))
            .andExpect(jsonPath("$.totalMistakes").value(0))
            .andExpect(jsonPath("$.accuracy").doesNotExist())
            .andExpect(jsonPath("$.topMistakes.length()").value(0));
    }

    @Test
    void studyStatsSumItsVariants() throws Exception {
        MvcResult variants = mockMvc.perform(get("/api/variants")).andReturn();
        String json = variants.getResponse().getContentAsString();
        int variantId = JsonPath.read(json, "$[0].id");
        int studyId = JsonPath.read(json, "$[0].studyId");

        postSession("""
            {"variantId":%d,"result":"COMPLETED","mistakesCount":2,"moves":[
              {"ply":1,"expectedSan":"e4","playedSan":"e4","correct":true}
            ]}""".formatted(variantId));
        postSession("""
            {"variantId":%d,"result":"ABANDONED","mistakesCount":1,"moves":[
              {"ply":1,"expectedSan":"e4","playedSan":"d4","correct":false}
            ]}""".formatted(variantId));

        mockMvc.perform(get("/api/stats/studies/" + studyId))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.studyId").value(studyId))
            .andExpect(jsonPath("$.sessionCount").value(2))
            .andExpect(jsonPath("$.completedCount").value(1))
            .andExpect(jsonPath("$.totalMistakes").value(3))
            // dettaglio per variante: l'unica variante allenata somma allo studio
            .andExpect(jsonPath("$.variants.length()").value(1))
            .andExpect(jsonPath("$.variants[0].variantId").value(variantId))
            .andExpect(jsonPath("$.variants[0].sessionCount").value(2))
            .andExpect(jsonPath("$.variants[0].totalMistakes").value(3));
    }

    private int firstVariantId() throws Exception {
        MvcResult result = mockMvc.perform(get("/api/variants")).andReturn();
        return JsonPath.read(result.getResponse().getContentAsString(), "$[0].id");
    }

    private void postSession(String body) throws Exception {
        mockMvc.perform(post("/api/training-sessions")
                .contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isCreated());
    }
}
