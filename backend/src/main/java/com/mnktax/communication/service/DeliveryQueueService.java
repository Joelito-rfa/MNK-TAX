package com.mnktax.communication.service;

import com.mnktax.communication.config.CommunicationProperties;
import com.mnktax.communication.entity.CommunicationChannel;
import com.mnktax.communication.entity.DeliveryChannel;
import com.mnktax.communication.entity.DeliveryStatus;
import com.mnktax.communication.entity.MessageDelivery;
import com.mnktax.communication.provider.EmailAttachment;
import com.mnktax.communication.provider.EmailProvider;
import com.mnktax.communication.provider.ProviderResult;
import com.mnktax.communication.provider.SmsProvider;
import com.mnktax.audit.service.AuditService;
import com.mnktax.communication.repository.MessageDeliveryRepository;
import com.mnktax.message.entity.Message;
import com.mnktax.message.entity.MessageAttachment;
import com.mnktax.message.repository.MessageAttachmentRepository;
import com.mnktax.message.repository.MessageRepository;
import com.mnktax.notification.entity.Notification;
import com.mnktax.notification.repository.NotificationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;

/**
 * File d'envoi réelle : IN_APP (livraison immédiate), EMAIL et SMS via
 * fournisseurs externes, avec retry exponentiel simple et statuts véridiques.
 *
 * RÈGLE CRITIQUE : un statut SENT n'est jamais écrit sans confirmation du
 * fournisseur. Sans fournisseur configuré, la livraison passe FAILED avec
 * un motif explicite ("Service email non configuré").
 */
@Service
public class DeliveryQueueService {

    private static final Logger log = LoggerFactory.getLogger(DeliveryQueueService.class);

    private final MessageDeliveryRepository deliveryRepository;
    private final MessageRepository messageRepository;
    private final MessageAttachmentRepository attachmentRepository;
    private final NotificationRepository notificationRepository;
    private final EmailProvider emailProvider;
    private final SmsProvider smsProvider;
    private final EmailTemplateRenderer emailRenderer;
    private final CommunicationProperties properties;
    private final AuditService auditService;

    public DeliveryQueueService(MessageDeliveryRepository deliveryRepository,
                                MessageRepository messageRepository,
                                MessageAttachmentRepository attachmentRepository,
                                NotificationRepository notificationRepository,
                                EmailProvider emailProvider,
                                SmsProvider smsProvider,
                                EmailTemplateRenderer emailRenderer,
                                CommunicationProperties properties,
                                AuditService auditService) {
        this.deliveryRepository = deliveryRepository;
        this.messageRepository = messageRepository;
        this.attachmentRepository = attachmentRepository;
        this.notificationRepository = notificationRepository;
        this.emailProvider = emailProvider;
        this.smsProvider = smsProvider;
        this.emailRenderer = emailRenderer;
        this.properties = properties;
        this.auditService = auditService;
    }

    /**
     * Worker périodique : traite les livraisons PENDING échues (première
     * tentative ou retry), par petits lots — jamais en masse dans une requête HTTP.
     */
    @Scheduled(fixedDelayString = "${mnk-tax.communication.queue.poll-delay-ms:20000}", initialDelay = 8000)
    public void processDueDeliveries() {
        try {
            List<MessageDelivery> due = deliveryRepository.findDue(
                    DeliveryStatus.PENDING, Instant.now(),
                    PageRequest.of(0, properties.getQueue().getBatchSize()));
            for (MessageDelivery delivery : due) {
                // Transaction indépendante : une erreur d'un canal ne bloque pas les autres.
                selfProcess(delivery.getId());
            }
        } catch (Exception ex) {
            log.error("Erreur du worker de livraison", ex);
        }
    }

    /** Passage en transaction séparée (appelé depuis le worker). */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void selfProcess(Long deliveryId) {
        MessageDelivery delivery = deliveryRepository.findById(deliveryId).orElse(null);
        if (delivery == null || delivery.isTerminal() || delivery.getStatus() != DeliveryStatus.PENDING) {
            return;
        }
        Message message = messageRepository.findById(delivery.getMessageId()).orElse(null);
        if (message == null) {
            delivery.setStatus(DeliveryStatus.FAILED);
            delivery.setLastError("Message introuvable");
            delivery.setUpdatedAt(Instant.now());
            deliveryRepository.save(delivery);
            return;
        }

        delivery.setStatus(DeliveryStatus.SENDING);
        delivery.setAttemptCount(delivery.getAttemptCount() + 1);
        delivery.setUpdatedAt(Instant.now());
        deliveryRepository.saveAndFlush(delivery);

        ProviderResult result = switch (delivery.getChannel()) {
            case IN_APP -> deliverInApp(message, delivery);
            case EMAIL -> deliverEmail(message, delivery);
            case SMS -> deliverSms(message, delivery);
        };

        applyResult(message, delivery, result);
    }

