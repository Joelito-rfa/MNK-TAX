package com.mnktax.communication;

import com.mnktax.communication.config.CommunicationProperties;
import com.mnktax.communication.entity.DeliveryChannel;
import com.mnktax.communication.entity.DeliveryStatus;
import com.mnktax.communication.entity.MessageDelivery;
import com.mnktax.communication.entity.MessageStatus;
import com.mnktax.communication.provider.EmailProvider;
import com.mnktax.communication.repository.MessageDeliveryRepository;
import com.mnktax.communication.service.DeliveryQueueService;
import com.mnktax.message.entity.Message;
import com.mnktax.message.repository.MessageRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.context.ActiveProfiles;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

/**
 * Relance automatique des emails en retard :
 * <ul>
 *   <li>un échec temporaire épuisé est remis en file après un délai progressif ;</li>
 *   <li>les erreurs définitives (adresse invalide) ne sont jamais rejouées seules ;</li>
 *   <li>les plafonds de cycles et d'âge sont respectés ;</li>
 *   <li>une livraison bloquée en SENDING est récupérée ;</li>
 *   <li>la relance manuelle reste possible et ouvre un nouveau budget.</li>
 * </ul>
 */
@SpringBootTest
@ActiveProfiles("test")
class DeliveryQueueAutoRetryIntegrationTest {

    @Autowired private DeliveryQueueService deliveryQueueService;
    @Autowired private MessageDeliveryRepository deliveryRepository;
    @Autowired private MessageRepository messageRepository;
    @Autowired private CommunicationProperties properties;
    @MockBean private EmailProvider emailProvider;

    @BeforeEach
    void setUp() {
        when(emailProvider.isConfigured()).thenReturn(true);
    }

    @Test
    @DisplayName("Un email en échec temporaire est remis en file automatiquement")
    void requeuesTemporaryFailedEmail() {
        Message message = createMessage(MessageStatus.FAILED);
        MessageDelivery delivery = createDelivery(message, DeliveryStatus.FAILED,
                0, true, Instant.now().minus(2, ChronoUnit.HOURS),
                Instant.now().minus(1, ChronoUnit.HOURS));

        deliveryQueueService.retryLateDeliveries();

        MessageDelivery reloaded = deliveryRepository.findById(delivery.getId()).orElseThrow();
        assertEquals(DeliveryStatus.PENDING, reloaded.getStatus());
        assertEquals(0, reloaded.getAttemptCount(), "Le nouveau cycle repart de zéro");
        assertEquals(1, reloaded.getAutoRetryCount());
        assertNotNull(reloaded.getNextRetryAt());
        assertFalse(reloaded.getNextRetryAt().isAfter(Instant.now()));
        assertEquals(MessageStatus.QUEUED,
                messageRepository.findById(message.getId()).orElseThrow().getStatus());
    }

    @Test
    @DisplayName("Le nombre maximal de cycles de relance automatique est respecté")
    void stopsAfterMaxAutoRetryCycles() {
        int max = properties.getQueue().getAutoRetryMaxCycles();
        Message message = createMessage(MessageStatus.FAILED);
        MessageDelivery delivery = createDelivery(message, DeliveryStatus.FAILED,
                max, true, Instant.now().minus(10, ChronoUnit.HOURS),
                Instant.now().minus(5, ChronoUnit.HOURS));

        deliveryQueueService.retryLateDeliveries();

        MessageDelivery reloaded = deliveryRepository.findById(delivery.getId()).orElseThrow();
        assertEquals(DeliveryStatus.FAILED, reloaded.getStatus());
        assertEquals(max, reloaded.getAutoRetryCount());
    }

    @Test
    @DisplayName("Un échec trop ancien n'est pas relancé automatiquement")
    void doesNotRequeueFailureOlderThanMaxAge() {
        long maxAge = properties.getQueue().getAutoRetryMaxAgeHours();
        Instant oldFailure = Instant.now().minus(maxAge + 2, ChronoUnit.HOURS);
        Message message = createMessage(MessageStatus.FAILED);
        MessageDelivery delivery = createDelivery(message, DeliveryStatus.FAILED,
                0, true, oldFailure.minus(1, ChronoUnit.HOURS), oldFailure);

        deliveryQueueService.retryLateDeliveries();

        assertEquals(DeliveryStatus.FAILED,
                deliveryRepository.findById(delivery.getId()).orElseThrow().getStatus());
    }

    @Test
    @DisplayName("Une erreur définitive (adresse invalide) n'est pas rejouée automatiquement")
    void doesNotRequeuePermanentFailure() {
        Message message = createMessage(MessageStatus.FAILED);
        MessageDelivery delivery = createDelivery(message, DeliveryStatus.FAILED,
                0, false, Instant.now().minus(2, ChronoUnit.HOURS),
                Instant.now().minus(1, ChronoUnit.HOURS));

        deliveryQueueService.retryLateDeliveries();

        assertEquals(DeliveryStatus.FAILED,
                deliveryRepository.findById(delivery.getId()).orElseThrow().getStatus());
    }

    @Test
    @DisplayName("Le délai progressif entre deux cycles est respecté")
    void respectsProgressiveCooldown() {
        Message message = createMessage(MessageStatus.FAILED);
        MessageDelivery delivery = createDelivery(message, DeliveryStatus.FAILED,
                0, true, Instant.now().minus(1, ChronoUnit.HOURS),
                Instant.now().minus(1, ChronoUnit.MINUTES));

        deliveryQueueService.retryLateDeliveries();

        assertEquals(DeliveryStatus.FAILED,
                deliveryRepository.findById(delivery.getId()).orElseThrow().getStatus(),
                "Une relance ne doit pas partir immédiatement après l'échec");
    }

