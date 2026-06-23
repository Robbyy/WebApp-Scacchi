package com.scacchi.backend.variant;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(VariantController.class)
@Import(VariantService.class)
class VariantControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void listReturnsAllVariants() throws Exception {
        mockMvc.perform(get("/api/variants"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(2))
            .andExpect(jsonPath("$[0].name").value("Partita Italiana"));
    }

    @Test
    void getByIdReturnsVariantWithMoves() throws Exception {
        mockMvc.perform(get("/api/variants/1"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(1))
            .andExpect(jsonPath("$.color").value("WHITE"))
            .andExpect(jsonPath("$.moves[0]").value("e4"))
            .andExpect(jsonPath("$.moves[1]").value("e5"));
    }

    @Test
    void getByIdReturns404WhenMissing() throws Exception {
        mockMvc.perform(get("/api/variants/999"))
            .andExpect(status().isNotFound());
    }
}
