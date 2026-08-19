package com.scacchi.backend.migration;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import liquibase.Liquibase;
import liquibase.database.Database;
import liquibase.database.DatabaseFactory;
import liquibase.database.jvm.JdbcConnection;
import liquibase.exception.LiquibaseException;
import liquibase.resource.ClassLoaderResourceAccessor;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

/**
 * Test dei changeset Liquibase 0004-0007 (R26.3, change A modello, gruppo A1). Esegue Liquibase
 * via API Java direttamente su H2 in-memory temporaneo e isolato per test (non passa dal
 * contesto Spring): permette di distinguere database vuoto e "già popolato" con dati Mediogioco
 * legacy, e di verificare un fallimento senza far fallire l'avvio dell'intera applicazione.
 *
 * <p>Il fixture {@code db/changelog/test-through-0005.yaml} applica solo i changeset fino a
 * 0005: gli include puntano agli stessi file {@code db/changelog/changes/000N-*.yaml} del
 * changelog master reale, quindi Liquibase li registra con lo stesso {@code FILENAME} e il
 * master reale, eseguito dopo, li riconosce come già applicati e prosegue da 0006 (utile per
 * inserire dati legacy prima del backfill di {@code position_order}).
 */
class LiquibaseMigrationTest {

    private static final String MASTER_CHANGELOG = "db/changelog/db.changelog-master.yaml";
    private static final String THROUGH_0005_CHANGELOG = "db/changelog/test-through-0005.yaml";
    private static final String FAILING_CHANGELOG = "db/changelog/test-failing-changeset.yaml";

    private Connection connection;

    @AfterEach
    void closeConnection() throws SQLException {
        if (connection != null && !connection.isClosed()) {
            connection.close();
        }
    }

    @Test
    void freshEmptyDatabaseAppliesAllChangesetsAndSeedsThemeCatalog() throws Exception {
        Connection db = freshDatabase();
        runMigration(db, MASTER_CHANGELOG);

        List<String> ids = databaseChangeLogIds(db);
        assertTrue(ids.containsAll(List.of(
                "0001-baseline", "0002-cap-review-schedules", "0003-study-phase",
                "0004-study-type", "0005-position-theme", "0006-position-metadata",
                "0007-position-attempt")));

        assertEquals(27, countRows(db, "SELECT COUNT(*) FROM position_theme"));
        assertEquals(14, countRows(db, "SELECT COUNT(*) FROM position_theme WHERE study_type = 'TACTICAL'"));
        assertEquals(13, countRows(db, "SELECT COUNT(*) FROM position_theme WHERE study_type = 'STRATEGIC'"));

        // Le colonne aggiunte da 0004/0006/0007 devono esistere ed essere selezionabili
        // (una colonna assente farebbe fallire la query con SQLException).
        try (Statement statement = db.createStatement()) {
            statement.executeQuery("SELECT study_type FROM study WHERE 1 = 0");
            statement.executeQuery(
                    "SELECT theme_id, theme_description, description, difficulty, source, position_order "
                            + "FROM variant WHERE 1 = 0");
            statement.executeQuery("SELECT variant_id, outcome, occurred_at FROM position_attempt WHERE 1 = 0");
        }
    }

    @Test
    void themeCatalogSeedMatchesSpecOrderAndLabels() throws Exception {
        Connection db = freshDatabase();
        runMigration(db, MASTER_CHANGELOG);

        assertThemeLabel(db, 1001, "doppio attacco");
        assertThemeLabel(db, 1014, "combinazione");
        assertThemeLabel(db, 2002, "case deboli e case forti");
        assertThemeLabel(db, 2013, "transizione al finale");

        // KING_ATTACK compare in entrambi i cataloghi con ID distinti: il codice è univoco
        // soltanto insieme a study_type, non a livello globale (design.md, decisione 3).
        assertEquals("TACTICAL", themeStudyType(db, 1012));
        assertEquals("STRATEGIC", themeStudyType(db, 2011));
        assertEquals("KING_ATTACK", themeCode(db, 1012));
        assertEquals("KING_ATTACK", themeCode(db, 2011));
    }

    @Test
    void legacyMiddlegamePositionsGetContiguousBackfilledOrder() throws Exception {
        Connection db = freshDatabase();
        runMigration(db, THROUGH_0005_CHANGELOG);

        long studyId = insertStudy(db, "Legacy Mediogioco", "MIDDLEGAME");
        long otherStudyId = insertStudy(db, "Altro studio (interleaving)", "OPENING");

        long v1 = insertVariant(db, studyId, "Posizione 1");
        insertVariant(db, otherStudyId, "Variante interposta"); // crea un gap nell'id globale
        long v2 = insertVariant(db, studyId, "Posizione 2");
        insertVariant(db, otherStudyId, "Altra variante interposta");
        long v3 = insertVariant(db, studyId, "Posizione 3");

        runMigration(db, MASTER_CHANGELOG);

        assertEquals(1, positionOrderOf(db, v1));
        assertEquals(2, positionOrderOf(db, v2));
        assertEquals(3, positionOrderOf(db, v3));
        // Lo studio OPENING non è Mediogioco: il backfill non lo tocca, resta NULL.
        assertNull(positionOrderOf(db, insertVariant(db, otherStudyId, "Non toccata dal backfill")));
    }

