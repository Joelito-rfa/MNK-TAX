package com.mnktax.message.entity;

import com.mnktax.communication.entity.MessageStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "messages", indexes = {
        @Index(name = "idx_message_recipient", columnList = "recipient_id, created_at"),
        @Index(name = "idx_message_sender", columnList = "sender_id"),
        @Index(name = "idx_message_read", columnList = "recipient_id, is_read"),
        @Index(name = "idx_message_thread", columnList = "thread_id, created_at"),
        @Index(name = "idx_message_context", columnList = "context_type"),
        @Index(name = "idx_message_taxpayer", columnList = "taxpayer_id"),
        @Index(name = "idx_message_priority", columnList = "priority"),
        @Index(name = "idx_message_proc", columnList = "processing_status"),
        @Index(name = "idx_message_archived", columnList = "archived_at")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Message {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "sender_id")
    private Long senderId;

    @Column(name = "sender_name", nullable = false, length = 100)
    private String senderName;

    @Column(name = "recipient_id", nullable = false)
    private Long recipientId;

    @Column(length = 200)
    private String subject;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(name = "is_read", nullable = false)
    private boolean read;

    @Column(name = "read_at")
    private Instant readAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "thread_id", nullable = false)
    private Long threadId;

    @Enumerated(EnumType.STRING)
    @Column(name = "context_type", nullable = false, length = 30)
    @Builder.Default
    private MessageContextType contextType = MessageContextType.GENERAL;

    @Column(name = "context_ref", length = 40)
    private String contextRef;

    @Column(name = "taxpayer_id")
    private Long taxpayerId;

    @Column(name = "declaration_id")
    private Long declarationId;

    @Column(name = "debt_id")
    private Long debtId;

    @Column(name = "payment_id")
    private Long paymentId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private MessagePriority priority = MessagePriority.NORMAL;

    @Enumerated(EnumType.STRING)
    @Column(name = "processing_status", nullable = false, length = 30)
    @Builder.Default
    private MessageProcessingStatus processingStatus = MessageProcessingStatus.WAITING_RESPONSE;

    @Column(name = "closed_at")
    private Instant closedAt;

    @Column(name = "archived_at")
    private Instant archivedAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    // ─── Centre de communication multicanal (V29/V30) ──────────

    /** Canaux demandés : "IN_APP,EMAIL,SMS". */
    @Column(length = 100)
    private String channels;

    /** Type fiscal : TAX_DEADLINE | OVERDUE | PAYMENT | COLLECTION | FORMAL_NOTICE | SYSTEM | GENERAL. */
    @Column(name = "message_type", length = 30)
    private String messageType;

    /** Code du modèle utilisé (si généré depuis un template). */
    @Column(name = "template_code", length = 60)
    private String templateCode;

    /** Campagne d'origine (diffusion), null pour un message individuel. */
    @Column(name = "campaign_id")
    private Long campaignId;

    /** Dernière erreur d'envoi (canal externe), null sinon. */
    @Column(name = "last_error", length = 500)
    private String lastError;

    /** Statut d'envoi agrégé du cycle de vie multicanal. */
    @Enumerated(EnumType.STRING)
    @Column(length = 30)
    @Builder.Default
    private MessageStatus status = MessageStatus.SENT;

    /** Date d'envoi programmé (statut SCHEDULED jusqu'au traitement). */
    @Column(name = "scheduled_at")
    private Instant scheduledAt;

    /** Auteur réel de l'envoi (login), distinct de senderName. */
    @Column(name = "created_by", length = 100)
    private String createdBy;
}
