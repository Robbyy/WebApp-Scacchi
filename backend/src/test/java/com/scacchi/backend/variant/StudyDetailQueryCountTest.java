package com.scacchi.backend.variant;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import jakarta.persistence.EntityManagerFactory;
import java.util.ArrayList;
import java.util.List;
import org.hibernate.SessionFactory;
import org.hibernate.stat.Statistics;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

/**
 * Il dettaglio di uno studio non deve costare una interrogazione per posizione
 * (ISSUE-016/R26.3): il catalogo temi si risolve in blocco e lo studio non viene
 * riletto solo per conoscerne la fase. Senza un vincolo esplicito l'N+1 rientra
 * in silenzio, perché non cambia nessuna risposta — solo il numero di query.
 *
 * <p>Volutamente <b>non</b> {@code @Transactional}: con una sola persistence
 * context aperta sull'intero test la cache di primo livello nasconderebbe
 * proprio le query da contare. Le righe create vengono quindi rimosse a mano,
 * per non lasciare studi e varianti agli altri test che condividono l'H2.
 */
@SpringBootTest
@AutoConfigureMockMvc
class StudyDetailQueryCountTest {

    private static final String FEN = "4k3/8/8/8/8/8/8/4K3 w - - 0 1";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private EntityManagerFactory entityManagerFactory;

    private final List<Integer> createdStudyIds = new ArrayList<>();

    @AfterEach
    void removeCreatedStudies() throws Exception {
        for (int studyId : createdStudyIds) {
            mockMvc.perform(delete("/api/studies/" + studyId)).andExpect(status().isNoContent());
        }
        createdStudyIds.clear();
    }

    @Test
    void studyDetailCostDoesNotGrowWithThePositionCount() throws Exception {
        long few = queriesForStudyDetail(2);
        long many = queriesForStudyDetail(8);

        assertEquals(few, many,
            "Il dettaglio di uno studio deve costare lo stesso numero di query a "
                + "prescindere dalle posizioni: " + few + " con 2 posizioni, " + many
                + " con 8. Una crescita indica il rientro dell'N+1 sul catalogo temi.");
    }

    /** Query preparate dalla sola `GET /api/studies/{id}` di uno studio con N posizioni. */
    private long queriesForStudyDetail(int positions) throws Exception {
        int studyId = createClassifiedStudy(positions);
        Statistics statistics = entityManagerFactory.unwrap(SessionFactory.class).getStatistics();
        statistics.clear();

        mockMvc.perform(get("/api/studies/" + studyId)).andExpect(status().isOk());

        return statistics.getPrepareStatementCount();
    }

    private int createClassifiedStudy(int positions) throws Exception {
        MvcResult created = mockMvc.perform(post("/api/studies")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Conteggio query\",\"phase\":\"MIDDLEGAME\","
                    + "\"studyType\":\"TACTICAL\"}"))
            .andExpect(status().isCreated())
            .andReturn();
        int studyId = JsonPath.read(created.getResponse().getContentAsString(), "$.id");
        createdStudyIds.add(studyId);

        for (int i = 1; i <= positions; i++) {
            String body = ("{\"name\":\"Posizione %d\",\"moves\":[\"Kd2\"],\"startingFen\":\"%s\","
                + "\"themeId\":1001}").formatted(i, FEN);
            mockMvc.perform(post("/api/studies/" + studyId + "/variants")
                    .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated());
        }
        return studyId;
    }
}