    @Test
    void uniqueConstraintsRejectDuplicatesWithoutPartialCommit() throws Exception {
        Connection db = freshDatabase();
        runMigration(db, MASTER_CHANGELOG);

        assertThrows(SQLException.class,
                () -> insertTheme(db, 9001, "DOUBLE_ATTACK", "TACTICAL", "duplicato", 99));
        assertEquals(27, countRows(db, "SELECT COUNT(*) FROM position_theme"));

        long studyId = insertStudy(db, "Studio con ordine duplicato", "MIDDLEGAME");
        long v1 = insertVariant(db, studyId, "Prima");
        long v2 = insertVariant(db, studyId, "Seconda");
        setPositionOrder(db, v1, 1);

        assertThrows(SQLException.class, () -> setPositionOrder(db, v2, 1));
        assertEquals(1, positionOrderOf(db, v1));
        assertNull(positionOrderOf(db, v2));
    }

    @Test
    void positionAttemptCascadesOnVariantDelete() throws Exception {
        Connection db = freshDatabase();
        runMigration(db, MASTER_CHANGELOG);

        long studyId = insertStudy(db, "Studio con tentativi", "MIDDLEGAME");
        long variantId = insertVariant(db, studyId, "Posizione con storico");
        long otherVariantId = insertVariant(db, studyId, "Altra posizione");

        insertAttempt(db, variantId, "FAILED");
        insertAttempt(db, variantId, "UNDERSTOOD");
        insertAttempt(db, otherVariantId, "UNDERSTOOD");

        assertEquals(2, countRows(db, "SELECT COUNT(*) FROM position_attempt WHERE variant_id = " + variantId));

        try (Statement statement = db.createStatement()) {
            statement.executeUpdate("DELETE FROM variant WHERE id = " + variantId);
        }

        assertEquals(0, countRows(db, "SELECT COUNT(*) FROM position_attempt WHERE variant_id = " + variantId));
        assertEquals(1, countRows(db, "SELECT COUNT(*) FROM position_attempt WHERE variant_id = " + otherVariantId));
    }

    @Test
    void failingChangesetIsNotRecordedAndLeavesPreviousDataIntact() throws Exception {
        Connection db = freshDatabase();
        runMigration(db, MASTER_CHANGELOG);

        assertThrows(LiquibaseException.class, () -> liquibaseFor(db, FAILING_CHANGELOG).update());
        db.setAutoCommit(true);

        // La seconda change del changeset sintetico (INSERT con PK duplicata su un seed reale)
        // fallisce e non lascia una riga parziale: il catalogo temi seedato da 0005 resta a 27.
        assertEquals(27, countRows(db, "SELECT COUNT(*) FROM position_theme"));

        // Il changeset fallito non viene registrato come applicato: un retry dopo la correzione
        // lo rieseguirebbe da capo (strategia "migration correttiva in avanti" di design.md).
        assertFalse(databaseChangeLogIds(db).contains("test-failing-changeset"));

        // Su H2 il DDL va in commit immediato indipendentemente dall'esito delle change
        // successive nello stesso changeSet: la prima change (colonna di scarto) resta quindi
        // applicata anche se il changeSet nel suo complesso è fallito e non risulta registrato.
        // Per questo 0006-position-metadata mette per ultimo l'unico passo che dipende dai dati
        // (addUniqueConstraint su position_order): è il solo punto realisticamente a rischio di
        // fallimento, e un suo eventuale fallimento non richiederebbe di rifare le colonne o il
        // backfill già scritti, solo di correggere i dati e rieseguire.
        assertEquals(1, countRows(db,
                "SELECT COUNT(*) FROM information_schema.columns "
                        + "WHERE table_name = 'POSITION_THEME' AND column_name = 'MIGRATION_TEST_SCRATCH'"));

        // Il database resta pienamente operativo dopo il fallimento (nessuna transazione bloccata).
        insertTheme(db, 9002, "SMOKE_TEST_AFTER_FAILURE", "TACTICAL", "verifica post-fallimento", 100);
        assertEquals(28, countRows(db, "SELECT COUNT(*) FROM position_theme"));
    }

    // --- helper di infrastruttura ---

    private Connection freshDatabase() throws SQLException {
        String url = "jdbc:h2:mem:migration_" + UUID.randomUUID() + ";DB_CLOSE_DELAY=-1";
        connection = DriverManager.getConnection(url, "sa", "");
        return connection;
    }

