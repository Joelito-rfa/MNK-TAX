package com.mnktax.communication.dto;

import com.mnktax.communication.entity.Campaign;
import com.mnktax.communication.entity.CommunicationEventRule;
import com.mnktax.communication.entity.CommunicationEventType;
import com.mnktax.communication.entity.MessageTemplate;
import com.mnktax.message.entity.Message;

import java.time.Instant;
import java.util.List;

/** DTOs du centre de communication multicanal. */
public final class CommunicationDtos {

    private CommunicationDtos() {
    }

    // ─── Composer ───────────────────────────────────────────────

    public record ComposeRequest(
            Long taxpayerId,
            Long userId,
            String username,
            String audience,          // SINGLE | TAX_TYPE | OVERDUE | WITH_DEBT | ALL
            String taxTypeCode,
            List<Long> taxpayerIds,   // multi-sélection
            List<String> channels,    // IN_APP | EMAIL | SMS (plusieurs simultanés)
            String subject,
            String content,
            String templateCode,      // optionnel : rendu depuis un modèle
            String language,          // FR | MG | EN (optionnel sinon langue contribuable)
            String priority,          // LOW | NORMAL | HIGH | URGENT
            String messageType,       // TAX_DEADLINE | OVERDUE | PAYMENT | ...
            String scheduledAt,       // ISO instant → programmé
            Boolean requireConfirmation
    ) {
    }

    /** Résultat avant envoi : résumé de conformité (destinataires, canaux, adresses manquantes). */
    public record ComposePreview(
            String audience,
            int recipientCount,
            List<String> channels,
            int missingEmail,
            int missingPhone,
            List<String> warnings
    ) {
    }

    public record ComposeResult(
            Long messageId,
            String status,
            int recipients,
            List<String> channels,
            String warning
    ) {
    }

    // ─── Livraisons / suivi ─────────────────────────────────────

    public record DeliveryDto(
            Long id,
            Long messageId,
            String channel,
            String recipientAddress,
            String status,
            int attemptCount,
            int maxAttempts,
            String lastError,
            Instant nextRetryAt,
            String providerMessageId,
            Instant sentAt,
            Instant deliveredAt,
            Instant readAt,
            Instant createdAt
    ) {
        public static DeliveryDto from(com.mnktax.communication.entity.MessageDelivery d) {
            return new DeliveryDto(d.getId(), d.getMessageId(), d.getChannel().name(),
                    d.getRecipientAddress(), d.getStatus().name(), d.getAttemptCount(),
                    d.getMaxAttempts(), d.getLastError(), d.getNextRetryAt(),
                    d.getProviderMessageId(), d.getSentAt(), d.getDeliveredAt(),
                    d.getReadAt(), d.getCreatedAt());
        }
    }

    public record SentMessageDto(
            Long id,
            String recipientName,
            Long taxpayerId,
            String taxpayerName,
            String taxpayerNif,
            String subject,
            String channels,
            String messageType,
            String priority,
            String status,
            String lastError,
            Instant scheduledAt,
            Instant createdAt,
            List<DeliveryDto> deliveries
    ) {
        public static SentMessageDto from(Message m, String recipientName, String taxpayerName,
                                          String taxpayerNif, List<DeliveryDto> deliveries) {
            return new SentMessageDto(m.getId(), recipientName, m.getTaxpayerId(),
                    taxpayerName, taxpayerNif, m.getSubject(), m.getChannels(),
                    m.getMessageType(), m.getPriority() == null ? "NORMAL" : m.getPriority().name(),
                    m.getStatus() == null ? "SENT" : m.getStatus().name(),
                    m.getLastError(), m.getScheduledAt(), m.getCreatedAt(), deliveries);
        }
    }

    // ─── Statistiques du centre ─────────────────────────────────

    public record CommunicationStatsDto(
            long messagesSent,
            long messagesFailed,
            long messagesScheduled,
            long messagesQueued,
            long messagesRead,
            long emailsSent,
            long smsSent,
            long notificationsSent,
            double deliveryRate,
            double readRate,
            double failureRate
    ) {
    }

