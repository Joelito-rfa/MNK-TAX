package com.mnktax.notification.service;

import com.mnktax.auth.entity.Role;
import com.mnktax.auth.repository.UserRepository;
import com.mnktax.common.util.SecurityUtils;
import com.mnktax.debt.entity.DebtStatus;
import com.mnktax.debt.entity.TaxDebt;
import com.mnktax.debt.repository.TaxDebtRepository;
import com.mnktax.debt.service.DebtService;
import com.mnktax.notification.entity.Notification;
import com.mnktax.notification.entity.NotificationType;
import com.mnktax.notification.repository.NotificationRepository;
import com.mnktax.tax.entity.Deadline;
import com.mnktax.tax.repository.DeadlineRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Set;

/**
 * Notifications internes. Architecture volontairement prête pour l'ajout
 * ultérieur de canaux Email / SMS / Push.
 */
@Service
public class NotificationService {

    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);
    private static final Set<Integer> ALERT_DAYS = Set.of(30, 15, 7, 3, 1);

    private final NotificationRepository notificationRepository;
    private final DeadlineRepository deadlineRepository;
    private final TaxDebtRepository debtRepository;
    private final DebtService debtService;
    private final UserRepository userRepository;

    public NotificationService(NotificationRepository notificationRepository,
                               DeadlineRepository deadlineRepository, TaxDebtRepository debtRepository,
                               DebtService debtService, UserRepository userRepository) {
        this.notificationRepository = notificationRepository;
        this.deadlineRepository = deadlineRepository;
        this.debtRepository = debtRepository;
        this.debtService = debtService;
        this.userRepository = userRepository;
    }

    public Page<Notification> myNotifications(Pageable pageable) {
        Long userId = SecurityUtils.currentUserId();
        if (userId == null) {
            return Page.empty();
        }
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable);
    }

    public long unreadCount() {
        Long userId = SecurityUtils.currentUserId();
        if (userId == null) {
            return 0;
        }
        return notificationRepository.countByUserIdAndReadFalse(userId);
    }

    @Transactional
    public void markAllRead() {
        Long userId = SecurityUtils.currentUserId();
        if (userId == null) {
            return;
        }
        notificationRepository.findByUserIdOrderByCreatedAtDesc(userId,
                        org.springframework.data.domain.PageRequest.of(0, 500))
                .getContent().forEach(n -> {
                    n.setRead(true);
                    n.setReadAt(Instant.now());
                    notificationRepository.save(n);
                });
    }

    @Transactional
    public void notifyPaymentReceived(Long taxpayerUserId, String paymentRef, String taxpayerNif, java.math.BigDecimal amount) {
        if (taxpayerUserId == null) return;
        saveIfNotDuplicate(taxpayerUserId, NotificationType.PAYMENT_RECEIVED,
                "Paiement reçu - " + paymentRef,
                "Un paiement de " + amount + " MGA a été enregistré pour le contribuable " + taxpayerNif + " (réf: " + paymentRef + ").",
                "PAYMENT", paymentRef);
    }

    @Transactional
    public void notifyReceiptReady(Long taxpayerUserId, String receiptRef, String taxpayerNif) {
        if (taxpayerUserId == null) return;
        saveIfNotDuplicate(taxpayerUserId, NotificationType.DOCUMENT_READY,
                "Quittance disponible - " + receiptRef,
                "La quittance " + receiptRef + " du contribuable " + taxpayerNif + " est prête au téléchargement.",
                "RECEIPT", receiptRef);
    }

    @Transactional
    public void notifyDeclarationSubmitted(Long taxpayerUserId, String declarationRef) {
        if (taxpayerUserId == null) return;
        saveIfNotDuplicate(taxpayerUserId, NotificationType.DOCUMENT_READY,
                "Déclaration soumise - " + declarationRef,
                "Votre déclaration " + declarationRef + " a été soumise avec succès et est en attente de traitement.",
                "DECLARATION", declarationRef);
    }

    @Transactional
    public void notifyDeclarationValidated(Long taxpayerUserId, String declarationRef, java.math.BigDecimal calculatedTax) {
        if (taxpayerUserId == null) return;
        saveIfNotDuplicate(taxpayerUserId, NotificationType.DOCUMENT_READY,
                "Déclaration validée - " + declarationRef,
                "Votre déclaration " + declarationRef + " a été validée. Impôt calculé : " + calculatedTax + " MGA.",
                "DECLARATION", declarationRef);
    }

    @Transactional
    public void notifyDeclarationRejected(Long taxpayerUserId, String declarationRef, String reason) {
        if (taxpayerUserId == null) return;
        saveIfNotDuplicate(taxpayerUserId, NotificationType.PAYMENT_REJECTED,
                "Déclaration rejetée - " + declarationRef,
                "Votre déclaration " + declarationRef + " a été rejetée. Motif : " + (reason != null ? reason : "non précisé") + ".",
                "DECLARATION", declarationRef);
    }

    @Transactional
    public void notifyDebtIssued(Long taxpayerUserId, String debtRef, String taxpayerNif, java.math.BigDecimal amount) {
        if (taxpayerUserId == null) return;
        saveIfNotDuplicate(taxpayerUserId, NotificationType.DOCUMENT_READY,
                "Créance émise - " + debtRef,
                "Une créance de " + amount + " MGA a été émise pour le contribuable " + taxpayerNif + " (réf: " + debtRef + ").",
                "DEBT", debtRef);
    }

    @Transactional
    public void notifyCollectionNotice(Long taxpayerUserId, String debtRef, java.math.BigDecimal balance) {
        if (taxpayerUserId == null) return;
        saveIfNotDuplicate(taxpayerUserId, NotificationType.COLLECTION_NOTICE,
                "Mise en recouvrement - " + debtRef,
                "La créance " + debtRef + " d'un solde de " + balance + " MGA a été mise en recouvrement.",
                "DEBT", debtRef);
    }

    private void saveIfNotDuplicate(Long userId, NotificationType type, String title, String message,
                                   String entityType, String entityId) {
        boolean already = notificationRepository
                .findByUserIdAndEntityTypeAndEntityIdAndTypeAndCreatedAtAfter(
                        userId, entityType, entityId, type, Instant.now().minusSeconds(86400))
                .isPresent();
        if (!already) {
            notificationRepository.save(Notification.builder()
                    .userId(userId)
                    .type(type)
                    .title(title)
                    .message(message)
                    .entityType(entityType)
                    .entityId(entityId)
                    .read(false)
                    .createdAt(Instant.now())
                    .build());
        }
    }

    /**
     * Tâche quotidienne : détecte les impayés (OVERDUE) et génère les
     * notifications d'échéances (J-30, J-15, J-7, J-3, J-1, J+1).
     */
    @Scheduled(cron = "${mnk-tax.scheduler.deadline-cron:0 0 7 * * *}")
    @Transactional
    public void dailyDeadlineCheck() {
        LocalDate today = LocalDate.now();
        try {
            int overdue = debtService.markOverdue(today);
            if (overdue > 0) {
                log.info("{} créances passées en OVERDUE", overdue);
            }
        } catch (Exception ex) {
            log.error("Echec détection impayés", ex);
        }
        List<Deadline> deadlines = deadlineRepository.findAllByOrderByDeclarationDeadlineAsc();
        for (Deadline deadline : deadlines) {
            long days = ChronoUnit.DAYS.between(today, deadline.getDeclarationDeadline());
            if (days == 0) {
                notifyAgents(NotificationType.DEADLINE_TODAY,
                        "Échéance aujourd'hui - " + deadline.getTaxType().getCode() + " " + deadline.getPeriod(),
                        "La date limite de déclaration pour " + deadline.getTaxType().getName()
                                + " période " + deadline.getPeriod() + " est aujourd'hui ("
                                + deadline.getDeclarationDeadline() + ").",
                        "DEADLINE", String.valueOf(deadline.getId()));
            } else if (days > 0 && days <= 30 && ALERT_DAYS.contains((int) days)) {
                notifyAgents(NotificationType.DEADLINE_APPROACHING,
                        "Échéance J-" + days + " - " + deadline.getTaxType().getCode() + " " + deadline.getPeriod(),
                        "Échéance de déclaration pour " + deadline.getTaxType().getName()
                                + " (" + deadline.getPeriod() + ") dans " + days + " jour(s), le "
                                + deadline.getDeclarationDeadline() + ".",
                        "DEADLINE", String.valueOf(deadline.getId()));
            }
        }
        // Notifications de retard
        List<TaxDebt> overdueDebts = debtRepository.findByStatusAndDueDateBefore(DebtStatus.OVERDUE, today);
        for (TaxDebt debt : overdueDebts) {
            notifyAgents(NotificationType.OVERDUE,
                    "Créance en retard - " + debt.getReference(),
                    "La créance " + debt.getReference() + " du contribuable " + debt.getTaxpayer().getNif()
                            + " est en retard. Solde : " + debt.getBalance() + " MGA.",
                    "DEBT", String.valueOf(debt.getId()));
        }
    }

    private void notifyAgents(NotificationType type, String title, String message, String entityType, String entityId) {
        List<com.mnktax.auth.entity.User> recipients = userRepository.findAll().stream()
                .filter(u -> u.isEnabled())
                .filter(u -> u.getRoles().stream().map(Role::getCode)
                        .anyMatch(r -> Set.of(Role.ADMIN, Role.TAX_AGENT, Role.COLLECTION_AGENT).contains(r)))
                .toList();
        for (com.mnktax.auth.entity.User user : recipients) {
            boolean already = notificationRepository
                    .findByUserIdAndEntityTypeAndEntityIdAndTypeAndCreatedAtAfter(
                            user.getId(), entityType, entityId, type, Instant.now().minusSeconds(86400))
                    .isPresent();
            if (already) {
                continue;
            }
            notificationRepository.save(Notification.builder()
                    .userId(user.getId())
                    .type(type)
                    .title(title)
                    .message(message)
                    .entityType(entityType)
                    .entityId(entityId)
                    .read(false)
                    .createdAt(Instant.now())
                    .build());
        }
    }
}
