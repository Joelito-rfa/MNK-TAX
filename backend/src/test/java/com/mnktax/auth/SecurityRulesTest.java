package com.mnktax.auth;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Règles de sécurité vérifiées sans identifiants :
 * routes publiques, preflight CORS/OPTIONS et rejet contrôlé des JWT invalides.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class SecurityRulesTest {

    @Autowired private MockMvc mockMvc;

    @Test
    @DisplayName("Route de santé accessible sans token")
    void healthIsPublic() throws Exception {
        mockMvc.perform(get("/actuator/health"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("Route protégée avec JWT invalide → 401")
    void invalidJwtRejected() throws Exception {
        mockMvc.perform(get("/api/auth/me")
                        .header("Authorization", "Bearer invalid.token.value"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("En-tête Authorization mal formé → 401")
    void malformedAuthorizationRejected() throws Exception {
        mockMvc.perform(get("/api/auth/me")
                        .header("Authorization", "Bearertoken-sans-espace"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Preflight CORS vers route protégée → 200 + origine autorisée")
    void corsPreflightAllowed() throws Exception {
        mockMvc.perform(options("/api/auth/me")
                        .header("Origin", "http://localhost:5177")
                        .header("Access-Control-Request-Method", "GET"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:5177"));
    }

    @Test
    @DisplayName("Requête OPTIONS sans identifiants → pas de 401")
    void optionsWithoutCredentialsNotRejected() throws Exception {
        mockMvc.perform(options("/api/auth/me"))
                .andExpect(status().isOk());
    }
}