    /** Application véridique du résultat fournisseur sur la livraison + le message. */
    private void applyResult(Message message, MessageDelivery delivery, ProviderResult result) {
        Instant now = Instant.now();
        if (result.success()) {
            delivery.setStatus(DeliveryStatus.SENT);
            delivery.setSentAt(now);
            delivery.setProviderMessageId(result.providerMessageId());
            delivery.setLastError(null);
            delivery.setNextRetryAt(null);
            // Audit : envoi confirmé par le fournisseur (jamais avant).
            auditService.record("MESSAGE_SENT", "MESSAGE", String.valueOf(message.getId()),
                    null, "channel=" + delivery.getChannel().name()
                            + ", provider=" + result.providerMessageId());
        } else if (result.retryable() && delivery.getAttemptCount() < delivery.getMaxAttempts()) {
            // Retry automatique : tentative suivante avec backoff simple.
            long backoff = properties.getQueue().getRetryBackoffMinutes()
                    * delivery.getAttemptCount();
            delivery.setStatus(DeliveryStatus.PENDING);
            delivery.setLastError(truncate(result.error(), 1000));
            delivery.setNextRetryAt(now.plus(Math.max(1, backoff), ChronoUnit.MINUTES));
        } else {
            delivery.setStatus(DeliveryStatus.FAILED);
            delivery.setLastError(truncate(result.error(), 1000));
            delivery.setNextRetryAt(null);
            // Audit : échec définitif (fournisseur absent ou tentatives épuisées).
            auditService.record("MESSAGE_FAILED", "MESSAGE", String.valueOf(message.getId()),
                    null, "channel=" + delivery.getChannel().name()
                            + ", error=" + truncate(result.error(), 200));
        }
        delivery.setUpdatedAt(now);
        deliveryRepository.save(delivery);

        refreshMessageStatus(message);
    }

    /** Recalcule le statut agrégé du message depuis ses livraisons. */
    private void refreshMessageStatus(Message message) {
        List<MessageDelivery> deliveries = deliveryRepository.findByMessageId(message.getId());
        com.mnktax.communication.entity.MessageStatus aggregate =
                aggregateStatus(deliveries, message.getStatus());
        if (aggregate != message.getStatus()) {
            message.setStatus(aggregate);
            message.setUpdatedAt(Instant.now());
            if (aggregate == com.mnktax.communication.entity.MessageStatus.FAILED) {
                message.setLastError(deliveries.stream()
                        .filter(d -> d.getStatus() == DeliveryStatus.FAILED)
                        .map(MessageDelivery::getLastError)
                        .filter(java.util.Objects::nonNull)
                        .findFirst().orElse(null));
            }
            messageRepository.save(message);
        }
    }

    /**
     * Statut agrégé : SENT dès qu'un canal est confirmé ; FAILED uniquement si
     * tous les canaux ont échoué définitivement ; SENDING si au moins une
     * tentative est en cours.
     */
    public static com.mnktax.communication.entity.MessageStatus aggregateStatus(
            List<MessageDelivery> deliveries,
            com.mnktax.communication.entity.MessageStatus current) {
        boolean anySent = deliveries.stream().anyMatch(d -> d.getStatus() == DeliveryStatus.SENT
                || d.getStatus() == DeliveryStatus.DELIVERED || d.getStatus() == DeliveryStatus.READ);
        boolean anySending = deliveries.stream().anyMatch(d -> d.getStatus() == DeliveryStatus.SENDING);
        boolean anyPending = deliveries.stream().anyMatch(d -> d.getStatus() == DeliveryStatus.PENDING);
        boolean allFailed = !deliveries.isEmpty()
                && deliveries.stream().allMatch(d -> d.getStatus() == DeliveryStatus.FAILED
                        || d.getStatus() == DeliveryStatus.BOUNCED);
        if (anySent) return com.mnktax.communication.entity.MessageStatus.SENT;
        if (allFailed) return com.mnktax.communication.entity.MessageStatus.FAILED;
        if (anySending) return com.mnktax.communication.entity.MessageStatus.SENDING;
        if (anyPending) return com.mnktax.communication.entity.MessageStatus.QUEUED;
        return current;
    }

    // ─── Canaux ─────────────────────────────────────────────────────

    /** Canal MNK-TAX : notification persistante dans le compte du contribuable. */
    private ProviderResult deliverInApp(Message message, MessageDelivery delivery) {
        Notification notification = Notification.builder()
                .userId(message.getRecipientId())
                .type(com.mnktax.notification.entity.NotificationType.MESSAGE_RECEIVED)
                .title(message.getSubject() != null ? message.getSubject() : "Nouvelle notification fiscale")
                .message(truncate(message.getContent(), 400))
                .entityType("MESSAGE")
                .entityId(String.valueOf(message.getId()))
                .read(false)
                .createdAt(Instant.now())
                .build();
        notificationRepository.save(notification);
        // Livraison interne → confirmée dès l'enregistrement en base.
        return ProviderResult.ok("in-app-" + message.getId());
    }

