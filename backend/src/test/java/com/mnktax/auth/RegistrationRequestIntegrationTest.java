package com.mnktax.auth;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Demande d'accès publique : le contribuable peut demander un accès pour son
 * propre compte, sans organisation ni rôle imposé.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class RegistrationRequestIntegrationTest {

    @Autowired private MockMvc mockMvc;

    @Test
    @DisplayName("Contribuable : ni organisation ni rôle → compte TAXPAYER, type Particulier")
    void taxpayerRequestNeedsNoOrganizationNorRole() throws Exception {
        String body = """
                {
                  "name": "RAKOTO Jean",
                  "email": "contribuable.reg@test.mg",
                  "nif": "0000409001",
                  "phone": "034 00 000 00",
                  "address": "Antananarivo",
                  "requestType": "INDIVIDUAL",
                  "message": "Je souhaite suivre mes declarations."
                }
                """;

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reference").isNotEmpty())
                .andExpect(jsonPath("$.organization").value("Particulier"))
                .andExpect(jsonPath("$.role").value("TAXPAYER"))
                .andExpect(jsonPath("$.requestType").value("INDIVIDUAL"))
                .andExpect(jsonPath("$.nif").value("0000409001"))
                .andExpect(jsonPath("$.status").value("PENDING"));
    }

    @Test
    @DisplayName("Agent : rôle saisi en libellé → code de rôle et type cohérents")
    void agentRequestNormalizesRoleLabel() throws Exception {
        String body = """
                {
                  "name": "RAKOTO Jean",
                  "email": "agent.reg@test.mg",
                  "organization": "DGI Antananarivo",
                  "role": "Agent fiscal"
                }
                """;

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("TAX_AGENT"))
                .andExpect(jsonPath("$.requestType").value("TAX_AGENT"))
                .andExpect(jsonPath("$.organization").value("DGI Antananarivo"));
    }

    @Test
    @DisplayName("Type de demande inconnu → OTHER (filtre admin fiable)")
    void unknownRequestTypeFallsBackToOther() throws Exception {
        String body = """
                {
                  "name": "RAKOTO Jean",
                  "email": "autre.reg@test.mg",
                  "requestType": "VOITURE"
                }
                """;

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.requestType").value("OTHER"))
                .andExpect(jsonPath("$.role").value("TAXPAYER"));
    }

    @Test
    @DisplayName("Deuxième demande en attente pour le même email → 409")
    void duplicatePendingRequestIsRejected() throws Exception {
        String body = """
                {
                  "name": "RAKOTO Jean",
                  "email": "doublon.reg@test.mg",
                  "requestType": "INDIVIDUAL"
                }
                """;

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("DUPLICATE"));
    }

    @Test
    @DisplayName("Email invalide → 400")
    void invalidEmailIsRejected() throws Exception {
        String body = """
                {
                  "name": "RAKOTO Jean",
                  "email": "pas-un-email",
                  "requestType": "INDIVIDUAL"
                }
                """;

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest());
    }
}
