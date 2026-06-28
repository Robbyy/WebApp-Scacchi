package com.scacchi.backend.review;

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
class ReviewControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void completingTrainingSchedulesNextReview() throws Exception {
        int variantId = firstVariantId();
        postSession("""
            {"variantId":%d,"result":"COMPLETED","mistakesCount":0,"moves":[
              {"ply":1,"expectedSan":"e4","playedSan":"e4","correct":true}
            ]}""".formatted(variantId));

        mockMvc.perform(get("/api/reviews/variants/" + variantId))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.variantId").value(variantId))
            .andExpect(jsonPath("$.repetitions").value(1))
            .andExpect(jsonPath("$.intervalDays").value(1))
            .andExpect(jsonPath("$.nextReviewDate").isNotEmpty())
            // Esito positivo: prossima ripetizione domani, quindi non ancora dovuta.
            .andExpect(jsonPath("$.due").value(false));
    }

    @Test
    void manyMistakesMakeVariantDueTodayAndListed() throws Exception {
        int variantId = firstVariantId();
        // Completata ma con molti errori: esito negativo → ripeti oggi.
        postSession("""
            {"variantId":%d,"result":"COMPLETED","mistakesCount":4,"moves":[
              {"ply":1,"expectedSan":"e4","playedSan":"e4","correct":true},
              {"ply":3,"expectedSan":"Nf3","playedSan":"Nc3","correct":false}
            ]}""".formatted(variantId));

        mockMvc.perform(get("/api/reviews/variants/" + variantId))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.intervalDays").value(0))
            .andExpect(jsonPath("$.repetitions").value(0))
            .andExpect(jsonPath("$.due").value(true));

        mockMvc.perform(get("/api/reviews/due"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(1))
            .andExpect(jsonPath("$[0].variantId").value(variantId))
            .andExpect(jsonPath("$[0].variantName").isNotEmpty());
    }

    @Test
    void untrainedVariantHasNoSchedule() throws Exception {
        int variantId = firstVariantId();
        mockMvc.perform(get("/api/reviews/variants/" + variantId))
            .andExpect(status().isNoContent());
        mockMvc.perform(get("/api/reviews/due"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(0));
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