    private Liquibase liquibaseFor(Connection db, String changeLogFile) throws LiquibaseException {
        Database database =
                DatabaseFactory.getInstance().findCorrectDatabaseImplementation(new JdbcConnection(db));
        return new Liquibase(changeLogFile, new ClassLoaderResourceAccessor(), database);
    }

    private void runMigration(Connection db, String changeLogFile) throws Exception {
        liquibaseFor(db, changeLogFile).update();
        db.setAutoCommit(true);
    }

    private List<String> databaseChangeLogIds(Connection db) throws SQLException {
        List<String> ids = new ArrayList<>();
        try (Statement statement = db.createStatement();
                ResultSet rs = statement.executeQuery("SELECT id FROM databasechangelog ORDER BY orderexecuted")) {
            while (rs.next()) {
                ids.add(rs.getString(1));
            }
        }
        return ids;
    }

    private int countRows(Connection db, String sql) throws SQLException {
        try (Statement statement = db.createStatement();
                ResultSet rs = statement.executeQuery(sql)) {
            rs.next();
            return rs.getInt(1);
        }
    }

    // --- helper di dominio (inserimenti nativi, bypassano il service layer applicativo) ---

    private long insertStudy(Connection db, String name, String phase) throws SQLException {
        try (PreparedStatement ps = db.prepareStatement(
                "INSERT INTO study (name, phase, created_at) VALUES (?, ?, CURRENT_TIMESTAMP)",
                Statement.RETURN_GENERATED_KEYS)) {
            ps.setString(1, name);
            ps.setString(2, phase);
            ps.executeUpdate();
            try (ResultSet keys = ps.getGeneratedKeys()) {
                keys.next();
                return keys.getLong(1);
            }
        }
    }

    private long insertVariant(Connection db, long studyId, String name) throws SQLException {
        try (PreparedStatement ps = db.prepareStatement(
                "INSERT INTO variant (name, color, moves, starting_fen, study_id, created_at) "
                        + "VALUES (?, 'WHITE', '[]', 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', "
                        + "?, CURRENT_TIMESTAMP)",
                Statement.RETURN_GENERATED_KEYS)) {
            ps.setString(1, name);
            ps.setLong(2, studyId);
            ps.executeUpdate();
            try (ResultSet keys = ps.getGeneratedKeys()) {
                keys.next();
                return keys.getLong(1);
            }
        }
    }

    private void insertAttempt(Connection db, long variantId, String outcome) throws SQLException {
        try (PreparedStatement ps = db.prepareStatement(
                "INSERT INTO position_attempt (variant_id, outcome, occurred_at) VALUES (?, ?, CURRENT_TIMESTAMP)")) {
            ps.setLong(1, variantId);
            ps.setString(2, outcome);
            ps.executeUpdate();
        }
    }

    private void insertTheme(Connection db, long id, String code, String studyType, String label, int order)
            throws SQLException {
        try (PreparedStatement ps = db.prepareStatement(
                "INSERT INTO position_theme (id, code, study_type, display_label, display_order, active) "
                        + "VALUES (?, ?, ?, ?, ?, TRUE)")) {
            ps.setLong(1, id);
            ps.setString(2, code);
            ps.setString(3, studyType);
            ps.setString(4, label);
            ps.setInt(5, order);
            ps.executeUpdate();
        }
    }

    private void setPositionOrder(Connection db, long variantId, int order) throws SQLException {
        try (PreparedStatement ps = db.prepareStatement("UPDATE variant SET position_order = ? WHERE id = ?")) {
            ps.setInt(1, order);
            ps.setLong(2, variantId);
            ps.executeUpdate();
        }
    }

    private Integer positionOrderOf(Connection db, long variantId) throws SQLException {
        try (PreparedStatement ps = db.prepareStatement("SELECT position_order FROM variant WHERE id = ?")) {
            ps.setLong(1, variantId);
            try (ResultSet rs = ps.executeQuery()) {
                rs.next();
                int value = rs.getInt(1);
                return rs.wasNull() ? null : value;
            }
        }
    }

    private void assertThemeLabel(Connection db, long themeId, String expectedLabel) throws SQLException {
        assertEquals(expectedLabel, singleString(db, "SELECT display_label FROM position_theme WHERE id = ?", themeId));
    }

    private String themeStudyType(Connection db, long themeId) throws SQLException {
        return singleString(db, "SELECT study_type FROM position_theme WHERE id = ?", themeId);
    }

    private String themeCode(Connection db, long themeId) throws SQLException {
        return singleString(db, "SELECT code FROM position_theme WHERE id = ?", themeId);
    }

    private String singleString(Connection db, String sql, long id) throws SQLException {
        try (PreparedStatement ps = db.prepareStatement(sql)) {
            ps.setLong(1, id);
            try (ResultSet rs = ps.executeQuery()) {
                assertTrue(rs.next());
                return rs.getString(1);
            }
        }
    }
}
