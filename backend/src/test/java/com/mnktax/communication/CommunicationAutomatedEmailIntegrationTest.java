package com.mnktax.communication;

import com.mnktax.auth.entity.Role;
import com.mnktax.auth.entity.User;
import com.mnktax.auth.repository.RoleRepository;
import com.mnktax.auth.repository.UserRepository;
import com.mnktax.common.exception.BusinessException;
import com.mnktax.communication.dto.CommunicationDtos.ComposeRequest;
import com.mnktax.communication.dto.CommunicationDtos.ComposeResult;
import com.mnktax.communication.entity.CommunicationEventType;
import com.mnktax.communication.entity.DeliveryChannel;
import com.mnktax.communication.entity.MessageDelivery;
import com.mnktax.communication.repository.MessageDeliveryRepository;
import com.mnktax.communication.service.CommunicationEventEngine;
import com.mnktax.communication.service.CommunicationService;
import com.mnktax.message.entity.Message;
import com.mnktax.taxpayer.entity.Taxpayer;
import com.mnktax.taxpayer.entity.TaxpayerStatus;
import com.mnktax.taxpayer.entity.TaxpayerType;
import com.mnktax.taxpayer.repository.TaxpayerRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Relances automatiques vers la VRAIE adresse email du contribuable :
 * <ul>
 *   <li>préférences par défaut incluant EMAIL (V38) → l'événement part en email ;</li>
 *   <li>contribuable sans compte utilisateur → l'email part quand même ;</li>
 *   <li>fiche sans email → repli sur l'email du compte lié ;</li>
 *   <li>envoi manuel (agent) vers un contribuable sans compte ;</li>
 *   <li>aucun canal joignable → échec explicite, jamais d'envoi silencieux.</li>
 * </ul>
 */
@SpringBootTest
@ActiveProfiles("test")
class CommunicationAutomatedEmailIntegrationTest {

    @Autowired private CommunicationEventEngine eventEngine;
    @Autowired private CommunicationService communicationService;
    @Autowired private MessageDeliveryRepository deliveryRepository;
    @Autowired private TaxpayerRepository taxpayerRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private RoleRepository roleRepository;

    private static final Map<String, String> RELANCE_VARS = Map.of(
            "debt_reference", "DEB-RELANCE-TEST",
            "amount", "150000",
            "due_date", "2026-10-01");

