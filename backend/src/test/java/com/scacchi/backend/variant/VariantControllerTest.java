package com.scacchi.backend.variant;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
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
    void createAcceptsLongSourcePgn() throws Exception {
        String longPgn = "[Event \\\"PGN lungo\\\"] "
            + "1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 ".repeat(12)
            + "*";
        String escapedPgn = longPgn.replace("\\", "\\\\").replace("\"", "\\\"");
        String body = """
            {"name":"PGN lungo","color":"WHITE","moves":["e4","e5"],"sourcePgn":"%s"}"""
            .formatted(escapedPgn);

        mockMvc.perform(post("/api/variants").contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.name").value("PGN lungo"))
            .andExpect(jsonPath("$.sourcePgn").value(longPgn));
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

    @Test
    void updateChangesAnExistingVariant() throws Exception {
        String create = """
            {"name":"Da modificare","color":"WHITE","moves":["e4","e5"]}""";
        MvcResult result = mockMvc.perform(
                post("/api/variants").contentType(MediaType.APPLICATION_JSON).content(create))
            .andExpect(status().isCreated())
            .andReturn();
        int id = JsonPath.read(result.getResponse().getContentAsString(), "$.id");

        String update = """
            {"name":"Modificata","color":"BLACK","moves":["d4","d5","c4"]}""";
        mockMvc.perform(put("/api/variants/" + id).contentType(MediaType.APPLICATION_JSON).content(update))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(id))
            .andExpect(jsonPath("$.name").value("Modificata"))
            .andExpect(jsonPath("$.color").value("BLACK"))
            .andExpect(jsonPath("$.moves.length()").value(3));
    }

    @Test
    void createFromTreeDerivesTheMainlineAndReturnsTheTree() throws Exception {
        String body = """
            {"name":"Con varianti","color":"WHITE","tree":[
              {"san":"e4","children":[
                {"san":"e5","children":[{"san":"Nf3","children":[]}]},
                {"san":"c5","children":[]}
              ]}
            ]}""";
        mockMvc.perform(post("/api/variants").contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.moves.length()").value(3))
            .andExpect(jsonPath("$.moves[0]").value("e4"))
            .andExpect(jsonPath("$.moves[2]").value("Nf3"))
            .andExpect(jsonPath("$.tree[0].san").value("e4"))
            .andExpect(jsonPath("$.tree[0].children.length()").value(2))
            .andExpect(jsonPath("$.tree[0].children[1].san").value("c5"));
    }

    @Test
    void updateReturns404WhenMissing() throws Exception {
        String body = """
            {"name":"X","color":"WHITE","moves":["e4"]}""";
        mockMvc.perform(put("/api/variants/999999").contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isNotFound());
    }

    @Test
    void updateRejectsInvalidPayload() throws Exception {
        String body = """
            {"name":"","color":"WHITE","moves":["e4"]}""";
        mockMvc.perform(put("/api/variants/1").contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isBadRequest());
    }
}
