package com.mnktax.message.service;

import com.mnktax.audit.service.AuditService;
import com.mnktax.auth.entity.User;
import com.mnktax.auth.repository.UserRepository;
import com.mnktax.communication.repository.MessageDeliveryRepository;
import com.mnktax.communication.service.DeliveryQueueService;
import com.mnktax.common.exception.BusinessException;
import com.mnktax.common.util.SecurityUtils;
import com.mnktax.declaration.entity.Declaration;
import com.mnktax.declaration.repository.DeclarationRepository;
import com.mnktax.debt.entity.TaxDebt;
import com.mnktax.debt.repository.TaxDebtRepository;
import com.mnktax.message.dto.MessageDtos.AttachmentDto;
import com.mnktax.message.dto.MessageDtos.MessageDto;
import com.mnktax.message.dto.MessageDtos.MessageFilterRequest;
import com.mnktax.message.dto.MessageDtos.MessageStatsDto;
import com.mnktax.message.dto.MessageDtos.SendMessageRequest;
import com.mnktax.message.entity.Message;
import com.mnktax.message.entity.MessageAttachment;
import com.mnktax.message.entity.MessageContextType;
import com.mnktax.message.entity.MessagePriority;
import com.mnktax.message.entity.MessageProcessingStatus;
import com.mnktax.message.repository.MessageAttachmentRepository;
import com.mnktax.message.repository.MessageRepository;
import com.mnktax.notification.entity.Notification;
import com.mnktax.notification.entity.NotificationType;
import com.mnktax.notification.repository.NotificationRepository;
import com.mnktax.payment.entity.Payment;
import com.mnktax.payment.repository.PaymentRepository;
import com.mnktax.taxpayer.entity.Taxpayer;
import com.mnktax.taxpayer.repository.TaxpayerRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
public class MessageService {

    private final MessageRepository messageRepository;
    private final MessageAttachmentRepository attachmentRepository;
    private final UserRepository userRepository;
    private final TaxpayerRepository taxpayerRepository;
    private final DeclarationRepository declarationRepository;
    private final TaxDebtRepository debtRepository;
    private final PaymentRepository paymentRepository;
    private final NotificationRepository notificationRepository;
    private final MessageDeliveryRepository deliveryRepository;
    private final DeliveryQueueService deliveryQueueService;
    private final AuditService auditService;

    private static final long MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024; // 10 Mo
    private static final Set<String> ALLOWED_ATTACHMENT_TYPES = Set.of(
            "application/pdf",
            "image/png", "image/jpeg", "image/webp", "image/gif",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "text/plain", "text/csv"
    );

    public MessageService(MessageRepository messageRepository,
                          MessageAttachmentRepository attachmentRepository,
                          UserRepository userRepository,
                          TaxpayerRepository taxpayerRepository,
                          DeclarationRepository declarationRepository,
                          TaxDebtRepository debtRepository,
                          PaymentRepository paymentRepository,
                          NotificationRepository notificationRepository,
                          MessageDeliveryRepository deliveryRepository,
                          DeliveryQueueService deliveryQueueService,
                          AuditService auditService) {
        this.messageRepository = messageRepository;
        this.attachmentRepository = attachmentRepository;
        this.userRepository = userRepository;
        this.taxpayerRepository = taxpayerRepository;
        this.declarationRepository = declarationRepository;
        this.debtRepository = debtRepository;
        this.paymentRepository = paymentRepository;
        this.notificationRepository = notificationRepository;
        this.deliveryRepository = deliveryRepository;
        this.deliveryQueueService = deliveryQueueService;
        this.auditService = auditService;
    }

    // ─── Read-only queries ───────────────────────────────────────

    @Transactional(readOnly = true)
    public Page<MessageDto> myMessages(MessageFilterRequest filter, Pageable pageable) {
        Long userId = SecurityUtils.currentUserId();
        if (userId == null) return Page.empty();
        return messageRepository.findByFilters(
                userId,
                filter != null ? filter.search() : null,
                filter != null ? filter.readStatus() : null,
                filter != null ? filter.processingStatus() : null,
                filter != null ? filter.priority() : null,
                filter != null ? filter.contextType() : null,
                filter != null ? filter.taxpayerId() : null,
                pageable
        ).map(m -> enrichDto(m, userId));
    }

