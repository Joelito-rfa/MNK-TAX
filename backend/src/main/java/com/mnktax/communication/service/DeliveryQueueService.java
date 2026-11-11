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
    /** Proxy Spring du service : garantit que selfProcess() ouvre bien une nouvelle transaction. */
    private final org.springframework.beans.factory.ObjectProvider<DeliveryQueueService> self;

    public DeliveryQueueService(MessageDeliveryRepository deliveryRepository,
                                MessageRepository messageRepository,
                                MessageAttachmentRepository attachmentRepository,
                                NotificationRepository notificationRepository,
                                EmailProvider emailProvider,
                                SmsProvider smsProvider,
                                EmailTemplateRenderer emailRenderer,
                                CommunicationProperties properties,
                                AuditService auditService,
                                org.springframework.beans.factory.ObjectProvider<DeliveryQueueService> self) {
        this.deliveryRepository = deliveryRepository;
        this.messageRepository = messageRepository;
        this.attachmentRepository = attachmentRepository;
        this.notificationRepository = notificationRepository;
        this.emailProvider = emailProvider;
        this.smsProvider = smsProvider;
        this.emailRenderer = emailRenderer;
        this.properties = properties;
        this.auditService = auditService;
        this.self = self;
    }

    /**
     * Worker périodique : traite les livraisons PENDING échues (première
     * tentative ou retry), par petits lots — jamais en masse dans une requête HTTP.
     */
    @Scheduled(fixedDelayString = "${mnk-tax.communication.queue.poll-delay-ms:20000}",
            initialDelayString = "${mnk-tax.communication.queue.poll-initial-delay-ms:8000}")
    public void processDueDeliveries() {
        try {
            List<MessageDelivery> due = deliveryRepository.findDue(
                    DeliveryStatus.PENDING, Instant.now(),
                    PageRequest.of(0, properties.getQueue().getBatchSize()));
            for (MessageDelivery delivery : due) {
                // Transaction indépendante : une erreur d'un canal ne bloque pas les autres.
                // Passage par le proxy Spring : un appel direct this.selfProcess()
                // ignorerait @Transactional(REQUIRES_NEW).
                self.getObject().selfProcess(delivery.getId());
            }
        } catch (Exception ex) {
            log.error("Erreur du worker de livraison", ex);
        }
    }

    /**
     * Filet de sécurité périodique : relance les emails dont les tentatives
     * immédiates sont épuisées et récupère les livraisons restées bloquées en
     * SENDING (arrêt brutal du serveur, coupure réseau…).
     *
     * <p>La relance automatique ne concerne que les erreurs temporaires
     * ({@code lastErrorRetryable}) et reste plafonnée par la configuration.
     * Une adresse invalide (422) n'est donc jamais rejouée en boucle ; la
     * relance manuelle reste disponible pour ces cas.</p>
     */
    @Scheduled(fixedDelayString = "${mnk-tax.communication.queue.sweep-delay-ms:60000}",
            initialDelayString = "${mnk-tax.communication.queue.sweep-initial-delay-ms:20000}")
    public void retryLateDeliveries() {
        if (!properties.getQueue().isAutoRetryEnabled()) {
            return;
        }
        try {
            // Reprise des envois interrompus : toujours utile, même sans fournisseur.
            self.getObject().recoverStaleSendingDeliveries();
            if (emailProvider.isConfigured()) {
                self.getObject().requeueFailedEmailDeliveries();
            } else {
                log.debug("Relance automatique des emails ignorée : fournisseur email non configuré.");
            }
        } catch (Exception ex) {
            log.error("Erreur du balayage de relance automatique", ex);
        }
    }

    /** Remet en file les livraisons bloquées en SENDING au-delà du délai configuré. */
    @Transactional
    public void recoverStaleSendingDeliveries() {
        CommunicationProperties.Queue queue = properties.getQueue();
        Instant now = Instant.now();
        Instant threshold = now.minus(Math.max(1, queue.getStaleSendingMinutes()), ChronoUnit.MINUTES);
        List<MessageDelivery> stale = deliveryRepository.findStaleSending(
                DeliveryStatus.SENDING, threshold, PageRequest.of(0, queue.getBatchSize()));

        for (MessageDelivery delivery : stale) {
            Message message = messageRepository.findById(delivery.getMessageId()).orElse(null);
            Instant previousUpdate = delivery.getUpdatedAt();
            if (delivery.getAutoRetryCount() >= queue.getAutoRetryMaxCycles()) {
                delivery.setStatus(DeliveryStatus.FAILED);
                delivery.setLastError(truncate(
                        "Envoi interrompu — reprise automatique épuisée.", 1000));
                delivery.setLastErrorRetryable(false);
                delivery.setNextRetryAt(null);
                delivery.setUpdatedAt(now);
                deliveryRepository.save(delivery);
                if (message != null) {
                    refreshMessageStatus(message);
                    messageRepository.save(message);
                }
                auditService.record("MESSAGE_AUTO_RETRY_EXHAUSTED", "MESSAGE",
                        String.valueOf(delivery.getMessageId()), null,
                        "delivery=" + delivery.getId() + ", channel=" + delivery.getChannel().name()
                                + ", staleSince=" + previousUpdate);
                log.warn("Livraison {} bloquée en SENDING : reprise automatique épuisée "
                                + "({} cycles), passage en FAILED.",
                        delivery.getId(), delivery.getAutoRetryCount());
                continue;
            }

            int cycle = delivery.getAutoRetryCount() + 1;
            delivery.setStatus(DeliveryStatus.PENDING);
            delivery.setAutoRetryCount(cycle);
            delivery.setNextRetryAt(now);
            delivery.setLastError(truncate(
                    "Envoi interrompu — reprise automatique en cours.", 1000));
            delivery.setLastErrorRetryable(true);
            delivery.setUpdatedAt(now);
            deliveryRepository.save(delivery);
            if (message != null) {
                message.setLastError(null);
                refreshMessageStatus(message);
                messageRepository.save(message);
            }
            auditService.record("MESSAGE_DELIVERY_RECOVERED", "MESSAGE",
                    String.valueOf(delivery.getMessageId()), DeliveryStatus.SENDING.name(),
                    "delivery=" + delivery.getId() + ", channel=" + delivery.getChannel().name()
                            + ", cycle=" + cycle);
            log.warn("Livraison {} bloquée en SENDING depuis plus de {} min — remise en file "
                            + "(reprise {}/{}).",
                    delivery.getId(), queue.getStaleSendingMinutes(), cycle,
                    queue.getAutoRetryMaxCycles());
        }
    }

    /** Remet en file les emails en échec temporaire, dans la limite des cycles/âge configurés. */
    @Transactional
    public void requeueFailedEmailDeliveries() {
        CommunicationProperties.Queue queue = properties.getQueue();
        Instant now = Instant.now();
        Instant minFailedAt = now.minus(Math.max(1, queue.getAutoRetryMaxAgeHours()), ChronoUnit.HOURS);
        long baseBackoff = Math.max(1, queue.getAutoRetryBackoffMinutes());
        Instant notBefore = now.minus(baseBackoff, ChronoUnit.MINUTES);

        List<MessageDelivery> candidates = deliveryRepository.findAutoRetryCandidates(
                DeliveryStatus.FAILED, DeliveryChannel.EMAIL, queue.getAutoRetryMaxCycles(),
                minFailedAt, notBefore, PageRequest.of(0, queue.getBatchSize()));

        int requeued = 0;
        for (MessageDelivery delivery : candidates) {
            if (delivery.getRecipientAddress() == null || delivery.getRecipientAddress().isBlank()) {
                continue;
            }
            // Délai progressif : le cycle N attend base × (N + 1) minutes après l'échec.
            long cooldown = baseBackoff * (delivery.getAutoRetryCount() + 1L);
            if (delivery.getUpdatedAt().plus(cooldown, ChronoUnit.MINUTES).isAfter(now)) {
                continue;
            }

            int cycle = delivery.getAutoRetryCount() + 1;
            delivery.setStatus(DeliveryStatus.PENDING);
            delivery.setAttemptCount(0);
            delivery.setAutoRetryCount(cycle);
            delivery.setNextRetryAt(now);
            delivery.setUpdatedAt(now);
            deliveryRepository.save(delivery);

            messageRepository.findById(delivery.getMessageId()).ifPresent(message -> {
                message.setLastError(null);
                refreshMessageStatus(message);
                messageRepository.save(message);
            });
            auditService.record("MESSAGE_AUTO_RETRIED", "MESSAGE",
                    String.valueOf(delivery.getMessageId()), null,
                    "delivery=" + delivery.getId() + ", channel=EMAIL, cycle=" + cycle
                            + ", error=" + truncate(delivery.getLastError(), 200));
            log.info("Relance automatique email #{} (cycle {}/{}) pour le message {}.",
                    delivery.getId(), cycle, queue.getAutoRetryMaxCycles(), delivery.getMessageId());
            requeued++;
        }
        if (requeued > 0) {
            log.info("Relance automatique : {} email(s) remis en file.", requeued);
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
            delivery.setLastErrorRetryable(false);
            delivery.setUpdatedAt(Instant.now());
            deliveryRepository.save(delivery);
            return;
        }

        Instant now = Instant.now();
        delivery.setStatus(DeliveryStatus.SENDING);
        delivery.setAttemptCount(delivery.getAttemptCount() + 1);
        delivery.setLastAttemptAt(now);
        delivery.setUpdatedAt(now);
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
            delivery.setLastErrorRetryable(false);
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
            delivery.setLastErrorRetryable(true);
            delivery.setNextRetryAt(now.plus(Math.max(1, backoff), ChronoUnit.MINUTES));
        } else {
            delivery.setStatus(DeliveryStatus.FAILED);
            delivery.setLastError(truncate(result.error(), 1000));
            delivery.setLastErrorRetryable(result.retryable());
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
            // Configuration absente = réparable : autoriser la relance automatique
            // dès que le fournisseur sera configuré (aucun envoi réel entre-temps).
            return ProviderResult.failure(
                    "Envoi impossible : fournisseur email non configuré (SMTP ou API).", true);
        }
        String subject = message.getSubject() != null ? message.getSubject() : "Notification fiscale";
        // Un bouton vers http://localhost ne fonctionne pas chez le destinataire et
        // dégrade la délivrabilité : on ne l'ajoute que si une URL publique est configurée.
        String baseUrl = properties.getMail().getBaseUrl();
        boolean publicBaseUrl = baseUrl != null && !baseUrl.isBlank()
                && !baseUrl.contains("localhost") && !baseUrl.contains("127.0.0.1");
        String buttonLabel = publicBaseUrl ? "Ouvrir MNK-TAX" : null;
        String buttonUrl = publicBaseUrl ? baseUrl + "/messages" : null;
        String html = emailRenderer.render(
                subject,
                message.getContent(),
                buttonLabel,
                buttonUrl,
                subject);
        String text = emailRenderer.renderText(
                subject,
                message.getContent(),
                buttonLabel,
                buttonUrl,
                subject);
        List<EmailAttachment> attachments =
                emailRenderer.withInlineAssets(loadAttachments(message.getId()));
        return emailProvider.send(to, message.getSubject(), html, text, attachments);
    }

    /** Canal SMS réel : texte court vers un numéro normalisé E.164. */
    private ProviderResult deliverSms(Message message, MessageDelivery delivery) {
        String to = delivery.getRecipientAddress();
        if (to == null || to.isBlank()) {
            return ProviderResult.failure("Numéro de téléphone manquant ou non normalisé.", false);
        }
        if (!smsProvider.isConfigured()) {
            // Configuration absente = réparable, comme pour l'email.
            return ProviderResult.failure("Envoi impossible : fournisseur SMS non configuré.", true);
        }
        // Corps SMS rendu depuis le modèle (repli : email tronqué pour les messages libres).
        String text = message.getSmsContent() != null && !message.getSmsContent().isBlank()
                ? message.getSmsContent()
                : truncate(message.getContent(), 300);
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
        Instant now = Instant.now();
        delivery.setStatus(DeliveryStatus.PENDING);
        delivery.setAttemptCount(0);
        // Une relance manuelle ouvre un nouveau budget de relances automatiques.
        delivery.setAutoRetryCount(0);
        delivery.setLastErrorRetryable(true);
        delivery.setNextRetryAt(now);
        delivery.setUpdatedAt(now);
        deliveryRepository.save(delivery);

        messageRepository.findById(delivery.getMessageId()).ifPresent(message -> {
            message.setLastError(null);
            refreshMessageStatus(message);
            messageRepository.save(message);
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
