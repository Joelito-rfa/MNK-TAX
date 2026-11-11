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
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.time.Instant;
import java.util.HashSet;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Réinitialisation de mot de passe sans fournisseur email réel (profil test) :
 * le secret doit être renvoyé pour remise manuelle, pas perdu ni inventé.
 *
 * Test volontairement non transactionnel : la réinitialisation doit être
 * réellement commitée pour vérifier que le mot de passe renvoyé fonctionne.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class UserResetPasswordIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private UserRepository userRepository;
    @Autowired private RoleRepository roleRepository;
    @Autowired private PermissionRepository permissionRepository;
    @Autowired private PasswordEncoder passwordEncoder;

    private Long targetId;

    @BeforeEach
    void setUp() {
        Permission reset = permissionRepository.findByCode("USER_RESET_PASSWORD").orElseGet(() ->
                permissionRepository.save(Permission.builder().code("USER_RESET_PASSWORD")
                        .name("Réinitialiser les mots de passe").build()));

        Role adminRole = roleRepository.findByCode(Role.ADMIN).orElseGet(() ->
                roleRepository.save(Role.builder().code(Role.ADMIN).name("Administrateur")
                        .description("Rôle test").system(true)
                        .permissions(new HashSet<>()).build()));
        adminRole.getPermissions().add(reset);
        roleRepository.save(adminRole);

        if (userRepository.findByUsername("resetadmin").isEmpty()) {
            userRepository.save(User.builder()
                    .username("resetadmin").email("resetadmin@demo.mg")
                    .password(passwordEncoder.encode("Admin@123"))
                    .firstName("Admin").lastName("Reset")
                    .enabled(true).mustChangePassword(false).mfaEnabled(false)
                    .createdAt(Instant.now()).updatedAt(Instant.now())
                    .roles(new HashSet<>(java.util.Set.of(adminRole)))
                    .build());
        }

        User target = userRepository.findByUsername("resetuser").orElseGet(() ->
                userRepository.save(User.builder()
                        .username("resetuser").email("resetuser@demo.mg")
                        .password(passwordEncoder.encode("User@1234"))
                        .firstName("User").lastName("Reset")
                        .enabled(true).mustChangePassword(false).mfaEnabled(false)
                        .createdAt(Instant.now()).updatedAt(Instant.now())
                        .roles(new HashSet<>())
                        .build()));
        targetId = target.getId();
    }

    @Test
    @DisplayName("Sans SMTP : le mot de passe temporaire est renvoyé pour remise manuelle")
    void resetPasswordWithoutSmtpReturnsTemporaryPassword() throws Exception {
        String token = loginAndGetToken("resetadmin", "Admin@123");

        MvcResult result = mockMvc.perform(post("/api/users/{id}/reset-password", targetId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.delivery").value("MANUAL"))
                .andExpect(jsonPath("$.temporaryPassword").isNotEmpty())
                .andReturn();

        JsonNode body = objectMapper.readTree(result.getResponse().getContentAsString());
        String temporaryPassword = body.get("temporaryPassword").asText();
        assertNotNull(temporaryPassword);

        // Relecture depuis la base : le mot de passe renvoyé doit être celui persisté.
        User refreshed = userRepository.findById(targetId).orElseThrow();
        assertTrue(passwordEncoder.matches(temporaryPassword, refreshed.getPassword()),
                "Le mot de passe renvoyé doit correspondre au mot de passe enregistré");
        assertTrue(refreshed.isMustChangePassword(),
                "Le changement doit être imposé à la prochaine connexion");
    }

    private String loginAndGetToken(String username, String password) throws Exception {
        String payload = objectMapper.writeValueAsString(
                java.util.Map.of("username", username, "password", password));
        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isOk())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString())
                .get("accessToken").asText();
    }
}
