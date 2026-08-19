package com.scacchi.backend.theme;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

/**
 * ISSUE-016/R26.3 (change A2, task 2.6): catalogo temi in sola lettura, seedato
 * dal changeset {@code 0005-position-theme} (task 1.3).
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class PositionThemeControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void listReturnsTheFourteenTacticalThemesInCatalogOrder() throws Exception {
        mockMvc.perform(get("/api/position-themes").param("studyType", "TACTICAL"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(14))
            .andExpect(jsonPath("$[0].id").value(1001))
            .andExpect(jsonPath("$[0].code").value("DOUBLE_ATTACK"))
            .andExpect(jsonPath("$[0].studyType").value("TACTICAL"))
            .andExpect(jsonPath("$[0].displayLabel").value("doppio attacco"))
            .andExpect(jsonPath("$[0].displayOrder").value(1))
            .andExpect(jsonPath("$[13].id").value(1014))
            .andExpect(jsonPath("$[13].code").value("COMBINATION"));
    }

    @Test
    void listReturnsTheThirteenStrategicThemesInCatalogOrder() throws Exception {
        mockMvc.perform(get("/api/position-themes").param("studyType", "STRATEGIC"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(13))
            .andExpect(jsonPath("$[0].id").value(2001))
            .andExpect(jsonPath("$[0].code").value("PAWN_STRUCTURE"))
            .andExpect(jsonPath("$[0].studyType").value("STRATEGIC"))
            .andExpect(jsonPath("$[1].displayLabel").value("case deboli e case forti"))
            .andExpect(jsonPath("$[12].code").value("ENDGAME_TRANSITION"));
    }

    @Test
    void sameCodeExistsInBothCatalogsAsDistinctIds() throws Exception {
        mockMvc.perform(get("/api/position-themes").param("studyType", "TACTICAL"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[11].id").value(1012))
            .andExpect(jsonPath("$[11].code").value("KING_ATTACK"));

        mockMvc.perform(get("/api/position-themes").param("studyType", "STRATEGIC"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[10].id").value(2011))
            .andExpect(jsonPath("$[10].code").value("KING_ATTACK"));
    }

    @Test
    void listRejectsAMissingStudyType() throws Exception {
        mockMvc.perform(get("/api/position-themes"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.field").value("studyType"));
    }

    @Test
    void listRejectsAnInvalidStudyType() throws Exception {
        mockMvc.perform(get("/api/position-themes").param("studyType", "BOH"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.field").value("studyType"));
    }
}
