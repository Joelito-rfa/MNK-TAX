package com.mnktax.message.dto;

import com.mnktax.message.entity.Message;
import com.mnktax.message.entity.MessageAttachment;
import com.mnktax.message.entity.MessageContextType;
import com.mnktax.message.entity.MessagePriority;
import com.mnktax.message.entity.MessageProcessingStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.Instant;
import java.util.List;

public final class MessageDtos {

    private MessageDtos() {
    }

    public record SendMessageRequest(
            String recipientUsername,
            Long recipientId,
            String subject,
            @NotBlank(message = "Le contenu du message est requis.") String content,
            Long replyToId,
            MessageContextType contextType,
            String contextRef,
            Long taxpayerId,
            Long declarationId,
            Long debtId,
            Long paymentId,
            MessagePriority priority
    ) {
    }

    public record MessageDto(
            Long id,
            Long senderId,
            String senderName,
            Long recipientId,
            String recipientName,
            String subject,
            String content,
            boolean read,
            Instant readAt,
            Instant createdAt,
            Long threadId,
            MessageContextType contextType,
            String contextRef,
            Long taxpayerId,
            String taxpayerName,
            String taxpayerNif,
            Long declarationId,
            String declarationReference,
            Long debtId,
            String debtReference,
            Long paymentId,
            String paymentReference,
            MessagePriority priority,
            MessageProcessingStatus processingStatus,
            Instant closedAt,
            Instant archivedAt,
            List<AttachmentDto> attachments,
            int replyCount
    ) {

        public static MessageDto from(Message m) {
            return from(m, null, null, null, null, null, null, null, null, null, List.of(), 0);
        }

        public static MessageDto from(Message m, String recipientName,
                                       String taxpayerName, String taxpayerNif,
                                       String declarationReference, String debtReference,
                                       String paymentReference,
                                       String contextLabel, String contextStatusLabel,
                                       Long currentUserId,
                                       List<AttachmentDto> attachments, int replyCount) {
            return new MessageDto(
                    m.getId(),
                    m.getSenderId(),
                    m.getSenderName(),
                    m.getRecipientId(),
                    recipientName,
                    m.getSubject(),
                    m.getContent(),
                    m.isRead(),
                    m.getReadAt(),
                    m.getCreatedAt(),
                    m.getThreadId(),
                    m.getContextType(),
                    m.getContextRef(),
                    m.getTaxpayerId(),
                    taxpayerName,
                    taxpayerNif,
                    m.getDeclarationId(),
                    declarationReference,
                    m.getDebtId(),
                    debtReference,
                    m.getPaymentId(),
                    paymentReference,
                    m.getPriority(),
                    m.getProcessingStatus(),
                    m.getClosedAt(),
                    m.getArchivedAt(),
                    attachments,
                    replyCount
            );
        }
    }

    public record AttachmentDto(
            Long id,
            String fileName,
            String originalName,
            String mimeType,
            Long size,
            String uploadedBy,
            Instant createdAt
    ) {
        public static AttachmentDto from(MessageAttachment a) {
            return new AttachmentDto(
                    a.getId(),
                    a.getFileName(),
                    a.getOriginalName(),
                    a.getMimeType(),
                    a.getSize(),
                    a.getUploadedBy(),
                    a.getCreatedAt()
            );
        }
    }

    public record MessageStatsDto(
            long totalReceived,
            long unreadCount,
            long waitingResponseCount,
            long urgentCount
    ) {
    }

    public record MessageFilterRequest(
            String search,
            String readStatus,
            String processingStatus,
            MessagePriority priority,
            MessageContextType contextType,
            Long taxpayerId
    ) {
    }
}
