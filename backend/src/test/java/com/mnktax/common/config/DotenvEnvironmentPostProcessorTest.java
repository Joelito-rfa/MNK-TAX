package com.mnktax.common.config;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

/**
 * Vérifie la lecture UTF-8 des fichiers .env utilisés en développement local
 * (identifiants SMTP MailerSend notamment).
 */
class DotenvEnvironmentPostProcessorTest {

    @TempDir
    Path directory;

    @Test
    @DisplayName("Lit les valeurs, les commentaires, les quotes et l'UTF-8")
    void readsDotenvFile() throws Exception {
        Path file = directory.resolve(".env.local");
        Files.writeString(file, String.join("\n",
                "# Centre de communication",
                "MAIL_HOST=smtp.mailersend.net",
                "MAIL_PORT=587",
                "export MAIL_USERNAME=MS_exemple@test.mlsender.net",
                "MAIL_PASSWORD=\"mssp.exemple.secret\"",
                "MAIL_FROM_NAME=\"MNK-TAX — Administration fiscale\"",
                "EMPTY=",
                "INVALID_LINE",
                ""), StandardCharsets.UTF_8);

        Map<String, Object> values = DotenvEnvironmentPostProcessor.read(file);

        assertEquals("smtp.mailersend.net", values.get("MAIL_HOST"));
        assertEquals("587", values.get("MAIL_PORT"));
        assertEquals("MS_exemple@test.mlsender.net", values.get("MAIL_USERNAME"));
        assertEquals("mssp.exemple.secret", values.get("MAIL_PASSWORD"));
        assertEquals("MNK-TAX — Administration fiscale", values.get("MAIL_FROM_NAME"));
        assertEquals("", values.get("EMPTY"));
        assertFalse(values.containsKey("INVALID_LINE"));
    }

    @Test
    @DisplayName("Un commentaire de fin de ligne est retiré uniquement hors quotes")
    void stripsTrailingComment() throws Exception {
        Path file = directory.resolve(".env");
        Files.writeString(file, String.join("\n",
                "MAIL_HOST=smtp.example.test # serveur principal",
                "MAIL_FROM_NAME=\"MNK-TAX # Administration\"",
                ""), StandardCharsets.UTF_8);

        Map<String, Object> values = DotenvEnvironmentPostProcessor.read(file);

        assertEquals("smtp.example.test", values.get("MAIL_HOST"));
        assertEquals("MNK-TAX # Administration", values.get("MAIL_FROM_NAME"));
        assertEquals(2, values.size());
    }
}
