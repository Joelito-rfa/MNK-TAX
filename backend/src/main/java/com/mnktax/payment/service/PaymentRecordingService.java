package com.mnktax.payment.service;

import com.mnktax.audit.service.AuditService;
import com.mnktax.common.exception.BusinessException;
import com.mnktax.common.exception.ResourceNotFoundException;
import com.mnktax.common.util.ReferenceGenerator;
import com.mnktax.communication.entity.CommunicationEventType;
import com.mnktax.communication.service.CommunicationEventEngine;
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
import com.mnktax.payment.dto.PaymentDtos.CreatePaymentRequest;
import com.mnktax.payment.dto.PaymentDtos.PaymentDto;
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
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Service
public class PaymentRecordingService {

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
    private final CommunicationEventEngine communicationEventEngine;

    public PaymentRecordingService(PaymentRepository paymentRepository, PaymentAllocationRepository allocationRepository,
                                   TaxDebtRepository debtRepository, DebtHistoryRepository debtHistoryRepository,
                                   PaymentPlanService paymentPlanService, DebtService debtService,
                                   ReceiptService receiptService, ReceiptRepository receiptRepository,
                                   AuditService auditService, NotificationService notificationService,
                                   @Lazy TaxObligationService obligationService,
                                   DeclarationRepository declarationRepository,
                                   @Lazy CommunicationEventEngine communicationEventEngine) {
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
        this.communicationEventEngine = communicationEventEngine;
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
                    "Cette créance est " + debt.getStatus() + " et ne peut pas recevoir un nouveau paiement.");
        }
        if (request.amount().compareTo(debt.getBalance()) > 0) {
            throw new BusinessException("PAYMENT_EXCEEDS_BALANCE",
                    "Le paiement (" + request.amount() + ") dépasse le solde restant (" + debt.getBalance() + ").");
        }
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
        PaymentAllocationService.allocate(payment, debt, request.allocations(), allocationRepository, debtRepository);
        BigDecimal allocated = allocationRepository.findByPaymentIdOrderByIdAsc(payment.getId()).stream()
                .map(PaymentAllocation::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
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
        debt.setPaidAmount(debt.getPaidAmount().add(allocated));
        debtService.recalculate(debt);
        debt.setUpdatedAt(Instant.now());
        debtRepository.save(debt);
        debtHistoryRepository.save(DebtHistory.builder()
                .debt(debt).eventType("PAYMENT")
                .description("Paiement " + payment.getReference() + " de " + allocated + " MGA enregistré")
                .oldValue(null)
                .newValue("Alloué : " + allocated + " MGA — nouveau solde : " + debt.getBalance())
                .performedBy(SecurityUtils.currentUsername())
                .eventDate(Instant.now()).createdAt(Instant.now()).build());
        paymentPlanService.syncFromPayments(debt.getId());
        Receipt receipt = receiptService.generate(payment);
        notificationService.notifyPaymentReceived(debt.getTaxpayer().getUserId(), payment.getReference(),
                debt.getTaxpayer().getNif(), payment.getAmount());
        if (receipt != null) {
            notificationService.notifyReceiptReady(debt.getTaxpayer().getUserId(), receipt.getReference(), debt.getTaxpayer().getNif());
        }
        communicationEventEngine.onEvent(CommunicationEventType.PAYMENT_RECEIVED, debt.getTaxpayer(),
                java.util.Map.of("reference", payment.getReference(),
                        "amount", payment.getAmount().toPlainString(),
                        "receipt_reference", receipt == null ? "—" : receipt.getReference()));
        if (allocated.signum() > 0 && allocated.compareTo(payment.getAmount()) < 0) {
            notificationService.notifyTaxpayer(debt.getTaxpayer().getUserId(),
                    com.mnktax.notification.entity.NotificationType.PAYMENT_RECEIVED,
                    "Paiement partiel - " + payment.getReference(),
                    "Un paiement partiel de " + payment.getAmount() + " MGA a été enregistré. Montant alloué : " + allocated + " MGA.",
                    "PAYMENT", payment.getReference());
        }
        if (debt.getTaxpayer() != null && debt.getTaxType() != null && debt.getPeriod() != null) {
            PaymentObligationStatus oblPaymentStatus = debt.getBalance().signum() == 0
                    ? PaymentObligationStatus.PAID : PaymentObligationStatus.PARTIALLY_PAID;
            obligationService.syncPaymentStatus(debt.getTaxpayer().getId(), debt.getTaxType().getCode(), debt.getPeriod(), oblPaymentStatus);
        }
        auditService.record("PAYMENT", "DEBT", String.valueOf(debt.getId()), null, payment.getReference(), http);
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

    private PaymentDto toDto(Payment payment) {
        String receiptRef = receiptRepository.findByPaymentId(payment.getId())
                .map(Receipt::getReference).orElse(null);
        List<PaymentAllocation> allocs = allocationRepository.findByPaymentIdOrderByIdAsc(payment.getId());
        return PaymentDto.from(payment, receiptRef, allocs);
    }
}