    @Transactional(readOnly = true)
    public Page<MessageDto> mySentMessages(MessageFilterRequest filter, Pageable pageable) {
        Long userId = SecurityUtils.currentUserId();
        if (userId == null) return Page.empty();
        return messageRepository.findSentByFilters(
                userId,
                filter != null ? filter.search() : null,
                filter != null ? filter.processingStatus() : null,
                filter != null ? filter.priority() : null,
                filter != null ? filter.contextType() : null,
                pageable
        ).map(m -> enrichDto(m, userId));
    }

    @Transactional(readOnly = true)
    public Page<MessageDto> archivedMessages(Pageable pageable) {
        Long userId = SecurityUtils.currentUserId();
        if (userId == null) return Page.empty();
        return messageRepository.findByRecipientIdAndArchivedAtIsNotNullOrderByArchivedAtDesc(userId, pageable)
                .map(m -> enrichDto(m, userId));
    }

    @Transactional(readOnly = true)
    public MessageDto getMessage(Long id) {
        Long userId = SecurityUtils.currentUserId();
        if (userId == null) throw new BusinessException("UNAUTHORIZED", "Non autorisé.");
        Message message = messageRepository.findById(id)
                .orElseThrow(() -> new BusinessException("MESSAGE_NOT_FOUND", "Message introuvable."));
        if (!message.getSenderId().equals(userId) && !message.getRecipientId().equals(userId)) {
            throw new BusinessException("MESSAGE_ACCESS_DENIED", "Accès refusé à ce message.");
        }
        return enrichDto(message, userId);
    }

    @Transactional(readOnly = true)
    public List<MessageDto> getThread(Long threadId) {
        Long userId = SecurityUtils.currentUserId();
        if (userId == null) throw new BusinessException("UNAUTHORIZED", "Non autorisé.");
        List<Message> messages = messageRepository.findByThreadIdOrderByCreatedAtAsc(threadId);
        if (messages.isEmpty()) throw new BusinessException("THREAD_NOT_FOUND", "Conversation introuvable.");
        Message first = messages.get(0);
        if (!first.getSenderId().equals(userId) && !first.getRecipientId().equals(userId)) {
            throw new BusinessException("THREAD_ACCESS_DENIED", "Accès refusé à cette conversation.");
        }
        return messages.stream().map(m -> enrichDto(m, userId)).toList();
    }

    @Transactional(readOnly = true)
    public MessageStatsDto stats() {
        Long userId = SecurityUtils.currentUserId();
        if (userId == null) return new MessageStatsDto(0, 0, 0, 0);
        long totalReceived = messageRepository.countBySenderId(userId) + messageRepository.countByRecipientIdAndArchivedAtIsNull(userId);
        long unreadCount = messageRepository.countByRecipientIdAndReadFalse(userId);
        long waitingCount = messageRepository.countByRecipientIdAndProcessingStatus(userId, MessageProcessingStatus.WAITING_RESPONSE);
        long urgentCount = messageRepository.countByRecipientIdAndPriority(userId, MessagePriority.URGENT);
        return new MessageStatsDto(totalReceived, unreadCount, waitingCount, urgentCount);
    }

    // ─── Mutations ───────────────────────────────────────────────

