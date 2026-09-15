package com.mnktax.communication;

import com.mnktax.auth.entity.Role;
import com.mnktax.auth.entity.User;
import com.mnktax.auth.repository.UserRepository;
import com.mnktax.communication.dto.CommunicationDtos.ComposeRequest;
import com.mnktax.communication.dto.CommunicationDtos.ComposeResult;
import com.mnktax.communication.dto.CommunicationDtos.TemplateRenderResult;
import com.mnktax.communication.entity.DeliveryChannel;
import com.mnktax.communication.entity.DeliveryStatus;
import com.mnktax.communication.entity.MessageDelivery;
import com.mnktax.communication.entity.MessageTemplate;
import com.mnktax.communication.repository.MessageDeliveryRepository;
import com.mnktax.communication.repository.MessageTemplateRepository;
import com.mnktax.communication.service.CommunicationService;
import com.mnktax.communication.service.DeliveryQueueService;
import com.mnktax.message.entity.Message;
import com.mnktax.message.repository.MessageRepository;
import com.mnktax.message.service.MessageService;
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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Cycle de vie réel du centre de communication :
 * composeur → livraisons PENDING → worker → SENT (IN_APP) / FAILED explicite
 * (email/SMS sans fournisseur) → retry → accusé de lecture.
 */
/**
 * Sans @Transactional : le worker tourne en REQUIRES_NEW et doit voir les
 * livraisons réellement validées, comme en production.
 */
@SpringBootTest
@ActiveProfiles("test")
class CommunicationLifecycleIntegrationTest {

    @Autowired private CommunicationService communicationService;
    @Autowired private DeliveryQueueService deliveryQueueService;
    @Autowired private MessageRepository messageRepository;
    @Autowired private MessageDeliveryRepository deliveryRepository;
    @Autowired private MessageTemplateRepository templateRepository;
    @Autowired private TaxpayerRepository taxpayerRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private com.mnktax.auth.repository.RoleRepository roleRepository;
    @Autowired private MessageService messageService;

    private Taxpayer taxpayer;
    private User taxpayerUser;
    private Long agentUserId;

