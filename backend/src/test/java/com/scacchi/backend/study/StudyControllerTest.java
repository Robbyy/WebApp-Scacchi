package com.scacchi.backend.study;

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

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class StudyControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void listReturnsTheDefaultStudyWithItsSeededVariants() throws Exception {
        // Il seed crea lo studio di default "Repertorio" e vi aggancia le 2 varianti seed.
        mockMvc.perform(get("/api/studies"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].name").value("Repertorio"))
            .andExpect(jsonPath("$[0].variantCount").value(2))
            .andExpect(jsonPath("$[0].variants").doesNotExist());
    }

    @Test
    void detailReturnsTheStudyWithTheVariantList() throws Exception {
        int defaultId = defaultStudyId();
        mockMvc.perform(get("/api/studies/" + defaultId))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.name").value("Repertorio"))
            .andExpect(jsonPath("$.variantCount").value(2))
            .andExpect(jsonPath("$.variants.length()").value(2))
            .andExpect(jsonPath("$.variants[0].studyId").value(defaultId));
    }

    @Test
    void getByIdReturns404WhenMissing() throws Exception {
        mockMvc.perform(get("/api/studies/999999"))
            .andExpect(status().isNotFound());
    }

    @Test
    void createPersistsAndReturns201() throws Exception {
        String body = """
            {"name":"Siciliana","description":"Repertorio col Nero","color":"BLACK"}""";
        mockMvc.perform(post("/api/studies").contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.id").isNumber())
            .andExpect(jsonPath("$.name").value("Siciliana"))
            .andExpect(jsonPath("$.description").value("Repertorio col Nero"))
            .andExpect(jsonPath("$.color").value("BLACK"))
            .andExpect(jsonPath("$.variantCount").value(0))
            .andExpect(jsonPath("$.createdAt").isNotEmpty());
    }

    @Test
    void createRejectsABlankName() throws Exception {
        String body = """
            {"name":"  ","color":"MIXED"}""";
        mockMvc.perform(post("/api/studies").contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.field").value("name"))
            .andExpect(jsonPath("$.message").isNotEmpty());
    }

    @Test
    void createRejectsAnInvalidColor() throws Exception {
        String body = """
            {"name":"Strano","color":"GREEN"}""";
        mockMvc.perform(post("/api/studies").contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.field").value("color"));
    }

    @Test
    void updateChangesNameDescriptionAndColor() throws Exception {
        int id = createStudy("""
            {"name":"Da rinominare","color":"WHITE"}""");

        String update = """
            {"name":"Rinominato","description":"aggiornata","color":"MIXED"}""";
        mockMvc.perform(put("/api/studies/" + id).contentType(MediaType.APPLICATION_JSON).content(update))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(id))
            .andExpect(jsonPath("$.name").value("Rinominato"))
            .andExpect(jsonPath("$.description").value("aggiornata"))
            .andExpect(jsonPath("$.color").value("MIXED"));
    }

    @Test
    void updateReturns404WhenMissing() throws Exception {
        String body = """
            {"name":"X"}""";
        mockMvc.perform(put("/api/studies/999999").contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isNotFound());
    }

    @Test
    void createsAVariantAlreadyAttachedToTheStudy() throws Exception {
        int studyId = createStudy("""
            {"name":"Con variante"}""");

        String variant = """
            {"name":"Italiana","color":"WHITE","moves":["e4","e5","Nf3"]}""";
        mockMvc.perform(post("/api/studies/" + studyId + "/variants")
                .contentType(MediaType.APPLICATION_JSON).content(variant))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.name").value("Italiana"))
            .andExpect(jsonPath("$.studyId").value(studyId));

        // Compare anche nel dettaglio dello studio.
        mockMvc.perform(get("/api/studies/" + studyId))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.variantCount").value(1))
            .andExpect(jsonPath("$.variants[0].name").value("Italiana"));
    }

    @Test
    void creatingAVariantInAMissingStudyReturns404() throws Exception {
        String variant = """
            {"name":"X","color":"WHITE","moves":["e4"]}""";
        mockMvc.perform(post("/api/studies/999999/variants")
                .contentType(MediaType.APPLICATION_JSON).content(variant))
            .andExpect(status().isNotFound());
    }

    @Test
    void creatingAnIllegalVariantInAStudyReturns400() throws Exception {
        int studyId = createStudy("""
            {"name":"Studio"}""");
        String variant = """
            {"name":"Illegale","color":"WHITE","moves":["e4","e4"]}""";
        mockMvc.perform(post("/api/studies/" + studyId + "/variants")
                .contentType(MediaType.APPLICATION_JSON).content(variant))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.field").value("moves"))
            .andExpect(jsonPath("$.ply").value(2));
    }

    @Test
    void importsAStudyWithMultipleVariants() throws Exception {
        String body = """
            {"name":"Repertorio Lichess","description":"importato","color":"WHITE","variants":[
              {"name":"Cap. 1","color":"WHITE","moves":["e4","e5","Nf3"]},
              {"name":"Cap. 2","color":"WHITE","moves":["d4","d5","c4"]}
            ]}""";
        mockMvc.perform(post("/api/studies/import").contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.name").value("Repertorio Lichess"))
            .andExpect(jsonPath("$.variantCount").value(2))
            .andExpect(jsonPath("$.variants.length()").value(2))
            .andExpect(jsonPath("$.variants[0].name").value("Cap. 1"))
            .andExpect(jsonPath("$.variants[0].studyId").isNumber());
    }

    @Test
    void importRollsBackEntirelyWhenAVariantIsIllegal() throws Exception {
        int before = studyCount();
        String body = """
            {"name":"Import rotto","variants":[
              {"name":"Buono","color":"WHITE","moves":["e4","e5"]},
              {"name":"Illegale","color":"WHITE","moves":["e4","e4"]}
            ]}""";
        mockMvc.perform(post("/api/studies/import").contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.field").value("moves"));

        // Nessuno studio creato: l'import è transazionale.
        org.junit.jupiter.api.Assertions.assertEquals(before, studyCount());
    }

    @Test
    void importRejectsAnEmptyChapterList() throws Exception {
        String body = """
            {"name":"Vuoto","variants":[]}""";
        mockMvc.perform(post("/api/studies/import").contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.field").value("variants"));
    }

    @Test
    void deleteAnEmptyStudyReturns204() throws Exception {
        int id = createStudy("""
            {"name":"Vuoto"}""");
        mockMvc.perform(delete("/api/studies/" + id)).andExpect(status().isNoContent());
        mockMvc.perform(get("/api/studies/" + id)).andExpect(status().isNotFound());
    }

    @Test
    void deleteReturns404WhenMissing() throws Exception {
        mockMvc.perform(delete("/api/studies/999999")).andExpect(status().isNotFound());
    }

    @Test
    void deletingTheDefaultStudyCascadesToItsVariants() throws Exception {
        int defaultId = defaultStudyId();

        // Prima della cancellazione le 2 varianti seed esistono.
        mockMvc.perform(get("/api/variants"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(2));

        // Cancellazione a cascata: spariscono studio e varianti associate.
        mockMvc.perform(delete("/api/studies/" + defaultId)).andExpect(status().isNoContent());

        mockMvc.perform(get("/api/studies/" + defaultId)).andExpect(status().isNotFound());
        mockMvc.perform(get("/api/variants"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(0));
    }

    private int defaultStudyId() throws Exception {
        MvcResult result = mockMvc.perform(get("/api/studies"))
            .andExpect(status().isOk())
            .andReturn();
        return JsonPath.read(result.getResponse().getContentAsString(), "$[0].id");
    }

    private int studyCount() throws Exception {
        MvcResult result = mockMvc.perform(get("/api/studies"))
            .andExpect(status().isOk())
            .andReturn();
        List<?> studies = JsonPath.read(result.getResponse().getContentAsString(), "$");
        return studies.size();
    }

    private int createStudy(String body) throws Exception {
        MvcResult result = mockMvc.perform(
                post("/api/studies").contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isCreated())
            .andReturn();
        return JsonPath.read(result.getResponse().getContentAsString(), "$.id");
    }
}
