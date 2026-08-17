package com.mnktax.message.dto;

import com.mnktax.message.entity.Message;
import jakarta.validation.constraints.NotBlank;

import java.time.Instant;

public final class MessageDtos {

    private MessageDtos() {
    }

    public record SendMessageRequest(
            @NotBlank(message = "Le destinataire est requis.") String recipientUsername,
            String subject,
            @NotBlank(message = "Le contenu du message est requis.") String content
    ) {
    }

    public record MessageDto(Long id, Long senderId, String senderName, Long recipientId,
                             String subject, String content, boolean read, Instant readAt,
                             Instant createdAt) {

        public static MessageDto from(Message m) {
            return new MessageDto(m.getId(), m.getSenderId(), m.getSenderName(), m.getRecipientId(),
                    m.getSubject(), m.getContent(), m.isRead(), m.getReadAt(), m.getCreatedAt());
        }
    }
}
