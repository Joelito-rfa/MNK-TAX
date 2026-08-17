package com.mnktax.message.service;

import com.mnktax.auth.entity.User;
import com.mnktax.auth.repository.UserRepository;
import com.mnktax.common.exception.BusinessException;
import com.mnktax.common.util.SecurityUtils;
import com.mnktax.message.dto.MessageDtos.MessageDto;
import com.mnktax.message.dto.MessageDtos.SendMessageRequest;
import com.mnktax.message.entity.Message;
import com.mnktax.message.repository.MessageRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Service
public class MessageService {

    private final MessageRepository messageRepository;
    private final UserRepository userRepository;

    public MessageService(MessageRepository messageRepository, UserRepository userRepository) {
        this.messageRepository = messageRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public Page<MessageDto> myMessages(Pageable pageable) {
        Long userId = SecurityUtils.currentUserId();
        if (userId == null) {
            return Page.empty();
        }
        return messageRepository.findByRecipientIdOrderByCreatedAtDesc(userId, pageable)
                .map(MessageDto::from);
    }

    @Transactional(readOnly = true)
    public long unreadCount() {
        Long userId = SecurityUtils.currentUserId();
        if (userId == null) {
            return 0;
        }
        return messageRepository.countByRecipientIdAndReadFalse(userId);
    }

    @Transactional
    public MessageDto send(SendMessageRequest request) {
        Long senderId = SecurityUtils.currentUserId();
        User recipient = userRepository.findByUsername(request.recipientUsername().trim())
                .orElseThrow(() -> new BusinessException("RECIPIENT_NOT_FOUND",
                        "Destinataire inconnu : " + request.recipientUsername()));
        if (!recipient.isEnabled()) {
            throw new BusinessException("RECIPIENT_DISABLED",
                    "Le compte du destinataire est désactivé.");
        }
        String senderName = senderId == null ? SecurityUtils.currentUsername()
                : userRepository.findById(senderId)
                        .map(u -> (u.getFirstName() + " " + u.getLastName()).trim())
                        .filter(s -> !s.isBlank())
                        .orElse(SecurityUtils.currentUsername());
        Message message = Message.builder()
                .senderId(senderId)
                .senderName(senderName)
                .recipientId(recipient.getId())
                .subject(request.subject() == null ? null : request.subject().trim())
                .content(request.content().trim())
                .read(false)
                .createdAt(Instant.now())
                .build();
        return MessageDto.from(messageRepository.save(message));
    }

    @Transactional
    public void markRead(Long id) {
        Long userId = SecurityUtils.currentUserId();
        if (userId == null) {
            return;
        }
        Message message = messageRepository.findById(id)
                .filter(m -> m.getRecipientId().equals(userId))
                .orElseThrow(() -> new BusinessException("MESSAGE_NOT_FOUND", "Message introuvable."));
        if (!message.isRead()) {
            message.setRead(true);
            message.setReadAt(Instant.now());
            messageRepository.save(message);
        }
    }

    @Transactional
    public void markAllRead() {
        Long userId = SecurityUtils.currentUserId();
        if (userId == null) {
            return;
        }
        messageRepository.findByRecipientIdAndReadFalse(userId).forEach(m -> {
            m.setRead(true);
            m.setReadAt(Instant.now());
            messageRepository.save(m);
        });
    }
}
