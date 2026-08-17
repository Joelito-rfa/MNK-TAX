package com.mnktax.auth;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mnktax.auth.entity.Permission;
import com.mnktax.auth.entity.Role;
import com.mnktax.auth.entity.User;
import com.mnktax.auth.repository.PermissionRepository;
import com.mnktax.auth.repository.RoleRepository;
import com.mnktax.auth.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.HashSet;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Test du flux d'authentification JWT :
 * login valide → token, accès aux ressources protégées, refus sans token,
 * mauvais identifiants rejetés.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class AuthFlowIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private UserRepository userRepository;
    @Autowired private RoleRepository roleRepository;
    @Autowired private PermissionRepository permissionRepository;
    @Autowired private PasswordEncoder passwordEncoder;

    @BeforeEach
    void setUp() {
        if (userRepository.count() > 0) {
            return;
        }
        Role superAdmin = roleRepository.findByCode(Role.SUPER_ADMIN).orElseGet(() -> {
            Permission perm = permissionRepository.findByCode("USER_READ").orElseGet(() ->
                    permissionRepository.save(Permission.builder().code("USER_READ")
                            .name("Lire utilisateurs").build()));
            return roleRepository.save(Role.builder().code(Role.SUPER_ADMIN).name("Super Admin")
                    .description("Rôle test").system(true)
                    .permissions(new HashSet<>(Set.of(perm))).build());
        });
        userRepository.save(User.builder()
                .username("testadmin").email("testadmin@demo.mg")
                .password(passwordEncoder.encode("Admin@123"))
                .firstName("Test").lastName("Admin")
                .enabled(true).mustChangePassword(false).mfaEnabled(false)
                .createdAt(Instant.now()).updatedAt(Instant.now())
                .roles(new HashSet<>(Set.of(superAdmin)))
                .build());

        Role agent = roleRepository.findByCode(Role.TAX_AGENT).orElseGet(() -> {
            Permission perm = permissionRepository.findByCode("TAXPAYER_READ").orElseGet(() ->
                    permissionRepository.save(Permission.builder().code("TAXPAYER_READ")
                            .name("Lire contribuables").build()));
            return roleRepository.save(Role.builder().code(Role.TAX_AGENT).name("Agent fiscal")
                    .description("Rôle test").system(true)
                    .permissions(new HashSet<>(Set.of(perm))).build());
        });
        userRepository.save(User.builder()
                .username("taxagent").email("taxagent@demo.mg")
                .password(passwordEncoder.encode("Agent@123"))
                .firstName("Agent").lastName("Test")
                .enabled(true).mustChangePassword(false).mfaEnabled(false)
                .createdAt(Instant.now()).updatedAt(Instant.now())
                .roles(new HashSet<>(Set.of(agent)))
                .build());
    }

    @Test
    @DisplayName("Connexion valide → JWT + refresh token + utilisateur")
    void validLoginReturnsTokens() throws Exception {
        String body = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"testadmin\",\"password\":\"Admin@123\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.refreshToken").isNotEmpty())
                .andExpect(jsonPath("$.tokenType").value("Bearer"))
                .andReturn().getResponse().getContentAsString();

        JsonNode json = objectMapper.readTree(body);
        assertNotNull(json.get("accessToken").asText());
        assertFalse(json.get("accessToken").asText().isBlank());
    }

    @Test
    @DisplayName("Accès protégé avec JWT → 200")
    void authenticatedAccess() throws Exception {
        String body = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"testadmin\",\"password\":\"Admin@123\"}"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        String token = objectMapper.readTree(body).get("accessToken").asText();

        mockMvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("testadmin"));
    }

    @Test
    @DisplayName("Accès protégé sans JWT → 401")
    void unauthenticatedAccessRejected() throws Exception {
        mockMvc.perform(get("/api/auth/me"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Sans la permission TAXPAYER_READ → 403")
    void missingPermissionRejected() throws Exception {
        String body = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"testadmin\",\"password\":\"Admin@123\"}"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        String token = objectMapper.readTree(body).get("accessToken").asText();

        mockMvc.perform(get("/api/taxpayers").header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Avec la permission TAXPAYER_READ → accès autorisé")
    void authorizedAccess() throws Exception {
        String body = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"taxagent\",\"password\":\"Agent@123\"}"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        String token = objectMapper.readTree(body).get("accessToken").asText();

        mockMvc.perform(get("/api/taxpayers").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("Mauvais identifiants → 401")
    void badCredentialsRejected() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"testadmin\",\"password\":\"mauvais\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Refresh token invalide → rejet")
    void invalidRefreshTokenRejected() throws Exception {
        mockMvc.perform(post("/api/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"refreshToken\":\"token-inconnu\"}"))
                .andExpect(status().is4xxClientError());
    }
}