    @BeforeEach
    void setUp() {
        // Agent réel (FK messages.sender_id → users.id) authentifié pour senderId / audit.
        User agent = userRepository.findByUsername("agent.comm.test").orElseGet(() -> {
            Role adminRole = roleRepository.findByCode(Role.ADMIN).orElseGet(() ->
                    roleRepository.save(Role.builder()
                            .code(Role.ADMIN).name("Administrateur").system(true).build()));
            return userRepository.save(User.builder()
                    .username("agent.comm.test")
                    .email("agent.comm.test@demo.mg")
                    .password("n/a")
                    .firstName("Agent")
                    .lastName("Communication")
                    .enabled(true)
                    .mustChangePassword(false)
                    .mfaEnabled(false)
                    .createdAt(Instant.now())
                    .updatedAt(Instant.now())
                    .roles(java.util.Set.of(adminRole))
                    .build());
        });
        agentUserId = agent.getId();
        com.mnktax.auth.security.CustomUserDetails principal =
                new com.mnktax.auth.security.CustomUserDetails(agentUserId, "agent.comm.test", "pwd", true,
                        List.of(new SimpleGrantedAuthority("ROLE_ADMIN"),
                                new SimpleGrantedAuthority("PERMISSION_MESSAGE_READ"),
                                new SimpleGrantedAuthority("PERMISSION_MESSAGE_WRITE"),
                                new SimpleGrantedAuthority("PERMISSION_MESSAGE_MANAGE")));
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, "pwd", principal.getAuthorities()));

        // Utilisateur + contribuable de test avec langue MG (multilingue).
        taxpayerUser = userRepository.findByUsername("tp.comm.test").orElseGet(() -> {
            Role taxpayerRole = roleRepository.findByCode(Role.TAXPAYER).orElseGet(() ->
                    roleRepository.save(Role.builder()
                            .code(Role.TAXPAYER).name("Contribuable").system(true).build()));
            User user = User.builder()
                    .username("tp.comm.test")
                    .email("tp.comm.test@demo.mg")
                    .password("n/a")
                    .enabled(true)
                    .mustChangePassword(false)
                    .mfaEnabled(false)
                    .createdAt(Instant.now())
                    .updatedAt(Instant.now())
                    .roles(java.util.Set.of(taxpayerRole))
                    .build();
            return userRepository.save(user);
        });

        taxpayer = taxpayerRepository.findByNif("0000999901").orElseGet(() ->
                taxpayerRepository.save(Taxpayer.builder()
                        .nif("0000999901")
                        .type(TaxpayerType.PERSON)
                        .name("Contribuable Communication Test")
                        .email("tp.comm.test@demo.mg")
                        .phone("034 99 888 77")
                        .phoneNormalized("+261349988877")
                        .language("MG")
                        .preferredChannels("IN_APP,EMAIL,SMS")
                        .status(TaxpayerStatus.ACTIVE)
                        .createdAt(Instant.now())
                        .updatedAt(Instant.now())
                        .build()));
        if (taxpayer.getUserId() == null) {
            taxpayer.setUserId(taxpayerUser.getId());
            taxpayer = taxpayerRepository.save(taxpayer);
        }
    }

    @Test
    @DisplayName("Envoi IN_APP : message + livraison PENDING puis SENT par le worker")
    void inAppDeliveryLifecycle() {
        ComposeResult result = communicationService.compose(new ComposeRequest(
                taxpayer.getId(), null, null, "SINGLE", null, null,
                List.of("IN_APP"), "Échéance TVA", "Votre déclaration arrive à échéance.",
                null, null, "HIGH", "TAX_DEADLINE", null, true), null);

        assertEquals("QUEUED", result.status());
        assertEquals(1, result.recipients());

        Message message = messageRepository.findById(result.messageId()).orElseThrow();
        List<MessageDelivery> deliveries = deliveryRepository.findByMessageId(message.getId());
        assertEquals(1, deliveries.size());
        assertEquals(DeliveryChannel.IN_APP, deliveries.get(0).getChannel());
        assertEquals(DeliveryStatus.PENDING, deliveries.get(0).getStatus());

        // Worker réel (REQUIRES_NEW : relit l'entité dans une nouvelle transaction)
        deliveryQueueService.selfProcess(deliveries.get(0).getId());

        MessageDelivery delivered = deliveryRepository.findById(deliveries.get(0).getId()).orElseThrow();
        assertEquals(DeliveryStatus.SENT, delivered.getStatus(), "Livraison interne confirmée");
        assertEquals(com.mnktax.communication.entity.MessageStatus.SENT,
                messageRepository.findById(message.getId()).orElseThrow().getStatus());

    }

    @Test
    @DisplayName("Email/SMS sans fournisseur : FAILED explicite, jamais de faux 'envoyé'")
    void missingProviderFailsExplicitly() {
        ComposeResult result = communicationService.compose(new ComposeRequest(
                taxpayer.getId(), null, null, "SINGLE", null, null,
                List.of("IN_APP", "EMAIL", "SMS"), "Créance en retard", "Relance : créance impayée.",
                null, null, "URGENT", "OVERDUE", null, true), null);

        Message message = messageRepository.findById(result.messageId()).orElseThrow();
        List<MessageDelivery> deliveries = deliveryRepository.findByMessageId(message.getId());
        assertEquals(3, deliveries.size());

        deliveries.forEach(d -> deliveryQueueService.selfProcess(d.getId()));

        for (MessageDelivery delivery : deliveryRepository.findByMessageId(message.getId())) {
            switch (delivery.getChannel()) {
                case IN_APP -> assertEquals(DeliveryStatus.SENT, delivery.getStatus());
                case EMAIL -> {
                    assertEquals(DeliveryStatus.FAILED, delivery.getStatus());
                    assertTrue(delivery.getLastError().contains("non configuré"),
                            "Erreur explicite attendue : " + delivery.getLastError());
                }
                case SMS -> {
                    assertEquals(DeliveryStatus.FAILED, delivery.getStatus());
                    assertTrue(delivery.getLastError().contains("non configuré"),
                            "Erreur explicite attendue : " + delivery.getLastError());
                }
            }
        }
        // Le message reste SENT (au moins un canal confirmé) mais l'erreur est tracée.
        assertEquals(com.mnktax.communication.entity.MessageStatus.SENT,
                messageRepository.findById(message.getId()).orElseThrow().getStatus());
    }

    @Test
    @DisplayName("Modèle multilingue : la langue du contribuable (MG) est respectée")
    void templateRespectsTaxpayerLanguage() {
        MessageTemplate template = templateRepository.findByCode("DEBT_OVERDUE").orElseThrow();
        String rendered = CommunicationService.renderVars(
                template.bodyFor(taxpayer.getLanguage()),
                java.util.Map.of("taxpayer_name", taxpayer.getName(),
                        "debt_reference", "DEB-TEST-1", "amount", "150000", "due_date", "2026-09-01"));
        assertTrue(rendered.contains("Salama"), "Corps malgache attendu pour langue MG");
        assertTrue(rendered.contains("DEB-TEST-1"));

        TemplateRenderResult fr = communicationService.renderTemplate(
                new com.mnktax.communication.dto.CommunicationDtos.TemplateRenderRequest(
                        "DEBT_OVERDUE", "FR",
                        java.util.Map.of("taxpayer_name", "X", "debt_reference", "D1",
                                "amount", "1", "due_date", "2026-09-01")));
        assertTrue(fr.body().contains("Bonjour"));
    }

    @Test
    @DisplayName("Programmation : SCHEDULED puis envoi à l'échéance ; annulation possible")
    void scheduledAndCancel() {
        Instant future = Instant.now().plusSeconds(3600);
        ComposeResult result = communicationService.compose(new ComposeRequest(
                taxpayer.getId(), null, null, "SINGLE", null, null,
                List.of("IN_APP"), "Programmé", "Message futur.",
                null, null, "NORMAL", "GENERAL", future.toString(), true), null);

        Message message = messageRepository.findById(result.messageId()).orElseThrow();
        assertEquals(com.mnktax.communication.entity.MessageStatus.SCHEDULED, message.getStatus());
        assertEquals(future.toEpochMilli() / 1000,
                message.getScheduledAt().toEpochMilli() / 1000);

        // La livraison n'est pas éligible avant l'échéance.
        MessageDelivery delivery = deliveryRepository.findByMessageId(message.getId()).get(0);
        assertTrue(delivery.getNextRetryAt().isAfter(Instant.now().minusSeconds(60)));

        communicationService.cancelScheduled(message.getId(), null);
        assertEquals(com.mnktax.communication.entity.MessageStatus.CANCELLED,
                messageRepository.findById(message.getId()).orElseThrow().getStatus());
        assertEquals(DeliveryStatus.CANCELLED,
                deliveryRepository.findById(delivery.getId()).orElseThrow().getStatus());
    }

    @Test
    @DisplayName("Accusé de lecture : la livraison IN_APP passe à READ")
    void readReceipt() {
        ComposeResult result = communicationService.compose(new ComposeRequest(
                taxpayer.getId(), null, null, "SINGLE", null, null,
                List.of("IN_APP"), "Lu/non lu", "Contenu.",
                null, null, "NORMAL", "GENERAL", null, true), null);

        deliveryQueueService.selfProcess(
                deliveryRepository.findByMessageId(result.messageId()).get(0).getId());

        deliveryQueueService.markInAppDeliveryRead(result.messageId());
        assertEquals(DeliveryStatus.READ,
                deliveryRepository.findByMessageId(result.messageId()).get(0).getStatus());
    }

    @Test
    @DisplayName("Lecture par le destinataire : message.read + livraison READ synchronisés")
    void markReadSynchronizesDelivery() {
        ComposeResult result = communicationService.compose(new ComposeRequest(
                taxpayer.getId(), taxpayerUser.getId(), null, "SINGLE", null, null,
                List.of("IN_APP"), "Synchronisation lecture", "Contenu lu.",
                null, null, "NORMAL", "GENERAL", null, true), null);

        deliveryQueueService.selfProcess(
                deliveryRepository.findByMessageId(result.messageId()).get(0).getId());

        // Le destinataire ouvre le message (flux réel MessageService.markRead).
        com.mnktax.auth.security.CustomUserDetails recipient =
                new com.mnktax.auth.security.CustomUserDetails(taxpayerUser.getId(), "tp.comm.test", "pwd", true,
                        List.of(new SimpleGrantedAuthority("ROLE_TAXPAYER"),
                                new SimpleGrantedAuthority("PERMISSION_MESSAGE_READ")));
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(recipient, "pwd", recipient.getAuthorities()));

        messageService.markRead(result.messageId(), null);

        Message read = messageRepository.findById(result.messageId()).orElseThrow();
        assertTrue(read.isRead(), "Le message doit être marqué lu");
        assertNotNull(read.getReadAt());
        assertEquals(DeliveryStatus.READ,
                deliveryRepository.findByMessageId(result.messageId()).get(0).getStatus(),
                "La livraison IN_APP doit être synchronisée à READ");
    }

    @Test
    @DisplayName("Anti-doublon : une communication automatique récente est détectée")
    void recentAutomaticDedup() {
        communicationService.compose(new ComposeRequest(
                taxpayer.getId(), null, null, "SINGLE", null, null,
                List.of("IN_APP"), "Rappel", "Contenu.",
                null, null, "NORMAL", "DECLARATION_DUE_SOON", null, true), null);

        var recent = communicationService.findRecentAutomatic(
                taxpayer.getId(), "DECLARATION_DUE_SOON", Instant.now().minus(java.time.Duration.ofDays(3)));
        assertTrue(!recent.isEmpty(), "Une communication récente du même type doit être détectée");

        var none = communicationService.findRecentAutomatic(
                taxpayer.getId(), "DEBT_OVERDUE_RELANCE", Instant.now().minus(java.time.Duration.ofDays(3)));
        assertTrue(none.isEmpty(), "Aucune communication d'un autre type ne doit être détectée");

        var old = communicationService.findRecentAutomatic(
                taxpayer.getId(), "DECLARATION_DUE_SOON", Instant.now().plus(java.time.Duration.ofDays(1)));
        assertTrue(old.isEmpty(), "Une fenêtre future ne doit rien détecter");
    }
}
