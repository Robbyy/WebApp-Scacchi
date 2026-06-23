package com.scacchi.backend.variant;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
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
class VariantControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void listReturnsSeededVariants() throws Exception {
        mockMvc.perform(get("/api/variants"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(2))
            .andExpect(jsonPath("$[0].name").value("Partita Italiana"));
    }

    @Test
    void getByIdReturns404WhenMissing() throws Exception {
        mockMvc.perform(get("/api/variants/999999"))
            .andExpect(status().isNotFound());
    }

    @Test
    void createPersistsAndReturns201() throws Exception {
        String body = """
            {"name":"Test apertura","color":"WHITE","moves":["e4","e5","Nf3"]}""";
        mockMvc.perform(post("/api/variants").contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.id").isNumber())
            .andExpect(jsonPath("$.name").value("Test apertura"))
            .andExpect(jsonPath("$.moves.length()").value(3))
            .andExpect(jsonPath("$.createdAt").isNotEmpty());
    }

    @Test
    void createRejectsInvalidPayload() throws Exception {
        String body = """
            {"name":"","color":"WHITE","moves":["e4"]}""";
        mockMvc.perform(post("/api/variants").contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isBadRequest());
    }

    @Test
    void deleteRemovesAnExistingVariant() throws Exception {
        String body = """
            {"name":"Da cancellare","color":"BLACK","moves":["e4","c5"]}""";
        MvcResult result = mockMvc.perform(
                post("/api/variants").contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isCreated())
            .andReturn();
        int id = JsonPath.read(result.getResponse().getContentAsString(), "$.id");

        mockMvc.perform(delete("/api/variants/" + id)).andExpect(status().isNoContent());
        mockMvc.perform(get("/api/variants/" + id)).andExpect(status().isNotFound());
    }

    @Test
    void deleteReturns404WhenMissing() throws Exception {
        mockMvc.perform(delete("/api/variants/999999")).andExpect(status().isNotFound());
    }
}