    @Test
    @DisplayName("Une livraison bloquée en SENDING est récupérée")
    void recoversStaleSendingDelivery() {
        long staleMinutes = properties.getQueue().getStaleSendingMinutes();
        Instant staleAt = Instant.now().minus(staleMinutes + 2, ChronoUnit.MINUTES);
        Message message = createMessage(MessageStatus.SENDING);
        MessageDelivery delivery = createDelivery(message, DeliveryStatus.SENDING,
                0, true, staleAt.minus(1, ChronoUnit.HOURS), staleAt);

        deliveryQueueService.retryLateDeliveries();

        MessageDelivery reloaded = deliveryRepository.findById(delivery.getId()).orElseThrow();
        assertEquals(DeliveryStatus.PENDING, reloaded.getStatus());
        assertEquals(1, reloaded.getAutoRetryCount());
        assertNotNull(reloaded.getNextRetryAt());
        assertEquals(MessageStatus.QUEUED,
                messageRepository.findById(message.getId()).orElseThrow().getStatus());
    }

    @Test
    @DisplayName("Une livraison SENDING bloquée au-delà du plafond passe en échec explicite")
    void failsStaleSendingAfterMaxCycles() {
        int max = properties.getQueue().getAutoRetryMaxCycles();
        long staleMinutes = properties.getQueue().getStaleSendingMinutes();
        Instant staleAt = Instant.now().minus(staleMinutes + 2, ChronoUnit.MINUTES);
        Message message = createMessage(MessageStatus.SENDING);
        MessageDelivery delivery = createDelivery(message, DeliveryStatus.SENDING,
                max, true, staleAt.minus(1, ChronoUnit.HOURS), staleAt);

        deliveryQueueService.retryLateDeliveries();

        MessageDelivery reloaded = deliveryRepository.findById(delivery.getId()).orElseThrow();
        assertEquals(DeliveryStatus.FAILED, reloaded.getStatus());
        assertTrue(reloaded.getLastError().contains("épuisée"), reloaded.getLastError());
        assertFalse(reloaded.isLastErrorRetryable());
    }

    @Test
    @DisplayName("Aucune relance automatique tant que le fournisseur email n'est pas configuré")
    void skipsAutoRetryWhenProviderIsNotConfigured() {
        when(emailProvider.isConfigured()).thenReturn(false);
        Message message = createMessage(MessageStatus.FAILED);
        MessageDelivery delivery = createDelivery(message, DeliveryStatus.FAILED,
                0, true, Instant.now().minus(2, ChronoUnit.HOURS),
                Instant.now().minus(1, ChronoUnit.HOURS));

        deliveryQueueService.retryLateDeliveries();

        assertEquals(DeliveryStatus.FAILED,
                deliveryRepository.findById(delivery.getId()).orElseThrow().getStatus(),
                "Sans fournisseur, la relance ne ferait que consommer des cycles inutilement");
    }

    @Test
    @DisplayName("La relance manuelle reste possible et ouvre un nouveau budget automatique")
    void manualRetryResetsAutoRetryBudget() {
        int max = properties.getQueue().getAutoRetryMaxCycles();
        Message message = createMessage(MessageStatus.FAILED);
        MessageDelivery delivery = createDelivery(message, DeliveryStatus.FAILED,
                max, false, Instant.now().minus(10, ChronoUnit.HOURS),
                Instant.now().minus(1, ChronoUnit.HOURS));

        boolean retried = deliveryQueueService.retryDelivery(delivery.getId());

        assertTrue(retried);
        MessageDelivery reloaded = deliveryRepository.findById(delivery.getId()).orElseThrow();
        assertEquals(DeliveryStatus.PENDING, reloaded.getStatus());
        assertEquals(0, reloaded.getAttemptCount());
        assertEquals(0, reloaded.getAutoRetryCount());
        assertNotNull(reloaded.getNextRetryAt());
        assertEquals(MessageStatus.QUEUED,
                messageRepository.findById(message.getId()).orElseThrow().getStatus());
    }

    private Message createMessage(MessageStatus status) {
        Instant now = Instant.now();
        return messageRepository.save(Message.builder()
                .senderName("Test relance")
                .content("Contenu de test pour la relance automatique.")
                .subject("Relance email")
                .channels("EMAIL")
                .threadId(0L)
                .status(status)
                .createdAt(now.minus(2, ChronoUnit.HOURS))
                .updatedAt(now.minus(2, ChronoUnit.HOURS))
                .build());
    }

    private MessageDelivery createDelivery(Message message, DeliveryStatus status,
                                           int autoRetryCount, boolean retryable,
                                           Instant createdAt, Instant updatedAt) {
        return deliveryRepository.save(MessageDelivery.builder()
                .messageId(message.getId())
                .channel(DeliveryChannel.EMAIL)
                .recipientAddress("retry-" + UUID.randomUUID() + "@example.mg")
                .status(status)
                .attemptCount(3)
                .maxAttempts(3)
                .autoRetryCount(autoRetryCount)
                .lastErrorRetryable(retryable)
                .lastError(retryable
                        ? "Erreur réseau temporaire"
                        : "Échec MailerSend (HTTP 422) : Invalid recipient")
                .lastAttemptAt(status == DeliveryStatus.SENDING ? updatedAt : null)
                .createdAt(createdAt)
                .updatedAt(updatedAt)
                .build());
    }
}