    @Transactional
    public MessageDto send(SendMessageRequest request, HttpServletRequest httpRequest) {
        Long senderId = SecurityUtils.currentUserId();
        // Destinataire par identifiant (replies) ou par nom d'utilisateur.
        User recipient;
        if (request.recipientId() != null) {
            recipient = userRepository.findById(request.recipientId())
                    .orElseThrow(() -> new BusinessException("RECIPIENT_NOT_FOUND",
                            "Destinataire introuvable : #" + request.recipientId()));
        } else if (request.recipientUsername() != null && !request.recipientUsername().isBlank()) {
            recipient = userRepository.findByUsername(request.recipientUsername().trim())
                    .orElseThrow(() -> new BusinessException("RECIPIENT_NOT_FOUND",
                            "Destinataire inconnu : " + request.recipientUsername()));
        } else {
            throw new BusinessException("RECIPIENT_REQUIRED", "Le destinataire est requis.");
        }
        if (!recipient.isEnabled()) {
            throw new BusinessException("RECIPIENT_DISABLED", "Le compte du destinataire est désactivé.");
        }
        String senderName = resolveSenderName(senderId);

        Long threadId;
        if (request.replyToId() != null) {
            Message parent = messageRepository.findById(request.replyToId())
                    .orElseThrow(() -> new BusinessException("MESSAGE_NOT_FOUND", "Message parent introuvable."));
            threadId = parent.getThreadId();
        } else {
            threadId = null;
        }

        MessageContextType ctxType = request.contextType() != null ? request.contextType() : MessageContextType.GENERAL;

        Message message = Message.builder()
                .senderId(senderId)
                .senderName(senderName)
                .recipientId(recipient.getId())
                .subject(request.subject() == null ? null : request.subject().trim())
                .content(request.content().trim())
                .read(false)
                .createdAt(Instant.now())
                .contextType(ctxType)
                .contextRef(request.contextRef())
                .taxpayerId(request.taxpayerId())
                .declarationId(request.declarationId())
                .debtId(request.debtId())
                .paymentId(request.paymentId())
                .priority(request.priority() != null ? request.priority() : MessagePriority.NORMAL)
                .processingStatus(MessageProcessingStatus.WAITING_RESPONSE)
                .build();

        if (threadId != null) {
            message.setThreadId(threadId);
        }
        Message saved = messageRepository.save(message);
        if (threadId == null) {
            saved.setThreadId(saved.getId());
            saved = messageRepository.save(saved);
        }

        createNotification(recipient.getId(), saved);
        auditService.record("MESSAGE_SEND", "MESSAGE", String.valueOf(saved.getId()),
                null, buildAuditValue(saved), httpRequest);

        return enrichDto(saved, senderId);
    }

    @Transactional
    public void markRead(Long id, HttpServletRequest httpRequest) {
        Long userId = SecurityUtils.currentUserId();
        if (userId == null) return;
        Message message = messageRepository.findById(id)
                .filter(m -> m.getRecipientId().equals(userId) || m.getSenderId().equals(userId))
                .orElseThrow(() -> new BusinessException("MESSAGE_NOT_FOUND", "Message introuvable."));
        if (!message.isRead()) {
            message.setRead(true);
            message.setReadAt(Instant.now());
            messageRepository.save(message);
            auditService.record("MESSAGE_READ", "MESSAGE", String.valueOf(id),
                    false, true, httpRequest);
        }
        // Accusé de lecture multicanal : la livraison IN_APP passe à READ
        // (traçage date/heure de lecture + synchronisation des statuts).
        deliveryQueueService.markInAppDeliveryRead(id);
    }

    @Transactional
    public void markThreadRead(Long threadId, HttpServletRequest httpRequest) {
        Long userId = SecurityUtils.currentUserId();
        if (userId == null) return;
        int count = messageRepository.markThreadAsRead(threadId, userId, Instant.now());
        if (count > 0) {
            auditService.record("MESSAGE_THREAD_READ", "MESSAGE", String.valueOf(threadId),
                    null, count + " messages marqués comme lus", httpRequest);
        }
    }

    @Transactional
    public void markAllRead(HttpServletRequest httpRequest) {
        Long userId = SecurityUtils.currentUserId();
        if (userId == null) return;
        int count = messageRepository.markAllAsRead(userId, Instant.now());
        if (count > 0) {
            auditService.record("MESSAGE_READ_ALL", "MESSAGE", null,
                    null, count + " messages marqués comme lus", httpRequest);
        }
    }

    @Transactional
    public void archive(Long id, HttpServletRequest httpRequest) {
        Long userId = SecurityUtils.currentUserId();
        if (userId == null) return;
        Message message = messageRepository.findById(id)
                .filter(m -> m.getRecipientId().equals(userId))
                .orElseThrow(() -> new BusinessException("MESSAGE_NOT_FOUND", "Message introuvable."));
        message.setArchivedAt(Instant.now());
        message.setProcessingStatus(MessageProcessingStatus.ARCHIVED);
        messageRepository.save(message);
        auditService.record("MESSAGE_ARCHIVE", "MESSAGE", String.valueOf(id),
                null, "archived", httpRequest);
    }

    @Transactional
    public void unarchive(Long id, HttpServletRequest httpRequest) {
        Long userId = SecurityUtils.currentUserId();
        if (userId == null) return;
        Message message = messageRepository.findById(id)
                .filter(m -> m.getRecipientId().equals(userId))
                .orElseThrow(() -> new BusinessException("MESSAGE_NOT_FOUND", "Message introuvable."));
        message.setArchivedAt(null);
        message.setProcessingStatus(MessageProcessingStatus.WAITING_RESPONSE);
        messageRepository.save(message);
        auditService.record("MESSAGE_UNARCHIVE", "MESSAGE", String.valueOf(id),
                "archived", "restored", httpRequest);
    }

