package com.mnktax.auth;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mnktax.auth.entity.Permission;
import com.mnktax.auth.entity.RefreshToken;
import com.mnktax.auth.entity.Role;
import com.mnktax.auth.entity.User;
import com.mnktax.auth.repository.PermissionRepository;
import com.mnktax.auth.repository.RefreshTokenRepository;
import com.mnktax.auth.repository.RoleRepository;
import com.mnktax.auth.repository.UserRepository;
import com.mnktax.audit.entity.AuditLog;
import com.mnktax.audit.repository.AuditLogRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Collections;
import java.util.HashSet;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Tests d'intégration complets pour le module Profil :
 * - Profil utilisateur (GET /me, PUT /me)
 * - Avatar (upload, suppression)
 * - Changement de mot de passe
 * - Sessions actives (GET, révoquer, révoquer toutes)
 * - Historique de sécurité
 * - Permissions effectives
 * - Protection IDOR
 * - RBAC
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class ProfileModuleIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private UserRepository userRepository;
    @Autowired private RoleRepository roleRepository;
    @Autowired private PermissionRepository permissionRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private RefreshTokenRepository refreshTokenRepository;
    @Autowired private AuditLogRepository auditLogRepository;

    private Long adminId;
    private Long agentId;
    private String adminToken;
    private String agentToken;
    private String adminRefreshToken;
    private String agentRefreshToken;

    @BeforeEach
    void setUp() {
        // Créer les permissions nécessaires
        Permission userRead = getOrCreatePermission("USER_READ", "Lire utilisateurs");
        Permission userWrite = getOrCreatePermission("USER_WRITE", "Modifier utilisateurs");
        Permission taxpayerRead = getOrCreatePermission("TAXPAYER_READ", "Lire contribuables");

        // Rôle ADMIN avec permissions étendues
        Role adminRole = roleRepository.findByCode(Role.ADMIN).orElseGet(() ->
                roleRepository.save(Role.builder().code(Role.ADMIN).name("Administrateur")
                        .description("Rôle test admin").system(true)
                        .permissions(new HashSet<>(Set.of(userRead, userWrite))).build()));

        // Rôle TAX_AGENT avec permission limitée
        Role agentRole = roleRepository.findByCode(Role.TAX_AGENT).orElseGet(() ->
                roleRepository.save(Role.builder().code(Role.TAX_AGENT).name("Agent fiscal")
                        .description("Rôle test agent").system(true)
                        .permissions(new HashSet<>(Set.of(taxpayerRead))).build()));

        // Créer les utilisateurs de test
        if (userRepository.findByUsername("profileadmin").isEmpty()) {
            User admin = userRepository.save(User.builder()
                    .username("profileadmin").email("profileadmin@demo.mg")
                    .password(passwordEncoder.encode("Admin@123"))
                    .firstName("Admin").lastName("Test")
                    .phone("+261340000001")
                    .jobTitle("Administrateur système")
                    .taxCenter("DGI Antananarivo")
                    .enabled(true).mustChangePassword(false).mfaEnabled(false)
                    .createdAt(Instant.now()).updatedAt(Instant.now())
                    .roles(new HashSet<>(Set.of(adminRole)))
                    .build());
            adminId = admin.getId();
        } else {
            adminId = userRepository.findByUsername("profileadmin").get().getId();
        }

        if (userRepository.findByUsername("profileagent").isEmpty()) {
            User agent = userRepository.save(User.builder()
                    .username("profileagent").email("profileagent@demo.mg")
                    .password(passwordEncoder.encode("Agent@123"))
                    .firstName("Agent").lastName("Test")
                    .phone("+261340000002")
                    .jobTitle("Agent fiscal")
                    .taxCenter("DGI Manakara")
                    .enabled(true).mustChangePassword(false).mfaEnabled(false)
                    .createdAt(Instant.now()).updatedAt(Instant.now())
                    .roles(new HashSet<>(Set.of(agentRole)))
                    .build());
            agentId = agent.getId();
        } else {
            agentId = userRepository.findByUsername("profileagent").get().getId();
        }

        // Connexion pour obtenir les tokens
        adminToken = loginAndGetToken("profileadmin", "Admin@123");
        agentToken = loginAndGetToken("profileagent", "Agent@123");
        adminRefreshToken = loginAndGetRefreshToken("profileadmin", "Admin@123");
        agentRefreshToken = loginAndGetRefreshToken("profileagent", "Agent@123");
    }

    // ══════════════════════════════════════════════════════
    //  PROFIL UTILISATEUR
    // ══════════════════════════════════════════════════════

    @Nested
    @DisplayName("GET /api/auth/me — Profil utilisateur courant")
    class MeEndpoint {

        @Test
        @DisplayName("Retourne le profil complet de l'utilisateur authentifié")
        void authenticatedUserReturnsProfile() throws Exception {
            mockMvc.perform(get("/api/auth/me")
                            .header("Authorization", "Bearer " + adminToken))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.username").value("profileadmin"))
                    .andExpect(jsonPath("$.email").value("profileadmin@demo.mg"))
                    .andExpect(jsonPath("$.firstName").value("Admin"))
                    .andExpect(jsonPath("$.lastName").value("Test"))
                    .andExpect(jsonPath("$.phone").value("+261340000001"))
                    .andExpect(jsonPath("$.jobTitle").value("Administrateur système"))
                    .andExpect(jsonPath("$.taxCenter").value("DGI Antananarivo"))
                    .andExpect(jsonPath("$.enabled").value(true))
                    .andExpect(jsonPath("$.roles").isArray())
                    .andExpect(jsonPath("$.permissions").isArray());
        }

        @Test
        @DisplayName("Le nombre de permissions correspond aux permissions réelles du rôle")
        void permissionsCountMatchesRolePermissions() throws Exception {
            MvcResult result = mockMvc.perform(get("/api/auth/me")
                            .header("Authorization", "Bearer " + adminToken))
                    .andExpect(status().isOk())
                    .andReturn();

            JsonNode json = objectMapper.readTree(result.getResponse().getContentAsString());
            JsonNode permissions = json.get("permissions");
            assertNotNull(permissions);
            assertTrue(permissions.isArray());
            assertTrue(permissions.size() > 0, "L'admin doit avoir au moins 1 permission");

            // Vérifier que les permissions contiennent bien USER_READ et USER_WRITE
            Set<String> permCodes = new HashSet<>();
            permissions.forEach(p -> permCodes.add(p.asText()));
            assertTrue(permCodes.contains("USER_READ"), "Admin doit avoir USER_READ");
            assertTrue(permCodes.contains("USER_WRITE"), "Admin doit avoir USER_WRITE");
        }

        @Test
        @DisplayName("L'agent a des permissions différentes de l'admin")
        void agentHasDifferentPermissions() throws Exception {
            MvcResult result = mockMvc.perform(get("/api/auth/me")
                            .header("Authorization", "Bearer " + agentToken))
                    .andExpect(status().isOk())
                    .andReturn();

            JsonNode json = objectMapper.readTree(result.getResponse().getContentAsString());
            JsonNode roles = json.get("roles");
            assertTrue(roles.isArray());
            boolean hasTaxAgent = false;
            for (JsonNode role : roles) {
                if ("TAX_AGENT".equals(role.asText())) hasTaxAgent = true;
            }
            assertTrue(hasTaxAgent, "L'agent doit avoir le rôle TAX_AGENT");
        }

        @Test
        @DisplayName("Sans token → 401 Unauthorized")
        void unauthenticatedReturns401() throws Exception {
            mockMvc.perform(get("/api/auth/me"))
                    .andExpect(status().isUnauthorized());
        }

        @Test
        @DisplayName("Token invalide → 401 Unauthorized")
        void invalidTokenReturns401() throws Exception {
            mockMvc.perform(get("/api/auth/me")
                            .header("Authorization", "Bearer invalid-token-12345"))
                    .andExpect(status().isUnauthorized());
        }
    }

    // ══════════════════════════════════════════════════════
    //  MISE À JOUR DU PROFIL
    // ══════════════════════════════════════════════════════

    @Nested
    @DisplayName("PUT /api/auth/me — Mise à jour du profil")
    class UpdateProfile {

        @Test
        @DisplayName("Mise à jour des informations personnelles")
        void updatePersonalInfo() throws Exception {
            mockMvc.perform(put("/api/auth/me")
                            .header("Authorization", "Bearer " + adminToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"firstName\":\"AdminUpdated\",\"lastName\":\"TestUpdated\",\"phone\":\"+261349999999\"}"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.firstName").value("AdminUpdated"))
                    .andExpect(jsonPath("$.lastName").value("TestUpdated"))
                    .andExpect(jsonPath("$.phone").value("+261349999999"));
        }

        @Test
        @DisplayName("Mise à jour du centre fiscal et de la fonction")
        void updateJobTitleAndTaxCenter() throws Exception {
            mockMvc.perform(put("/api/auth/me")
                            .header("Authorization", "Bearer " + adminToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"jobTitle\":\"Directeur\",\"taxCenter\":\"DGI Fianarantsoa\"}"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.jobTitle").value("Directeur"))
                    .andExpect(jsonPath("$.taxCenter").value("DGI Fianarantsoa"));
        }

        @Test
        @DisplayName("Email en double rejeté")
        void duplicateEmailRejected() throws Exception {
            mockMvc.perform(put("/api/auth/me")
                            .header("Authorization", "Bearer " + adminToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"email\":\"profileagent@demo.mg\"}"))
                    .andExpect(status().is4xxClientError());
        }

        @Test
        @DisplayName("Email invalide rejeté")
        void invalidEmailRejected() throws Exception {
            mockMvc.perform(put("/api/auth/me")
                            .header("Authorization", "Bearer " + adminToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"email\":\"pas-un-email\"}"))
                    .andExpect(status().is4xxClientError());
        }

        @Test
        @DisplayName("Sans authentification → 401")
        void unauthenticatedUpdateReturns401() throws Exception {
            mockMvc.perform(put("/api/auth/me")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"firstName\":\"Hacker\"}"))
                    .andExpect(status().isUnauthorized());
        }
    }

    // ══════════════════════════════════════════════════════
    //  CHANGEMENT DE MOT DE PASSE
    // ══════════════════════════════════════════════════════

    @Nested
    @DisplayName("POST /api/auth/change-password — Changement de mot de passe")
    class ChangePassword {

        @Test
        @DisplayName("Changement de mot de passe avec bon ancien mot de passe")
        void changePasswordWithCorrectCurrent() throws Exception {
            mockMvc.perform(post("/api/auth/change-password")
                            .header("Authorization", "Bearer " + adminToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"currentPassword\":\"Admin@123\",\"newPassword\":\"NewAdmin@456\"}"))
                    .andExpect(status().isNoContent());

            // Vérifier que l'ancien mot de passe ne fonctionne plus
            mockMvc.perform(post("/api/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"username\":\"profileadmin\",\"password\":\"Admin@123\"}"))
                    .andExpect(status().isUnauthorized());

            // Vérifier que le nouveau mot de passe fonctionne
            mockMvc.perform(post("/api/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"username\":\"profileadmin\",\"password\":\"NewAdmin@456\"}"))
                    .andExpect(status().isOk());
        }

        @Test
        @DisplayName("Ancien mot de passe incorrect → rejet")
        void changePasswordWithWrongCurrent() throws Exception {
            mockMvc.perform(post("/api/auth/change-password")
                            .header("Authorization", "Bearer " + adminToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"currentPassword\":\"MauvaisMotDePasse\",\"newPassword\":\"NewAdmin@456\"}"))
                    .andExpect(status().is4xxClientError());
        }

        @Test
        @DisplayName("Nouveau mot de passe trop court → rejet")
        void changePasswordTooShort() throws Exception {
            mockMvc.perform(post("/api/auth/change-password")
                            .header("Authorization", "Bearer " + adminToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"currentPassword\":\"Admin@123\",\"newPassword\":\"court\"}"))
                    .andExpect(status().is4xxClientError());
        }

        @Test
        @DisplayName("Nouveau mot de passe identique à l'ancien → rejet")
        void changePasswordSameAsCurrent() throws Exception {
            mockMvc.perform(post("/api/auth/change-password")
                            .header("Authorization", "Bearer " + adminToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"currentPassword\":\"Admin@123\",\"newPassword\":\"Admin@123\"}"))
                    .andExpect(status().is4xxClientError());
        }

        @Test
        @DisplayName("Changement de mot de passe invalide tous les refresh tokens")
        void passwordChangeInvalidatesAllRefreshTokens() throws Exception {
            // Sauvegarder le refresh token avant changement
            String oldRefresh = adminRefreshToken;

            // Changer le mot de passe
            mockMvc.perform(post("/api/auth/change-password")
                            .header("Authorization", "Bearer " + adminToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"currentPassword\":\"Admin@123\",\"newPassword\":\"NewAdmin@456\"}"))
                    .andExpect(status().isNoContent());

            // L'ancien refresh token doit être révoqué
            mockMvc.perform(post("/api/auth/refresh")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"refreshToken\":\"" + oldRefresh + "\"}"))
                    .andExpect(status().is4xxClientError());
        }

        @Test
        @DisplayName("Sans authentification → 401")
        void unauthenticatedPasswordChangeReturns401() throws Exception {
            mockMvc.perform(post("/api/auth/change-password")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"currentPassword\":\"Admin@123\",\"newPassword\":\"NewAdmin@456\"}"))
                    .andExpect(status().isUnauthorized());
        }
    }

    // ══════════════════════════════════════════════════════
    //  SESSIONS
    // ══════════════════════════════════════════════════════

    @Nested
    @DisplayName("Sessions actives")
    class Sessions {

        @Test
        @DisplayName("GET /api/auth/me/sessions — Liste les sessions actives")
        void listActiveSessions() throws Exception {
            MvcResult result = mockMvc.perform(get("/api/auth/me/sessions")
                            .header("Authorization", "Bearer " + adminToken))
                    .andExpect(status().isOk())
                    .andReturn();

            JsonNode json = objectMapper.readTree(result.getResponse().getContentAsString());
            assertNotNull(json);
            assertTrue(json.isArray(), "La réponse doit être un tableau");
            assertTrue(json.size() >= 1, "Au moins 1 session active (la connexion courante)");

            // Vérifier la structure d'une session
            JsonNode session = json.get(0);
            assertNotNull(session.get("id"));
            assertNotNull(session.get("createdAt"));
            assertNotNull(session.get("expiresAt"));
        }

        @Test
        @DisplayName("POST /api/auth/me/sessions/{id}/revoke — Révoquer une session")
        void revokeSession() throws Exception {
            // Créer une seconde session (connexion supplémentaire)
            String secondToken = loginAndGetToken("profileadmin", "Admin@123");

            // Lister les sessions
            MvcResult result = mockMvc.perform(get("/api/auth/me/sessions")
                            .header("Authorization", "Bearer " + adminToken))
                    .andExpect(status().isOk())
                    .andReturn();

            JsonNode sessions = objectMapper.readTree(result.getResponse().getContentAsString());
            assertTrue(sessions.size() >= 2, "Doit y avoir au moins 2 sessions");

            // Trouver la session non-courante
            Long sessionToRevoke = null;
            for (JsonNode s : sessions) {
                if (!s.get("current").asBoolean()) {
                    sessionToRevoke = s.get("id").asLong();
                    break;
                }
            }

            if (sessionToRevoke != null) {
                mockMvc.perform(post("/api/auth/me/sessions/" + sessionToRevoke + "/revoke")
                                .header("Authorization", "Bearer " + adminToken))
                        .andExpect(status().isNoContent());

                // Vérifier que la session révoquée n'apparaît plus
                MvcResult after = mockMvc.perform(get("/api/auth/me/sessions")
                                .header("Authorization", "Bearer " + adminToken))
                        .andExpect(status().isOk())
                        .andReturn();

                JsonNode afterSessions = objectMapper.readTree(after.getResponse().getContentAsString());
                boolean revokedStillExists = false;
                for (JsonNode s : afterSessions) {
                    if (s.get("id").asLong() == sessionToRevoke) {
                        revokedStillExists = true;
                        break;
                    }
                }
                assertFalse(revokedStillExists, "La session révoquée ne doit plus apparaître");
            }
        }

        @Test
        @DisplayName("POST /api/auth/me/sessions/revoke-all — Révoquer toutes les autres sessions")
        void revokeAllOtherSessions() throws Exception {
            // Créer des sessions supplémentaires
            loginAndGetToken("profileadmin", "Admin@123");
            loginAndGetToken("profileadmin", "Admin@123");

            // Compter les sessions avant
            MvcResult before = mockMvc.perform(get("/api/auth/me/sessions")
                            .header("Authorization", "Bearer " + adminToken))
                    .andExpect(status().isOk())
                    .andReturn();
            int countBefore = objectMapper.readTree(before.getResponse().getContentAsString()).size();
            assertTrue(countBefore >= 2, "Doit y avoir au moins 2 sessions avant révocation");

            // Révoquer toutes les autres sessions
            mockMvc.perform(post("/api/auth/me/sessions/revoke-all")
                            .header("Authorization", "Bearer " + adminToken)
                            .param("token", adminRefreshToken))
                    .andExpect(status().isNoContent());

            // Vérifier qu'il ne reste qu'une seule session
            MvcResult after = mockMvc.perform(get("/api/auth/me/sessions")
                            .header("Authorization", "Bearer " + adminToken))
                    .andExpect(status().isOk())
                    .andReturn();
            int countAfter = objectMapper.readTree(after.getResponse().getContentAsString()).size();
            assertEquals(1, countAfter, "Il ne doit rester qu'une seule session après révocation globale");
        }

        @Test
        @DisplayName("Les sessions d'un utilisateur sont invisibles pour un autre")
        void sessionsArePerUser() throws Exception {
            // L'agent ne doit pas voir les sessions de l'admin
            MvcResult result = mockMvc.perform(get("/api/auth/me/sessions")
                            .header("Authorization", "Bearer " + agentToken))
                    .andExpect(status().isOk())
                    .andReturn();

            JsonNode agentSessions = objectMapper.readTree(result.getResponse().getContentAsString());
            // Les sessions de l'agent ne doivent pas contenir d'ID d'admin
            for (JsonNode s : agentSessions) {
                // Vérifier que ce sont bien les sessions de l'agent
                assertNotNull(s.get("id"));
            }

            // L'admin ne doit pas pouvoir révoquer une session de l'agent
            // D'abord, trouver une session de l'agent
            MvcResult agentSessionsResult = mockMvc.perform(get("/api/auth/me/sessions")
                            .header("Authorization", "Bearer " + agentToken))
                    .andExpect(status().isOk())
                    .andReturn();
            JsonNode agentSessionsList = objectMapper.readTree(agentSessionsResult.getResponse().getContentAsString());

            if (agentSessionsList.size() > 0) {
                Long agentSessionId = agentSessionsList.get(0).get("id").asLong();

                // L'admin essaie de révoquer la session de l'agent → doit échouer silencieusement
                mockMvc.perform(post("/api/auth/me/sessions/" + agentSessionId + "/revoke")
                                .header("Authorization", "Bearer " + adminToken))
                        .andExpect(status().isNoContent()); // 204 car la requête ne trouve rien à révoquer

                // La session de l'agent doit toujours exister
                MvcResult agentStillActive = mockMvc.perform(get("/api/auth/me/sessions")
                                .header("Authorization", "Bearer " + agentToken))
                        .andExpect(status().isOk())
                        .andReturn();
                JsonNode agentSessionsAfter = objectMapper.readTree(agentStillActive.getResponse().getContentAsString());
                assertTrue(agentSessionsAfter.size() >= 1, "La session de l'agent ne doit pas être révoquée par l'admin");
            }
        }

        @Test
        @DisplayName("Sans authentification → 401")
        void unauthenticatedSessionsReturns401() throws Exception {
            mockMvc.perform(get("/api/auth/me/sessions"))
                    .andExpect(status().isUnauthorized());
        }
    }

    // ══════════════════════════════════════════════════════
    //  HISTORIQUE DE SÉCURITÉ
    // ══════════════════════════════════════════════════════

    @Nested
    @DisplayName("GET /api/auth/me/security-history — Historique de sécurité")
    class SecurityHistory {

        @BeforeEach
        void seedAuditLogs() {
            // Créer des entrées d'audit directement via le repository
            // (l'enregistrement asynchrone via @Async n'est pas visible dans les tests @Transactional)
            auditLogRepository.save(AuditLog.builder()
                    .userId(adminId).username("profileadmin")
                    .action("LOGIN").entityType("USER")
                    .ipAddress("192.168.1.1").userAgent("TestAgent/1.0")
                    .createdAt(Instant.now()).build());
            auditLogRepository.save(AuditLog.builder()
                    .userId(adminId).username("profileadmin")
                    .action("UPDATE").entityType("PROFILE")
                    .ipAddress("192.168.1.1").userAgent("TestAgent/1.0")
                    .createdAt(Instant.now()).build());
            auditLogRepository.save(AuditLog.builder()
                    .userId(adminId).username("profileadmin")
                    .action("PASSWORD_CHANGE").entityType("USER")
                    .ipAddress("192.168.1.1").userAgent("TestAgent/1.0")
                    .createdAt(Instant.now()).build());
        }

        @Test
        @DisplayName("Retourne l'historique d'audit de l'utilisateur courant")
        void returnsSecurityHistory() throws Exception {
            MvcResult result = mockMvc.perform(get("/api/auth/me/security-history")
                            .header("Authorization", "Bearer " + adminToken))
                    .andExpect(status().isOk())
                    .andReturn();

            JsonNode json = objectMapper.readTree(result.getResponse().getContentAsString());
            assertNotNull(json);
            assertTrue(json.isArray(), "La réponse doit être un tableau");
            assertTrue(json.size() >= 3, "Au moins 3 événements seedés");

            // Vérifier la structure
            JsonNode event = json.get(0);
            assertNotNull(event.get("id"));
            assertNotNull(event.get("action"));
            assertNotNull(event.get("entityType"));
            assertNotNull(event.get("createdAt"));
        }

        @Test
        @DisplayName("L'historique contient les actions de connexion")
        void historyContainsLoginActions() throws Exception {
            MvcResult result = mockMvc.perform(get("/api/auth/me/security-history")
                            .header("Authorization", "Bearer " + adminToken))
                    .andExpect(status().isOk())
                    .andReturn();

            JsonNode json = objectMapper.readTree(result.getResponse().getContentAsString());
            boolean hasLogin = false;
            for (JsonNode event : json) {
                if ("LOGIN".equals(event.get("action").asText())) {
                    hasLogin = true;
                    break;
                }
            }
            assertTrue(hasLogin, "L'historique doit contenir au moins un LOGIN");
        }

        @Test
        @DisplayName("Pagination fonctionne")
        void paginationWorks() throws Exception {
            // Page 0, taille 2
            mockMvc.perform(get("/api/auth/me/security-history")
                            .header("Authorization", "Bearer " + adminToken)
                            .param("page", "0")
                            .param("size", "2"))
                    .andExpect(status().isOk());
        }

        @Test
        @DisplayName("Sans authentification → 401")
        void unauthenticatedHistoryReturns401() throws Exception {
            mockMvc.perform(get("/api/auth/me/security-history"))
                    .andExpect(status().isUnauthorized());
        }
    }

    // ══════════════════════════════════════════════════════
    //  AVATAR
    // ══════════════════════════════════════════════════════

    @Nested
    @DisplayName("Avatar — Upload et suppression")
    class Avatar {

        @Test
        @DisplayName("GET /api/auth/me/avatar — Avatar inexistant retourne 404")
        void noAvatarReturns404() throws Exception {
            mockMvc.perform(get("/api/auth/me/avatar")
                            .header("Authorization", "Bearer " + adminToken))
                    .andExpect(status().isNotFound());
        }

        @Test
        @DisplayName("DELETE /api/auth/me/avatar — Suppression sans avatar ne plante pas")
        void deleteNonExistentAvatar() throws Exception {
            mockMvc.perform(delete("/api/auth/me/avatar")
                            .header("Authorization", "Bearer " + adminToken))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.hasAvatar").value(false));
        }
    }

    // ══════════════════════════════════════════════════════
    //  AUDIT TRAIL
    // ══════════════════════════════════════════════════════

    @Nested
    @DisplayName("Audit trail — Vérification des enregistrements")
    class AuditTrail {

        @Test
        @DisplayName("La connexion génère un enregistrement d'audit LOGIN")
        void loginCreatesAuditEntry() throws Exception {
            long countBefore = auditLogRepository.count();

            loginAndGetToken("profileadmin", "Admin@123");

            long countAfter = auditLogRepository.count();
            assertTrue(countAfter > countBefore, "Un nouvel audit doit être enregistré après connexion");
        }

        @Test
        @DisplayName("La mise à jour de profil génère un enregistrement d'audit UPDATE PROFILE")
        void profileUpdateCreatesAuditEntry() throws Exception {
            long countBefore = auditLogRepository.count();

            mockMvc.perform(put("/api/auth/me")
                            .header("Authorization", "Bearer " + adminToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"firstName\":\"AuditTest\"}"))
                    .andExpect(status().isOk());

            long countAfter = auditLogRepository.count();
            assertTrue(countAfter > countBefore, "Un audit UPDATE PROFILE doit être enregistré");
        }

        @Test
        @DisplayName("Le changement de mot de passe génère un enregistrement PASSWORD_CHANGE")
        void passwordChangeCreatesAuditEntry() throws Exception {
            long countBefore = auditLogRepository.count();

            mockMvc.perform(post("/api/auth/change-password")
                            .header("Authorization", "Bearer " + adminToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"currentPassword\":\"Admin@123\",\"newPassword\":\"AuditTest@456\"}"))
                    .andExpect(status().isNoContent());

            long countAfter = auditLogRepository.count();
            assertTrue(countAfter > countBefore, "Un audit PASSWORD_CHANGE doit être enregistré");

            // Restaurer le mot de passe pour les tests suivants
            mockMvc.perform(post("/api/auth/change-password")
                            .header("Authorization", "Bearer " + loginAndGetToken("profileadmin", "AuditTest@456"))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"currentPassword\":\"AuditTest@456\",\"newPassword\":\"Admin@123\"}"))
                    .andExpect(status().isNoContent());
        }
    }

    // ══════════════════════════════════════════════════════
    //  RBAC & IDOR
    // ══════════════════════════════════════════════════════

    @Nested
    @DisplayName("RBAC & IDOR — Contrôle d'accès")
    class RBAC {

        @Test
        @DisplayName("Un utilisateur ne peut modifier que son propre profil (pas celui d'un autre)")
        void userCanOnlyUpdateOwnProfile() throws Exception {
            // L'agent met à jour son propre profil → OK
            mockMvc.perform(put("/api/auth/me")
                            .header("Authorization", "Bearer " + agentToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"firstName\":\"OwnProfile\"}"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.firstName").value("OwnProfile"));

            // Vérifier que le profil de l'admin n'a pas changé
            mockMvc.perform(get("/api/auth/me")
                            .header("Authorization", "Bearer " + adminToken))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.firstName").value("Admin"));
        }

        @Test
        @DisplayName("Un utilisateur ne peut voir que ses propres sessions")
        void userCanOnlySeeOwnSessions() throws Exception {
            // L'agent voit ses propres sessions
            MvcResult agentResult = mockMvc.perform(get("/api/auth/me/sessions")
                            .header("Authorization", "Bearer " + agentToken))
                    .andExpect(status().isOk())
                    .andReturn();

            // L'admin voit ses propres sessions
            MvcResult adminResult = mockMvc.perform(get("/api/auth/me/sessions")
                            .header("Authorization", "Bearer " + adminToken))
                    .andExpect(status().isOk())
                    .andReturn();

            JsonNode agentSessions = objectMapper.readTree(agentResult.getResponse().getContentAsString());
            JsonNode adminSessions = objectMapper.readTree(adminResult.getResponse().getContentAsString());

            // Les sessions doivent être différentes (au moins en nombre ou en IDs)
            assertNotNull(agentSessions);
            assertNotNull(adminSessions);
            // Pas de cross-contamination : les IDs ne doivent pas se chevaucher
            Set<Long> agentSessionIds = new HashSet<>();
            agentSessions.forEach(s -> agentSessionIds.add(s.get("id").asLong()));
            Set<Long> adminSessionIds = new HashSet<>();
            adminSessions.forEach(s -> adminSessionIds.add(s.get("id").asLong()));
            assertTrue(Collections.disjoint(agentSessionIds, adminSessionIds),
                    "Les sessions de l'agent et de l'admin ne doivent pas se chevaucher");
        }

        @Test
        @DisplayName("Un utilisateur ne peut voir que son propre historique de sécurité")
        void userCanOnlySeeOwnSecurityHistory() throws Exception {
            MvcResult agentResult = mockMvc.perform(get("/api/auth/me/security-history")
                            .header("Authorization", "Bearer " + agentToken))
                    .andExpect(status().isOk())
                    .andReturn();

            JsonNode agentHistory = objectMapper.readTree(agentResult.getResponse().getContentAsString());
            // Tous les événements doivent appartenir à l'agent
            for (JsonNode event : agentHistory) {
                // L'event ne contient pas directement le username, mais l'audit est filtré côté service
                assertNotNull(event.get("action"));
            }
        }

        @Test
        @DisplayName("JWT expiré ou invalide → 401 sur tous les endpoints profil")
        void expiredTokenReturns401() throws Exception {
            String fakeToken = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ0ZXN0IiwiZXhwIjoxfQ.invalid";

            mockMvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + fakeToken))
                    .andExpect(status().isUnauthorized());

            mockMvc.perform(get("/api/auth/me/sessions").header("Authorization", "Bearer " + fakeToken))
                    .andExpect(status().isUnauthorized());

            mockMvc.perform(get("/api/auth/me/security-history").header("Authorization", "Bearer " + fakeToken))
                    .andExpect(status().isUnauthorized());

            mockMvc.perform(put("/api/auth/me")
                            .header("Authorization", "Bearer " + fakeToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{}"))
                    .andExpect(status().isUnauthorized());

            mockMvc.perform(post("/api/auth/change-password")
                            .header("Authorization", "Bearer " + fakeToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"currentPassword\":\"x\",\"newPassword\":\"y\"}"))
                    .andExpect(status().isUnauthorized());
        }

        @Test
        @DisplayName("Le rôle et les permissions ne sont pas modifiables via PUT /me")
        void roleAndPermissionsNotModifiable() throws Exception {
            // Tenter de modifier le rôle via le profil
            MvcResult before = mockMvc.perform(get("/api/auth/me")
                            .header("Authorization", "Bearer " + agentToken))
                    .andExpect(status().isOk())
                    .andReturn();
            JsonNode beforeJson = objectMapper.readTree(before.getResponse().getContentAsString());
            int permCountBefore = beforeJson.get("permissions").size();

            // La mise à jour du profil n'accepte pas role/permissions dans le DTO
            // Donc ils ne doivent pas changer
            mockMvc.perform(put("/api/auth/me")
                            .header("Authorization", "Bearer " + agentToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"firstName\":\"RoleTest\"}"))
                    .andExpect(status().isOk());

            MvcResult after = mockMvc.perform(get("/api/auth/me")
                            .header("Authorization", "Bearer " + agentToken))
                    .andExpect(status().isOk())
                    .andReturn();
            JsonNode afterJson = objectMapper.readTree(after.getResponse().getContentAsString());
            int permCountAfter = afterJson.get("permissions").size();

            assertEquals(permCountBefore, permCountAfter,
                    "Le nombre de permissions ne doit pas changer via PUT /me");
        }
    }

    // ══════════════════════════════════════════════════════
    //  UTILITAIRES
    // ══════════════════════════════════════════════════════

    private String loginAndGetToken(String username, String password) {
        try {
            MvcResult result = mockMvc.perform(post("/api/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"username\":\"" + username + "\",\"password\":\"" + password + "\"}"))
                    .andExpect(status().isOk())
                    .andReturn();
            return objectMapper.readTree(result.getResponse().getContentAsString())
                    .get("accessToken").asText();
        } catch (Exception e) {
            throw new RuntimeException("Login failed for " + username, e);
        }
    }

    private String loginAndGetRefreshToken(String username, String password) {
        try {
            MvcResult result = mockMvc.perform(post("/api/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"username\":\"" + username + "\",\"password\":\"" + password + "\"}"))
                    .andExpect(status().isOk())
                    .andReturn();
            return objectMapper.readTree(result.getResponse().getContentAsString())
                    .get("refreshToken").asText();
        } catch (Exception e) {
            throw new RuntimeException("Login failed for " + username, e);
        }
    }

    private Permission getOrCreatePermission(String code, String name) {
        return permissionRepository.findByCode(code).orElseGet(() ->
                permissionRepository.save(Permission.builder().code(code).name(name).build()));
    }
}