    // ─── Fournisseurs (aucun secret exposé) ─────────────────────

    public record ProviderStatusDto(
            String channel,
            String provider,
            String status,       // CONNECTED | INCOMPLETE | DISCONNECTED
            String detail
    ) {
    }

    public record ProvidersStatusDto(
            List<ProviderStatusDto> providers,
            int queuePending,
            int queueFailed,
            int maxAttempts,
            long retryBackoffMinutes
    ) {
    }

    // ─── Modèles ────────────────────────────────────────────────

    public record TemplateDto(
            Long id,
            String code,
            String category,
            String channels,
            String subjectFr, String subjectMg, String subjectEn,
            String bodyFr, String bodyMg, String bodyEn,
            String smsBodyFr, String smsBodyMg, String smsBodyEn,
            boolean enabled
    ) {
        public static TemplateDto from(MessageTemplate t) {
            return new TemplateDto(t.getId(), t.getCode(), t.getCategory(), t.getChannels(),
                    t.getSubjectFr(), t.getSubjectMg(), t.getSubjectEn(),
                    t.getBodyFr(), t.getBodyMg(), t.getBodyEn(),
                    t.getSmsBodyFr(), t.getSmsBodyMg(), t.getSmsBodyEn(), t.isEnabled());
        }
    }

    public record SaveTemplateRequest(
            String code,
            String category,
            String channels,
            String subjectFr, String subjectMg, String subjectEn,
            String bodyFr, String bodyMg, String bodyEn,
            String smsBodyFr, String smsBodyMg, String smsBodyEn,
            Boolean enabled
    ) {
    }

    public record TemplateRenderRequest(
            String templateCode,
            String language,
            java.util.Map<String, String> variables
    ) {
    }

    public record TemplateRenderResult(
            String subject,
            String body,
            String smsBody
    ) {
    }

    // ─── Campagnes ──────────────────────────────────────────────

    public record CampaignRequest(
            String name,
            String audience,          // ALL | WITH_DEBT | OVERDUE | TAX_TYPE
            String taxTypeCode,
            List<Long> taxpayerIds,
            List<String> channels,
            String subject,
            String content,
            String templateCode,
            String priority,
            String scheduledAt,
            Boolean requireConfirmation
    ) {
    }

    public record CampaignDto(
            Long id,
            String reference,
            String name,
            String audience,
            String channels,
            String createdByName,
            int recipientCount,
            int sentCount,
            int failedCount,
            int readCount,
            String status,
            Instant createdAt
    ) {
        public static CampaignDto from(Campaign c) {
            return new CampaignDto(c.getId(), c.getReference(), c.getName(), c.getAudience(),
                    c.getChannels(), c.getCreatedByName(), c.getRecipientCount(),
                    c.getSentCount(), c.getFailedCount(), c.getReadCount(),
                    c.getStatus().name(), c.getCreatedAt());
        }
    }

    public record CampaignAudiencePreview(
            int recipientCount,
            int missingEmail,
            int missingPhone
    ) {
    }

    // ─── Règles automatiques ────────────────────────────────────

    public record EventRuleDto(
            Long id,
            String eventType,
            String templateCode,
            String channels,
            String priority,
            Integer dayOffset,
            boolean enabled
    ) {
        public static EventRuleDto from(CommunicationEventRule r) {
            return new EventRuleDto(r.getId(), r.getEventType().name(), r.getTemplateCode(),
                    r.getChannels(), r.getPriority(), r.getDayOffset(), r.isEnabled());
        }
    }

    public record UpdateEventRuleRequest(
            String channels,
            String priority,
            Integer dayOffset,
            Boolean enabled
    ) {
    }

    // ─── Envoi test ─────────────────────────────────────────────

    public record TestSendRequest(
            String channel,      // EMAIL | SMS
            String subject,
            String content
    ) {
    }

    public record TestSendResult(
            boolean success,
            String message
    ) {
    }
}