    @Transactional
    public void close(Long id, HttpServletRequest httpRequest) {
        Long userId = SecurityUtils.currentUserId();
        if (userId == null) return;
        Message message = messageRepository.findById(id)
                .filter(m -> m.getRecipientId().equals(userId) || m.getSenderId().equals(userId))
                .orElseThrow(() -> new BusinessException("MESSAGE_NOT_FOUND", "Message introuvable."));
        message.setProcessingStatus(MessageProcessingStatus.CLOSED);
        message.setClosedAt(Instant.now());
        messageRepository.save(message);
        auditService.record("MESSAGE_CLOSE", "MESSAGE", String.valueOf(id),
                null, "closed", httpRequest);
    }

    @Transactional
    public void reopen(Long id, HttpServletRequest httpRequest) {
        Long userId = SecurityUtils.currentUserId();
        if (userId == null) return;
        Message message = messageRepository.findById(id)
                .filter(m -> m.getRecipientId().equals(userId) || m.getSenderId().equals(userId))
                .orElseThrow(() -> new BusinessException("MESSAGE_NOT_FOUND", "Message introuvable."));
        message.setProcessingStatus(MessageProcessingStatus.WAITING_RESPONSE);
        message.setClosedAt(null);
        messageRepository.save(message);
        auditService.record("MESSAGE_REOPEN", "MESSAGE", String.valueOf(id),
                "closed", "reopened", httpRequest);
    }

    // ─── Attachments ─────────────────────────────────────────────

    @Transactional
    public AttachmentDto uploadAttachment(Long messageId, MultipartFile file, HttpServletRequest httpRequest) {
        Long userId = SecurityUtils.currentUserId();
        if (userId == null) throw new BusinessException("UNAUTHORIZED", "Non autorisé.");

        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new BusinessException("MESSAGE_NOT_FOUND", "Message introuvable."));
        // IDOR check: only sender or recipient can attach
        if (!message.getSenderId().equals(userId) && !message.getRecipientId().equals(userId)) {
            throw new BusinessException("MESSAGE_ACCESS_DENIED", "Accès refusé à ce message.");
        }

