package com.mnktax.common.config;

import org.apache.commons.logging.Log;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.boot.logging.DeferredLogFactory;
import org.springframework.core.Ordered;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;
import org.springframework.core.env.Profiles;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Chargement des fichiers {@code .env} / {@code .env.local} en développement.
 *
 * <p>Spring Boot ne lit pas les fichiers « dotenv » nativement. Sans ce
 * post-processeur, les identifiants SMTP placés dans {@code .env.local}
 * (MAIL_HOST, MAIL_USERNAME, MAIL_PASSWORD…) étaient ignorés : l'application
 * démarrait en mode démonstration et aucun email réel n'était envoyé.</p>
 *
 * <p>Règles appliquées :</p>
 * <ul>
 *   <li>chargement uniquement avec le profil {@code dev} (jamais en prod/test) ;</li>
 *   <li>lecture UTF-8 (les accents et tirets longs des libellés sont préservés) ;</li>
 *   <li>{@code .env.local} prioritaire sur {@code .env} ;</li>
 *   <li>les variables d'environnement du système et la configuration Spring
 *       gardent la priorité (source ajoutée en dernier).</li>
 * </ul>
 */
public class DotenvEnvironmentPostProcessor implements EnvironmentPostProcessor, Ordered {

    private static final String SOURCE_NAME = "dotenvFiles";

    private final Log log;

    public DotenvEnvironmentPostProcessor(DeferredLogFactory logFactory) {
        this.log = logFactory.getLog(DotenvEnvironmentPostProcessor.class);
    }

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        if (!environment.acceptsProfiles(Profiles.of("dev"))) {
            return;
        }

        Map<String, Object> values = new LinkedHashMap<>();
        // Le répertoire courant (racine du projet ou backend/) puis son parent :
        // couvre `mvnw spring-boot:run` depuis backend/ comme depuis la racine.
        for (Path directory : candidateDirectories()) {
            readInto(directory.resolve(".env"), values);
            readInto(directory.resolve(".env.local"), values);
        }
        if (values.isEmpty()) {
            return;
        }

        // addLast : l'environnement du système reste prioritaire sur les fichiers.
        environment.getPropertySources().addLast(new MapPropertySource(SOURCE_NAME, values));
        log.info("Fichiers .env/.env.local chargés (" + values.size()
                + " variables ; priorité : variables système > fichiers).");
    }

    private static List<Path> candidateDirectories() {
        List<Path> directories = new ArrayList<>();
        Path current = Path.of("").toAbsolutePath().normalize();
        directories.add(current);
        Path parent = current.getParent();
        if (parent != null) {
            directories.add(parent);
        }
        return directories;
    }

    private void readInto(Path file, Map<String, Object> values) {
        if (!Files.isRegularFile(file)) {
            return;
        }
        try {
            values.putAll(read(file));
            log.debug("Fichier de configuration locale chargé : " + file);
        } catch (IOException ex) {
            log.warn("Impossible de lire " + file + " : " + ex.getMessage());
        }
    }

    /** Lecture d'un fichier dotenv (visibilité package pour les tests). */
    static Map<String, Object> read(Path file) throws IOException {
        Map<String, Object> values = new LinkedHashMap<>();
        for (String rawLine : Files.readAllLines(file, StandardCharsets.UTF_8)) {
            String line = rawLine.strip();
            if (line.isEmpty() || line.startsWith("#")) {
                continue;
            }
            if (line.startsWith("export ")) {
                line = line.substring("export ".length()).strip();
            }
            int separator = line.indexOf('=');
            if (separator <= 0) {
                continue;
            }
            String key = line.substring(0, separator).strip();
            if (!key.matches("[A-Za-z_][A-Za-z0-9_]*")) {
                continue;
            }
            values.put(key, parseValue(line.substring(separator + 1).strip()));
        }
        return values;
    }

    private static String parseValue(String raw) {
        if (raw.length() >= 2) {
            char quote = raw.charAt(0);
            if ((quote == '"' || quote == '\'') && raw.charAt(raw.length() - 1) == quote) {
                String inner = raw.substring(1, raw.length() - 1);
                return quote == '"' ? unescapeDoubleQuoted(inner) : inner;
            }
        }
        // Commentaire de fin de ligne non quoté : « valeur # commentaire ».
        int comment = raw.indexOf(" #");
        return comment < 0 ? raw : raw.substring(0, comment).strip();
    }

    private static String unescapeDoubleQuoted(String value) {
        StringBuilder result = new StringBuilder(value.length());
        for (int i = 0; i < value.length(); i++) {
            char current = value.charAt(i);
            if (current == '\\' && i + 1 < value.length()) {
                char next = value.charAt(++i);
                switch (next) {
                    case 'n' -> result.append('\n');
                    case 'r' -> result.append('\r');
                    case 't' -> result.append('\t');
                    case '"' -> result.append('"');
                    case '\\' -> result.append('\\');
                    default -> result.append('\\').append(next);
                }
            } else {
                result.append(current);
            }
        }
        return result.toString();
    }

    @Override
    public int getOrder() {
        // Après le chargement des fichiers application*.yml (profils actifs résolus).
        return Ordered.LOWEST_PRECEDENCE;
    }
}