    @BeforeEach
    void authenticateAgent() {
        User agent = userRepository.findByUsername("agent.relance.test").orElseGet(() -> {
            Role adminRole = roleRepository.findByCode(Role.ADMIN).orElseGet(() ->
                    roleRepository.save(Role.builder()
                            .code(Role.ADMIN).name("Administrateur").system(true).build()));
            return userRepository.save(User.builder()
                    .username("agent.relance.test")
                    .email("agent.relance.test@demo.mg")
                    .password("n/a")
                    .firstName("Agent")
                    .lastName("Relance")
                    .enabled(true)
                    .mustChangePassword(false)
                    .mfaEnabled(false)
                    .createdAt(Instant.now())
                    .updatedAt(Instant.now())
                    .roles(java.util.Set.of(adminRole))
                    .build());
        });
        com.mnktax.auth.security.CustomUserDetails principal =
                new com.mnktax.auth.security.CustomUserDetails(agent.getId(), "agent.relance.test", "pwd", true,
                        List.of(new SimpleGrantedAuthority("ROLE_ADMIN"),
                                new SimpleGrantedAuthority("PERMISSION_MESSAGE_READ"),
                                new SimpleGrantedAuthority("PERMISSION_MESSAGE_WRITE"),
                                new SimpleGrantedAuthority("PERMISSION_MESSAGE_MANAGE")));
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, "pwd", principal.getAuthorities()));
    }

    // ── Données ────────────────────────────────────────────────────

    private User user(String username, String email) {
        return userRepository.findByUsername(username).orElseGet(() -> {
            Role role = roleRepository.findByCode(Role.TAXPAYER).orElseGet(() ->
                    roleRepository.save(Role.builder()
                            .code(Role.TAXPAYER).name("Contribuable").system(true).build()));
            return userRepository.save(User.builder()
                    .username(username)
                    .email(email)
                    .password("n/a")
                    .enabled(true)
                    .mustChangePassword(false)
                    .mfaEnabled(false)
                    .createdAt(Instant.now())
                    .updatedAt(Instant.now())
                    .roles(java.util.Set.of(role))
                    .build());
        });
    }

    /** Fiche contribuable : aucune préférence explicite → défaut IN_APP,EMAIL (entité + V38). */
    private Taxpayer taxpayer(String nif, String email, Long userId) {
        Taxpayer taxpayer = taxpayerRepository.findByNif(nif).orElseGet(() ->
                taxpayerRepository.save(Taxpayer.builder()
                        .nif(nif)
                        .type(TaxpayerType.PERSON)
                        .name("Contribuable relance " + nif)
                        .status(TaxpayerStatus.ACTIVE)
                        .createdAt(Instant.now())
                        .updatedAt(Instant.now())
                        .build()));
        taxpayer.setEmail(email);
        taxpayer.setUserId(userId);
        taxpayer.setPhone(null);
        taxpayer.setPhoneNormalized(null);
        return taxpayerRepository.save(taxpayer);
    }

    /** Dernière communication automatique du type donné + ses livraisons. */
    private List<MessageDelivery> latestAutomaticDeliveries(Taxpayer taxpayer,
                                                            CommunicationEventType type) {
        List<Message> recent = communicationService.findRecentAutomatic(
                taxpayer.getId(), type.name(), Instant.now().minusSeconds(120));
        assertTrue(!recent.isEmpty(),
                "Une communication automatique " + type + " doit exister pour " + taxpayer.getNif());
        return deliveryRepository.findByMessageId(recent.get(0).getId());
    }

    private static List<DeliveryChannel> channelsOf(List<MessageDelivery> deliveries) {
        return deliveries.stream().map(MessageDelivery::getChannel).toList();
    }

    private static MessageDelivery byChannel(List<MessageDelivery> deliveries, DeliveryChannel channel) {
        return deliveries.stream()
                .filter(d -> d.getChannel() == channel)
                .findFirst()
                .orElseThrow(() -> new AssertionError(
                        "Canal " + channel + " absent : " + channelsOf(deliveries)));
    }

    // ── Tests ──────────────────────────────────────────────────────

    @Test
    @DisplayName("Préférences par défaut : la relance automatique part en EMAIL (et IN_APP)")
    void defaultPreferencesIncludeEmail() {
        User compte = user("tp.relance.default", "compte.default@demo.mg");
        Taxpayer taxpayer = taxpayer("0000999910", "fiche.relance@demo.mg", compte.getId());

        eventEngine.onEvent(CommunicationEventType.DEBT_OVERDUE_RELANCE, taxpayer, RELANCE_VARS);

        List<MessageDelivery> deliveries =
                latestAutomaticDeliveries(taxpayer, CommunicationEventType.DEBT_OVERDUE_RELANCE);
        assertTrue(channelsOf(deliveries).contains(DeliveryChannel.EMAIL),
                "Le canal EMAIL doit être inclus avec les préférences par défaut : " + channelsOf(deliveries));
        assertTrue(channelsOf(deliveries).contains(DeliveryChannel.IN_APP));
        assertEquals("fiche.relance@demo.mg",
                byChannel(deliveries, DeliveryChannel.EMAIL).getRecipientAddress(),
                "L'email part vers la VRAIE adresse de la fiche");
    }

    @Test
    @DisplayName("Sans compte utilisateur : l'email automatique part quand même")
    void automatedEmailWithoutUserAccount() {
        Taxpayer taxpayer = taxpayer("0000999911", "sans.compte@demo.mg", null);

        eventEngine.onEvent(CommunicationEventType.DEBT_OVERDUE_RELANCE, taxpayer, RELANCE_VARS);

        List<MessageDelivery> deliveries =
                latestAutomaticDeliveries(taxpayer, CommunicationEventType.DEBT_OVERDUE_RELANCE);
        assertEquals(1, deliveries.size(),
                "Sans compte : EMAIL seul (IN_APP retiré, boîte orpheline) : " + channelsOf(deliveries));
        assertEquals(DeliveryChannel.EMAIL, deliveries.get(0).getChannel());
        assertEquals("sans.compte@demo.mg", deliveries.get(0).getRecipientAddress());

        List<Message> recent = communicationService.findRecentAutomatic(
                taxpayer.getId(), CommunicationEventType.DEBT_OVERDUE_RELANCE.name(),
                Instant.now().minusSeconds(120));
        Message message = recent.get(0);
        assertNull(message.getRecipientId(), "Pas de destinataire de compte");
        assertEquals("sans.compte@demo.mg", message.getRecipientEmail(),
                "L'adresse email réelle doit être tracée sur le message");
    }

    @Test
    @DisplayName("Fiche sans email : repli sur l'email du compte lié")
    void emailFallsBackToLinkedUserEmail() {
        User compte = user("tp.relance.lien", "compte.lien@demo.mg");
        Taxpayer taxpayer = taxpayer("0000999912", null, compte.getId());

        eventEngine.onEvent(CommunicationEventType.DEBT_OVERDUE_RELANCE, taxpayer, RELANCE_VARS);

        List<MessageDelivery> deliveries =
                latestAutomaticDeliveries(taxpayer, CommunicationEventType.DEBT_OVERDUE_RELANCE);
        assertTrue(channelsOf(deliveries).contains(DeliveryChannel.EMAIL));
        assertEquals("compte.lien@demo.mg",
                byChannel(deliveries, DeliveryChannel.EMAIL).getRecipientAddress(),
                "Repli sur l'email du compte lié attendu");
    }

    @Test
    @DisplayName("Envoi manuel : l'agent relance par EMAIL un contribuable sans compte")
    void manualEmailToAccountlessTaxpayer() {
        Taxpayer taxpayer = taxpayer("0000999913", "manuel.sans.compte@demo.mg", null);

        ComposeResult result = communicationService.compose(new ComposeRequest(
                taxpayer.getId(), null, null, "SINGLE", null, null,
                List.of("IN_APP", "EMAIL"), "Relance manuelle", "Votre solde est dû de 150 000 MGA.",
                null, null, "HIGH", "DEBT_OVERDUE_RELANCE", null, true,
                null, null, null, null), null);

        assertEquals(1, result.recipients());
        List<MessageDelivery> deliveries =
                deliveryRepository.findByMessageId(result.messageId());
        assertEquals(1, deliveries.size(),
                "IN_APP retiré sans compte, EMAIL conservé : " + channelsOf(deliveries));
        assertEquals(DeliveryChannel.EMAIL, deliveries.get(0).getChannel());
        assertEquals("manuel.sans.compte@demo.mg", deliveries.get(0).getRecipientAddress());
    }

    @Test
    @DisplayName("Aucun canal joignable : échec explicite, jamais d'envoi silencieux")
    void unreachableRecipientFailsExplicitly() {
        Taxpayer taxpayer = taxpayer("0000999914", null, null);

        BusinessException ex = assertThrows(BusinessException.class, () ->
                communicationService.compose(new ComposeRequest(
                        taxpayer.getId(), null, null, "SINGLE", null, null,
                        List.of("IN_APP", "EMAIL"), "Injoignable", "Aucun canal.",
                        null, null, "NORMAL", "GENERAL", null, true,
                        null, null, null, null), null));
        assertEquals("NO_RECIPIENT", ex.getCode());
    }
}