        if (file == null || file.isEmpty()) {
            throw new BusinessException("EMPTY_FILE", "Le fichier est vide.");
        }
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_ATTACHMENT_TYPES.contains(contentType.toLowerCase())) {
            throw new BusinessException("INVALID_FILE_TYPE", "Format non supporté.");
        }
        if (file.getSize() > MAX_ATTACHMENT_BYTES) {
            throw new BusinessException("FILE_TOO_LARGE", "Le fichier ne doit pas dépasser 10 Mo.");
        }

        try {
            Path attachDir = Path.of("./data/message-attachments").toAbsolutePath();
            Files.createDirectories(attachDir);
            String safeOriginal = file.getOriginalFilename() != null
                    ? file.getOriginalFilename().replaceAll("[^a-zA-Z0-9._\\-]", "_")
                    : "file";
            String storedName = messageId + "_" + UUID.randomUUID().toString().substring(0, 8) + "_" + safeOriginal;
            Path target = attachDir.resolve(storedName);
            file.transferTo(target);

            MessageAttachment attachment = MessageAttachment.builder()
                    .messageId(messageId)
                    .fileName(storedName)
                    .originalName(safeOriginal)
                    .mimeType(contentType.toLowerCase())
                    .size(file.getSize())
                    .uploadedBy(resolveSenderName(userId))
                    .createdAt(Instant.now())
                    .build();
            MessageAttachment saved = attachmentRepository.save(attachment);

            auditService.record("MESSAGE_ATTACH", "MESSAGE", String.valueOf(messageId),
                    null, safeOriginal, httpRequest);

            return AttachmentDto.from(saved);
        } catch (IOException ex) {
            throw new BusinessException("UPLOAD_ERROR", "Erreur de sauvegarde : " + ex.getMessage());
        }
    }

    @Transactional(readOnly = true)
    public ResponseEntity<Resource> downloadAttachment(Long attachmentId) {
        Long userId = SecurityUtils.currentUserId();
        if (userId == null) throw new BusinessException("UNAUTHORIZED", "Non autorisé.");

        MessageAttachment attachment = attachmentRepository.findById(attachmentId)
                .orElseThrow(() -> new BusinessException("ATTACHMENT_NOT_FOUND", "Pièce jointe introuvable."));

        // IDOR check: verify user has access to the parent message
        Message message = messageRepository.findById(attachment.getMessageId())
                .orElseThrow(() -> new BusinessException("MESSAGE_NOT_FOUND", "Message parent introuvable."));
        if (!message.getSenderId().equals(userId) && !message.getRecipientId().equals(userId)) {
            throw new BusinessException("MESSAGE_ACCESS_DENIED", "Accès refusé à cette pièce jointe.");
        }

        Path filePath = Path.of("./data/message-attachments").resolve(attachment.getFileName()).toAbsolutePath();
        if (!Files.exists(filePath)) {
            throw new BusinessException("FILE_NOT_FOUND", "Fichier introuvable sur le serveur.");
        }

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(attachment.getMimeType()))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + attachment.getOriginalName() + "\"")
                .body(new FileSystemResource(filePath));
    }

    // ─── Internal helpers ────────────────────────────────────────

    private MessageDto enrichDto(Message m, Long currentUserId) {
        String recipientName = userRepository.findById(m.getRecipientId())
                .map(u -> (u.getFirstName() + " " + u.getLastName()).trim())
                .filter(s -> !s.isBlank())
                .orElse(null);
        String taxpayerName = null;
        String taxpayerNif = null;
        if (m.getTaxpayerId() != null) {
            taxpayerName = taxpayerRepository.findById(m.getTaxpayerId())
                    .map(Taxpayer::getName).orElse(null);
            taxpayerNif = taxpayerRepository.findById(m.getTaxpayerId())
                    .map(Taxpayer::getNif).orElse(null);
        }
        String declarationRef = null;
        if (m.getDeclarationId() != null) {
            declarationRef = declarationRepository.findById(m.getDeclarationId())
                    .map(Declaration::getReference).orElse(null);
        }
        String debtRef = null;
        if (m.getDebtId() != null) {
            debtRef = debtRepository.findById(m.getDebtId())
                    .map(TaxDebt::getReference).orElse(null);
        }
        String paymentRef = null;
        if (m.getPaymentId() != null) {
            paymentRef = paymentRepository.findById(m.getPaymentId())
                    .map(Payment::getReference).orElse(null);
        }
        List<AttachmentDto> attachments = attachmentRepository.findByMessageIdOrderByCreatedAtAsc(m.getId())
                .stream().map(AttachmentDto::from).toList();
        int replyCount = (int) messageRepository.countByThreadId(m.getThreadId()) - 1;

        return MessageDto.from(m, recipientName, taxpayerName, taxpayerNif,
                declarationRef, debtRef, paymentRef,
                null, null, currentUserId, attachments, Math.max(0, replyCount));
    }

    private String resolveSenderName(Long senderId) {
        if (senderId == null) return SecurityUtils.currentUsername();
        return userRepository.findById(senderId)
                .map(u -> (u.getFirstName() + " " + u.getLastName()).trim())
                .filter(s -> !s.isBlank())
                .orElse(SecurityUtils.currentUsername());
    }

    private void createNotification(Long recipientUserId, Message message) {
        String contextLabel = "";
        if (message.getContextType() != MessageContextType.GENERAL && message.getContextRef() != null) {
            contextLabel = " concernant " + message.getContextType().name().toLowerCase() + " " + message.getContextRef();
        }
        Notification notification = Notification.builder()
                .userId(recipientUserId)
                .type(NotificationType.MESSAGE_RECEIVED)
                .title("Nouveau message" + contextLabel)
                .message("De " + message.getSenderName() + " : " + truncate(message.getSubject() != null ? message.getSubject() : message.getContent(), 200))
                .entityType("MESSAGE")
                .entityId(String.valueOf(message.getId()))
                .read(false)
                .createdAt(Instant.now())
                .build();
        notificationRepository.save(notification);
    }

    private String buildAuditValue(Message m) {
        return String.format("{\"id\":%d,\"sender\":\"%s\",\"recipientId\":%d,\"subject\":\"%s\",\"context\":\"%s\"}",
                m.getId(), m.getSenderName(), m.getRecipientId(),
                m.getSubject() != null ? m.getSubject() : "",
                m.getContextType().name());
    }

    private String truncate(String s, int max) {
        if (s == null) return "";
        return s.length() <= max ? s : s.substring(0, max);
    }
}