    /** Canal email réel : HTML professionnel + pièces jointes sécurisées. */
    private ProviderResult deliverEmail(Message message, MessageDelivery delivery) {
        String to = delivery.getRecipientAddress();
        if (to == null || to.isBlank()) {
            return ProviderResult.failure("Adresse email du destinataire inconnue.", false);
        }
        if (!emailProvider.isConfigured()) {
            return ProviderResult.failure("Envoi impossible : fournisseur email non configuré (MAIL_HOST).", false);
        }
        String html = emailRenderer.render(
                message.getSubject() != null ? message.getSubject() : "Notification fiscale",
                message.getContent(),
                "Ouvrir MNK-TAX",
                properties.getMail().getBaseUrl() + "/messages",
                message.getSubject());
        List<EmailAttachment> attachments = loadAttachments(message.getId());
        return emailProvider.send(to, message.getSubject(), html, null, attachments);
    }

    /** Canal SMS réel : texte court vers un numéro normalisé E.164. */
    private ProviderResult deliverSms(Message message, MessageDelivery delivery) {
        String to = delivery.getRecipientAddress();
        if (to == null || to.isBlank()) {
            return ProviderResult.failure("Numéro de téléphone manquant ou non normalisé.", false);
        }
        if (!smsProvider.isConfigured()) {
            return ProviderResult.failure("Envoi impossible : fournisseur SMS non configuré.", false);
        }
        String text = truncate(message.getContent(), 300);
        return smsProvider.send(to, text);
    }

    /** Pièces jointes : lues depuis le stockage sécurisé, jamais d'URL directe. */
    private List<EmailAttachment> loadAttachments(Long messageId) {
        List<MessageAttachment> attachments =
                attachmentRepository.findByMessageIdOrderByCreatedAtAsc(messageId);
        List<EmailAttachment> result = new ArrayList<>();
        for (MessageAttachment attachment : attachments) {
            try {
                Path path = Path.of("./data/message-attachments").toAbsolutePath()
                        .resolve(attachment.getFileName());
                if (Files.exists(path)) {
                    result.add(new EmailAttachment(attachment.getOriginalName(),
                            attachment.getMimeType(), Files.readAllBytes(path)));
                }
            } catch (IOException ex) {
                log.warn("Pièce jointe illisible {} : {}", attachment.getFileName(), ex.getMessage());
            }
        }
        return result;
    }

    // ─── Actions de suivi ───────────────────────────────────────────

    /** Marque une livraison READ (accusé de lecture — canal MNK-TAX). */
    @Transactional
    public void markInAppDeliveryRead(Long messageId) {
        List<MessageDelivery> deliveries =
                deliveryRepository.findByMessageIdAndChannel(messageId, DeliveryChannel.IN_APP);
        Instant now = Instant.now();
        for (MessageDelivery delivery : deliveries) {
            if (delivery.getReadAt() == null) {
                delivery.setReadAt(now);
                if (delivery.getStatus() == DeliveryStatus.SENT
                        || delivery.getStatus() == DeliveryStatus.DELIVERED) {
                    delivery.setStatus(DeliveryStatus.READ);
                }
                delivery.setUpdatedAt(now);
                deliveryRepository.save(delivery);
            }
        }
    }

    /** Relance manuelle d'un envoi échoué définitivement (AGENT). */
    @Transactional
    public boolean retryDelivery(Long deliveryId) {
        MessageDelivery delivery = deliveryRepository.findById(deliveryId).orElse(null);
        if (delivery == null) return false;
        if (delivery.getStatus() != DeliveryStatus.FAILED
                && delivery.getStatus() != DeliveryStatus.BOUNCED) {
            return false;
        }
        delivery.setStatus(DeliveryStatus.PENDING);
        delivery.setAttemptCount(0);
        delivery.setNextRetryAt(Instant.now());
        delivery.setUpdatedAt(Instant.now());
        deliveryRepository.save(delivery);

        messageRepository.findById(delivery.getMessageId()).ifPresent(message -> {
            if (message.getStatus() == com.mnktax.communication.entity.MessageStatus.FAILED) {
                message.setStatus(com.mnktax.communication.entity.MessageStatus.QUEUED);
                message.setLastError(null);
                message.setUpdatedAt(Instant.now());
                messageRepository.save(message);
            }
        });
        return true;
    }

    /** Livraisons d'un message, pour l'UI de suivi. */
    @Transactional(readOnly = true)
    public List<MessageDelivery> deliveriesOf(Long messageId) {
        return deliveryRepository.findByMessageId(messageId);
    }

    private static String truncate(String value, int max) {
        if (value == null) return null;
        return value.length() <= max ? value : value.substring(0, max);
    }
}
