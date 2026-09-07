package com.mnktax.payment.service;

import com.mnktax.audit.service.AuditService;
import com.mnktax.common.exception.BusinessException;
import com.mnktax.common.exception.ResourceNotFoundException;
import com.mnktax.common.util.ReferenceGenerator;
import com.mnktax.common.util.SecurityUtils;
import com.mnktax.debt.entity.DebtHistory;
import com.mnktax.debt.entity.DebtStatus;
import com.mnktax.debt.entity.TaxDebt;
import com.mnktax.debt.repository.DebtHistoryRepository;
import com.mnktax.debt.repository.TaxDebtRepository;
import com.mnktax.debt.service.DebtService;
import com.mnktax.declaration.entity.Declaration;
import com.mnktax.declaration.repository.DeclarationRepository;
import com.mnktax.notification.service.NotificationService;
import com.mnktax.payment.dto.PaymentDtos.AllocationRequest;
import com.mnktax.payment.dto.PaymentDtos.CancelPaymentRequest;
import com.mnktax.payment.dto.PaymentDtos.CreatePaymentRequest;
import com.mnktax.payment.dto.PaymentDtos.PaymentDto;
import com.mnktax.payment.dto.PaymentDtos.PaymentStatsDto;
import com.mnktax.payment.dto.PaymentDtos.ReconcileResult;
import com.mnktax.payment.entity.Payment;
import com.mnktax.payment.entity.PaymentAllocation;
import com.mnktax.payment.entity.PaymentStatus;
import com.mnktax.payment.repository.PaymentAllocationRepository;
import com.mnktax.payment.repository.PaymentRepository;
import com.mnktax.paymentplan.service.PaymentPlanService;
import com.mnktax.receipt.entity.Receipt;
import com.mnktax.receipt.repository.ReceiptRepository;
import com.mnktax.receipt.service.ReceiptService;
import com.mnktax.tax.entity.PaymentObligationStatus;
import com.mnktax.tax.service.TaxObligationService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.context.annotation.Lazy;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * Enregistrement transactionnel d'un paiement :
 *
 * Payment → validation → recherche créance (verrou pessimiste) →
 * allocation (principal / pénalité / intérêt) → mise à jour du solde →
 * mise à jour du statut → génération de la quittance → audit log.
 *
 * Toute erreur provoque un rollback complet (transaction Spring).
 */
@Service
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final PaymentAllocationRepository allocationRepository;
    private final TaxDebtRepository debtRepository;
    private final DebtHistoryRepository debtHistoryRepository;
    private final PaymentPlanService paymentPlanService;
    private final DebtService debtService;
    private final ReceiptService receiptService;
    private final ReceiptRepository receiptRepository;
    private final AuditService auditService;
    private final NotificationService notificationService;
    private final TaxObligationService obligationService;
    private final DeclarationRepository declarationRepository;

    public PaymentService(PaymentRepository paymentRepository, PaymentAllocationRepository allocationRepository,
                          TaxDebtRepository debtRepository, DebtHistoryRepository debtHistoryRepository,
                          PaymentPlanService paymentPlanService,
                          DebtService debtService,
                          ReceiptService receiptService, ReceiptRepository receiptRepository,
                          AuditService auditService, NotificationService notificationService,
                          @Lazy TaxObligationService obligationService,
                          DeclarationRepository declarationRepository) {
        this.paymentRepository = paymentRepository;
        this.allocationRepository = allocationRepository;
        this.debtRepository = debtRepository;
        this.debtHistoryRepository = debtHistoryRepository;
        this.paymentPlanService = paymentPlanService;
        this.debtService = debtService;
        this.receiptService = receiptService;
        this.receiptRepository = receiptRepository;
        this.auditService = auditService;
        this.notificationService = notificationService;
        this.obligationService = obligationService;
        this.declarationRepository = declarationRepository;
    }

    @Transactional
    public PaymentDto record(CreatePaymentRequest request, HttpServletRequest http) {
        if (request.amount().signum() <= 0) {
            throw new BusinessException("INVALID_AMOUNT", "Le montant doit être strictement positif.");
        }
        TaxDebt debt = debtRepository.findByIdForUpdate(request.debtId())
                .orElseThrow(() -> new ResourceNotFoundException("Créance", request.debtId()));

        if (debt.getStatus() == DebtStatus.PAID || debt.getStatus() == DebtStatus.CANCELLED) {
            throw new BusinessException("DEBT_NOT_PAYABLE",
                    "Cette créance est " + debt.getStatus()
                            + " et ne peut pas recevoir un nouveau paiement sans procédure spécifique.");
        }
        if (request.amount().compareTo(debt.getBalance()) > 0) {
            throw new BusinessException("PAYMENT_EXCEEDS_BALANCE",
                    "Le paiement (" + request.amount() + ") dépasse le solde restant de la créance ("
                            + debt.getBalance() + ").");
        }

        // Déclaration liée
        Declaration declaration = null;
        if (request.declarationId() != null) {
            declaration = declarationRepository.findById(request.declarationId()).orElse(null);
        }
        if (declaration == null && debt.getAssessment() != null && debt.getAssessment().getDeclaration() != null) {
            declaration = debt.getAssessment().getDeclaration();
        }

        Payment payment = Payment.builder()
                .reference(ReferenceGenerator.next("PAY"))
                .taxpayer(debt.getTaxpayer())
                .debt(debt)
                .declaration(declaration)
                .paymentDate(request.paymentDate())
                .amount(request.amount())
                .currency("MGA")
                .method(request.method())
                .transactionReference(request.transactionReference())
                .status(PaymentStatus.PENDING)
                .allocatedAmount(BigDecimal.ZERO)
                .unpaidAmount(request.amount())
                .observations(request.observations())
                .createdBy(SecurityUtils.currentUsername())
                .recordedAt(Instant.now())
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
        paymentRepository.save(payment);

        // Allocation
        allocate(payment, debt, request.allocations());

        BigDecimal allocated = allocationRepository.findByPaymentIdOrderByIdAsc(payment.getId()).stream()
                .map(PaymentAllocation::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        payment.setAllocatedAmount(allocated);
        payment.setUnpaidAmount(payment.getAmount().subtract(allocated));

        if (allocated.compareTo(payment.getAmount()) >= 0) {
            payment.setStatus(PaymentStatus.ALLOCATED);
        } else if (allocated.signum() > 0) {
            payment.setStatus(PaymentStatus.PARTIALLY_ALLOCATED);
        } else {
            payment.setStatus(PaymentStatus.PENDING);
        }
        payment.setUpdatedAt(Instant.now());
        paymentRepository.save(payment);

        // Mise à jour de la dette
        debt.setPaidAmount(debt.getPaidAmount().add(allocated));
        debtService.recalculate(debt);
        debt.setUpdatedAt(Instant.now());
        debtRepository.save(debt);

        // Trace append-only sur la créance
        debtHistoryRepository.save(DebtHistory.builder()
                .debt(debt)
                .eventType("PAYMENT")
                .description("Paiement " + payment.getReference() + " de " + allocated + " MGA enregistré")
                .oldValue(null)
                .newValue("Alloué : " + allocated + " MGA — nouveau solde : " + debt.getBalance())
                .performedBy(SecurityUtils.currentUsername())
                .eventDate(Instant.now())
                .createdAt(Instant.now())
                .build());

        // Répercute le paiement sur l'échéancier éventuel de la créance
        paymentPlanService.syncFromPayments(debt.getId());

        // Quittance
        Receipt receipt = receiptService.generate(payment);

        // Notifications
        notificationService.notifyPaymentReceived(debt.getTaxpayer().getUserId(), payment.getReference(),
                debt.getTaxpayer().getNif(), payment.getAmount());
        if (receipt != null) {
            notificationService.notifyReceiptReady(debt.getTaxpayer().getUserId(), receipt.getReference(),
                    debt.getTaxpayer().getNif());
        }
        if (allocated.signum() > 0 && allocated.compareTo(payment.getAmount()) < 0) {
            notificationService.notifyTaxpayer(debt.getTaxpayer().getUserId(),
                    com.mnktax.notification.entity.NotificationType.PAYMENT_RECEIVED,
                    "Paiement partiel - " + payment.getReference(),
                    "Un paiement partiel de " + payment.getAmount() + " MGA a été enregistré. "
                            + "Montant alloué : " + allocated + " MGA.",
                    "PAYMENT", payment.getReference());
        }

        // Obligation
        if (debt.getTaxpayer() != null && debt.getTaxType() != null && debt.getPeriod() != null) {
            PaymentObligationStatus oblPaymentStatus = debt.getBalance().signum() == 0
                    ? PaymentObligationStatus.PAID
                    : PaymentObligationStatus.PARTIALLY_PAID;
            obligationService.syncPaymentStatus(debt.getTaxpayer().getId(),
                    debt.getTaxType().getCode(), debt.getPeriod(), oblPaymentStatus);
        }

        // Audit
        auditService.record("PAYMENT", "DEBT", String.valueOf(debt.getId()),
                null, payment.getReference(), http);
        auditService.record("RECEIPT_GENERATED", "RECEIPT", receipt.getReference(), null, null, http);

        return toDto(payment);
    }

    @Transactional
    public PaymentDto confirm(Long paymentId, HttpServletRequest http) {
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new ResourceNotFoundException("Paiement", paymentId));
        if (payment.getStatus() != PaymentStatus.PENDING) {
            throw new BusinessException("INVALID_STATUS",
                    "Seuls les paiements en attente peuvent être confirmés. Statut actuel : " + payment.getStatus());
        }
        payment.setStatus(PaymentStatus.CONFIRMED);
        payment.setUpdatedAt(Instant.now());
        Payment saved = paymentRepository.save(payment);

        auditService.record("PAYMENT_CONFIRM", "PAYMENT", String.valueOf(paymentId),
                PaymentStatus.PENDING.name(), PaymentStatus.CONFIRMED.name(), http);

        notificationService.notifyTaxpayer(payment.getTaxpayer().getUserId(),
                com.mnktax.notification.entity.NotificationType.PAYMENT_RECEIVED,
                "Paiement confirmé - " + payment.getReference(),
                "Votre paiement " + payment.getReference() + " d'un montant de " + payment.getAmount() + " MGA a été confirmé.",
                "PAYMENT", payment.getReference());

        return toDto(saved);
    }

    @Transactional
    public PaymentDto allocatePayment(Long paymentId, List<AllocationRequest> allocations, HttpServletRequest http) {
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new ResourceNotFoundException("Paiement", paymentId));
        if (payment.getStatus() == PaymentStatus.CANCELLED || payment.getStatus() == PaymentStatus.REFUNDED) {
            throw new BusinessException("INVALID_STATUS",
                    "On ne peut pas allouer un paiement " + payment.getStatus() + ".");
        }
        if (payment.getStatus() == PaymentStatus.ALLOCATED) {
            throw new BusinessException("ALREADY_ALLOCATED",
                    "Ce paiement est déjà entièrement alloué.");
        }

        BigDecimal remaining = payment.getAmount().subtract(payment.getAllocatedAmount());

        for (AllocationRequest alloc : allocations) {
            if (remaining.signum() <= 0) break;
            TaxDebt debt = debtRepository.findByIdForUpdate(alloc.debtId())
                    .orElseThrow(() -> new ResourceNotFoundException("Créance", alloc.debtId()));
            if (debt.getStatus() == DebtStatus.PAID || debt.getStatus() == DebtStatus.CANCELLED) {
                throw new BusinessException("DEBT_NOT_PAYABLE",
                        "La créance " + debt.getReference() + " est " + debt.getStatus() + ".");
            }
            BigDecimal allocAmount = alloc.amount().min(remaining);
            allocateComponent(payment, debt, PaymentAllocation.Component.PRINCIPAL, allocAmount, alloc.comment());
            remaining = remaining.subtract(allocAmount);
        }

        BigDecimal totalAllocated = allocationRepository.findByPaymentIdOrderByIdAsc(payment.getId()).stream()
                .map(PaymentAllocation::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        payment.setAllocatedAmount(totalAllocated);
        payment.setUnpaidAmount(payment.getAmount().subtract(totalAllocated));
        if (totalAllocated.compareTo(payment.getAmount()) >= 0) {
            payment.setStatus(PaymentStatus.ALLOCATED);
        } else {
            payment.setStatus(PaymentStatus.PARTIALLY_ALLOCATED);
        }
        payment.setUpdatedAt(Instant.now());
        paymentRepository.save(payment);

        // Recalcul des dettes
        for (PaymentAllocation pa : allocationRepository.findByPaymentIdOrderByIdAsc(payment.getId())) {
            TaxDebt d = pa.getDebt();
            d.setPaidAmount(allocationRepository.findByDebtIdOrderByIdAsc(d.getId()).stream()
                    .map(PaymentAllocation::getAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add));
            debtService.recalculate(d);
            d.setUpdatedAt(Instant.now());
            debtRepository.save(d);
            paymentPlanService.syncFromPayments(d.getId());
        }

        // Quittance si entièrement alloué
        if (payment.getStatus() == PaymentStatus.ALLOCATED) {
            Receipt receipt = receiptRepository.findByPaymentId(paymentId).orElse(null);
            if (receipt == null) {
                receipt = receiptService.generate(payment);
                notificationService.notifyReceiptReady(payment.getTaxpayer().getUserId(),
                        receipt.getReference(), payment.getTaxpayer().getNif());
            }
        }

        auditService.record("PAYMENT_ALLOCATE", "PAYMENT", String.valueOf(paymentId),
                null, totalAllocated + " MGA alloués", http);

        return toDto(payment);
    }

    @Transactional
    public PaymentDto cancel(Long paymentId, CancelPaymentRequest request, HttpServletRequest http) {
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new ResourceNotFoundException("Paiement", paymentId));
        if (payment.getStatus() == PaymentStatus.CANCELLED) {
            throw new BusinessException("ALREADY_CANCELLED", "Ce paiement est déjà annulé.");
        }
        if (payment.getStatus() == PaymentStatus.REFUNDED) {
            throw new BusinessException("ALREADY_REFUNDED", "Ce paiement a été remboursé.");
        }

        PaymentStatus oldStatus = payment.getStatus();

        // Invalider les allocations
        List<PaymentAllocation> allocs = allocationRepository.findByPaymentIdOrderByIdAsc(paymentId);
        java.util.Set<Long> affectedDebts = new java.util.HashSet<>();
        for (PaymentAllocation alloc : allocs) {
            affectedDebts.add(alloc.getDebt().getId());
            TaxDebt debt = alloc.getDebt();
            debt.setPaidAmount(debt.getPaidAmount().subtract(alloc.getAmount()));
            // L'annulation d'un paiement peut légitimement faire renaître une
            // créance entièrement réglée (reversement) : on autorise la sortie
            // de l'état PAYÉ pour cette seule opération de sens opposé.
            debtService.recalculate(debt, true);
            debt.setUpdatedAt(Instant.now());
            debtRepository.save(debt);
            debtHistoryRepository.save(DebtHistory.builder()
                    .debt(debt)
                    .eventType("PAYMENT_CANCELLED")
                    .description("Paiement " + payment.getReference() + " annulé : " + alloc.getAmount()
                            + " MGA retirés" + (request.reason() != null ? " — " + request.reason() : ""))
                    .oldValue(null)
                    .newValue("Nouveau solde : " + debt.getBalance())
                    .performedBy(SecurityUtils.currentUsername())
                    .eventDate(Instant.now())
                    .createdAt(Instant.now())
                    .build());
        }
        allocationRepository.deleteAll(allocs);

        // Resynchronise les échéanciers des créances concernées
        for (Long debtId : affectedDebts) {
            paymentPlanService.syncFromPayments(debtId);
        }

        payment.setStatus(PaymentStatus.CANCELLED);
        payment.setAllocatedAmount(BigDecimal.ZERO);
        payment.setUnpaidAmount(payment.getAmount());
        payment.setRejectionReason(request.reason());
        payment.setUpdatedAt(Instant.now());
        Payment saved = paymentRepository.save(payment);

        // Annulation quittance
        receiptRepository.findByPaymentId(paymentId).ifPresent(receipt -> {
            receipt.setStatus(com.mnktax.receipt.entity.ReceiptStatus.VOID);
            receiptRepository.save(receipt);
        });

        // Notification
        notificationService.notifyTaxpayer(payment.getTaxpayer().getUserId(),
                com.mnktax.notification.entity.NotificationType.PAYMENT_REJECTED,
                "Paiement annulé - " + payment.getReference(),
                "Le paiement " + payment.getReference() + " a été annulé. Motif : " + request.reason(),
                "PAYMENT", payment.getReference());

        // Audit
        auditService.record("PAYMENT_CANCEL", "PAYMENT", String.valueOf(paymentId),
                oldStatus.name(), PaymentStatus.CANCELLED.name(), http);

        return toDto(saved);
    }

    @Transactional
    public PaymentDto reject(Long paymentId, String reason, HttpServletRequest http) {
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new ResourceNotFoundException("Paiement", paymentId));
        if (payment.getStatus() == PaymentStatus.CANCELLED || payment.getStatus() == PaymentStatus.REFUNDED) {
            throw new BusinessException("INVALID_STATUS",
                    "On ne peut pas rejeter un paiement " + payment.getStatus() + ".");
        }

        PaymentStatus oldStatus = payment.getStatus();
        payment.setStatus(PaymentStatus.REJECTED);
        payment.setRejectionReason(reason);
        payment.setUpdatedAt(Instant.now());
        Payment saved = paymentRepository.save(payment);

        notificationService.notifyTaxpayer(payment.getTaxpayer().getUserId(),
                com.mnktax.notification.entity.NotificationType.PAYMENT_REJECTED,
                "Paiement rejeté - " + payment.getReference(),
                "Le paiement " + payment.getReference() + " a été rejeté. Motif : " + (reason != null ? reason : "non précisé"),
                "PAYMENT", payment.getReference());

        auditService.record("PAYMENT_REJECT", "PAYMENT", String.valueOf(paymentId),
                oldStatus.name(), PaymentStatus.REJECTED.name(), http);

        return toDto(saved);
    }

    @Transactional(readOnly = true)
    public PaymentDto get(Long id) {
        Payment payment = paymentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Paiement", id));
        return toDto(payment);
    }

    @Transactional(readOnly = true)
    public Page<PaymentDto> search(PaymentStatus status, Long taxpayerId,
                                   String method, LocalDate from, LocalDate to,
                                   String q, Long debtId, String taxTypeCode,
                                   Long declarationId, String center, Pageable pageable) {
        String q2 = (q == null || q.isBlank()) ? null : q.trim();
        String method2 = (method == null || method.isBlank()) ? null : method.trim();
        String center2 = (center == null || center.isBlank()) ? null : center.trim();
        return paymentRepository.search(status, taxpayerId, method2, from, to, q2,
                        debtId, taxTypeCode, declarationId, center2, pageable)
                .map(this::toDto);
    }

    @Transactional(readOnly = true)
    public PaymentStatsDto stats() {
        LocalDate today = LocalDate.now();
        LocalDate monthStart = today.withDayOfMonth(1);
        LocalDate monthEnd = today.withDayOfMonth(today.lengthOfMonth());

        return new PaymentStatsDto(
                paymentRepository.countByDate(today),
                paymentRepository.countByDateRange(monthStart, monthEnd),
                paymentRepository.sumAmountByDateRange(monthStart, monthEnd),
                paymentRepository.sumUnallocated(),
                paymentRepository.countByStatus(PaymentStatus.PENDING),
                paymentRepository.countByStatus(PaymentStatus.REJECTED),
                paymentRepository.countByStatus(PaymentStatus.ALLOCATED),
                paymentRepository.countByStatus(PaymentStatus.CANCELLED),
                paymentRepository.countByStatus(PaymentStatus.PARTIALLY_ALLOCATED)
        );
    }

    @Transactional(readOnly = true)
    public ReconcileResult reconcile(Long paymentId) {
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new ResourceNotFoundException("Paiement", paymentId));
        BigDecimal allocSum = allocationRepository.findByPaymentIdOrderByIdAsc(paymentId).stream()
                .map(PaymentAllocation::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal unpaid = payment.getAmount().subtract(allocSum);
        boolean consistent = allocSum.add(unpaid).compareTo(payment.getAmount()) == 0;
        List<String> issues = new ArrayList<>();
        if (!consistent) {
            issues.add("Incohérence : montant payé=" + payment.getAmount()
                    + ", allocations=" + allocSum + ", non alloué=" + unpaid);
        }
        if (payment.getStatus() == PaymentStatus.ALLOCATED && unpaid.signum() > 0) {
            issues.add("Statut ALLOCATED mais solde non alloué = " + unpaid);
        }
        if (payment.getStatus() == PaymentStatus.PARTIALLY_ALLOCATED && unpaid.signum() == 0) {
            issues.add("Statut PARTIALLY_ALLOCATED mais tout le montant est alloué.");
        }
        return new ReconcileResult(consistent, payment.getAmount(), allocSum, unpaid, issues);
    }

    public List<Payment> listByTaxpayer(Long taxpayerId) {
        return paymentRepository.findByTaxpayerIdOrderByIdDesc(taxpayerId);
    }

    /* ── Allocation interne ──────────────────────────────────────── */

    private void allocate(Payment payment, TaxDebt debt, List<AllocationRequest> allocations) {
        BigDecimal remaining = payment.getAmount();

        if (allocations != null && !allocations.isEmpty()) {
            for (AllocationRequest alloc : allocations) {
                if (remaining.signum() <= 0) break;
                TaxDebt allocDebt = alloc.debtId().equals(debt.getId())
                        ? debt
                        : debtRepository.findByIdForUpdate(alloc.debtId())
                        .orElseThrow(() -> new ResourceNotFoundException("Créance", alloc.debtId()));
                BigDecimal allocAmount = alloc.amount().min(remaining);
                allocateComponent(payment, allocDebt, PaymentAllocation.Component.PRINCIPAL, allocAmount, alloc.comment());
                remaining = remaining.subtract(allocAmount);
            }
            if (remaining.signum() != 0) {
                throw new BusinessException("ALLOCATION_MISMATCH",
                        "La somme des allocations (" + payment.getAmount().subtract(remaining)
                                + ") ne couvre pas le montant payé (" + payment.getAmount() + ").");
            }
            return;
        }

        // Allocation automatique: Principal → Pénalité → Intérêt
        remaining = autoAllocate(payment, debt, PaymentAllocation.Component.PRINCIPAL, remaining);
        remaining = autoAllocate(payment, debt, PaymentAllocation.Component.PENALTY, remaining);
        autoAllocate(payment, debt, PaymentAllocation.Component.INTEREST, remaining);
    }

    private BigDecimal autoAllocate(Payment payment, TaxDebt debt, PaymentAllocation.Component component,
                                    BigDecimal available) {
        if (available.signum() <= 0) return BigDecimal.ZERO;
        BigDecimal alreadyAllocated = allocationRepository.sumByDebtAndComponent(debt.getId(), component);
        BigDecimal componentTotal = switch (component) {
            case PRINCIPAL -> debt.getPrincipalAmount();
            case PENALTY -> debt.getPenaltyAmount();
            case INTEREST -> debt.getInterestAmount();
        };
        BigDecimal componentRemaining = componentTotal.subtract(alreadyAllocated).max(BigDecimal.ZERO);
        BigDecimal amount = available.min(componentRemaining);
        if (amount.signum() > 0) {
            allocationRepository.save(PaymentAllocation.builder()
                    .payment(payment)
                    .debt(debt)
                    .amount(amount.setScale(2, RoundingMode.HALF_UP))
                    .component(component)
                    .allocatedAt(Instant.now())
                    .createdBy(SecurityUtils.currentUsername())
                    .build());
        }
        return available.subtract(amount);
    }

    private void allocateComponent(Payment payment, TaxDebt debt, PaymentAllocation.Component component,
                                   BigDecimal amount, String comment) {
        if (amount == null || amount.signum() <= 0) return;
        allocationRepository.save(PaymentAllocation.builder()
                .payment(payment)
                .debt(debt)
                .amount(amount.setScale(2, RoundingMode.HALF_UP))
                .component(component)
                .allocatedAt(Instant.now())
                .createdBy(SecurityUtils.currentUsername())
                .comment(comment)
                .build());
    }

    /* ── Conversion DTO ──────────────────────────────────────────── */

    private PaymentDto toDto(Payment payment) {
        String receiptRef = receiptRepository.findByPaymentId(payment.getId())
                .map(Receipt::getReference).orElse(null);
        List<PaymentAllocation> allocs = allocationRepository.findByPaymentIdOrderByIdAsc(payment.getId());
        return PaymentDto.from(payment, receiptRef, allocs);
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }
}
