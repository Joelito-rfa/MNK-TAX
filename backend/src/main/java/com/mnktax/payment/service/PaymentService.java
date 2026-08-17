package com.mnktax.payment.service;

import com.mnktax.audit.service.AuditService;
import com.mnktax.common.exception.BusinessException;
import com.mnktax.common.exception.ResourceNotFoundException;
import com.mnktax.common.util.ReferenceGenerator;
import com.mnktax.common.util.SecurityUtils;
import com.mnktax.debt.entity.DebtStatus;
import com.mnktax.debt.entity.TaxDebt;
import com.mnktax.debt.repository.TaxDebtRepository;
import com.mnktax.debt.service.DebtService;
import com.mnktax.notification.service.NotificationService;
import com.mnktax.payment.dto.PaymentDtos.AllocationRequest;
import com.mnktax.payment.dto.PaymentDtos.CreatePaymentRequest;
import com.mnktax.payment.dto.PaymentDtos.PaymentDto;
import com.mnktax.payment.entity.Payment;
import com.mnktax.payment.entity.PaymentAllocation;
import com.mnktax.payment.entity.PaymentStatus;
import com.mnktax.payment.repository.PaymentAllocationRepository;
import com.mnktax.payment.repository.PaymentRepository;
import com.mnktax.receipt.entity.Receipt;
import com.mnktax.receipt.repository.ReceiptRepository;
import com.mnktax.receipt.service.ReceiptService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;

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
    private final DebtService debtService;
    private final ReceiptService receiptService;
    private final ReceiptRepository receiptRepository;
    private final AuditService auditService;
    private final NotificationService notificationService;

    public PaymentService(PaymentRepository paymentRepository, PaymentAllocationRepository allocationRepository,
                          TaxDebtRepository debtRepository, DebtService debtService,
                          ReceiptService receiptService, ReceiptRepository receiptRepository,
                          AuditService auditService, NotificationService notificationService) {
        this.paymentRepository = paymentRepository;
        this.allocationRepository = allocationRepository;
        this.debtRepository = debtRepository;
        this.debtService = debtService;
        this.receiptService = receiptService;
        this.receiptRepository = receiptRepository;
        this.auditService = auditService;
        this.notificationService = notificationService;
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

        Payment payment = Payment.builder()
                .reference(ReferenceGenerator.next("PAY"))
                .taxpayer(debt.getTaxpayer())
                .paymentDate(request.paymentDate())
                .amount(request.amount())
                .method(request.method())
                .status(PaymentStatus.RECORDED)
                .allocatedAmount(BigDecimal.ZERO)
                .createdBy(SecurityUtils.currentUsername())
                .recordedAt(Instant.now())
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
        paymentRepository.save(payment);

        allocate(payment, debt, request.allocations());

        BigDecimal allocated = allocationRepository.findByPaymentIdOrderByIdAsc(payment.getId()).stream()
                .map(PaymentAllocation::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        payment.setAllocatedAmount(allocated);
        payment.setStatus(PaymentStatus.ALLOCATED);
        payment.setUpdatedAt(Instant.now());
        paymentRepository.save(payment);

        debt.setPaidAmount(debt.getPaidAmount().add(allocated));
        debtService.recalculate(debt);
        debt.setUpdatedAt(Instant.now());
        debtRepository.save(debt);

        Receipt receipt = receiptService.generate(payment);

        notificationService.notifyPaymentReceived(null, payment.getReference(),
                debt.getTaxpayer().getNif(), payment.getAmount());
        notificationService.notifyReceiptReady(null, receipt.getReference(),
                debt.getTaxpayer().getNif());

        auditService.record("PAYMENT", "DEBT", String.valueOf(debt.getId()),
                null, payment.getReference(), http);
        auditService.record("RECEIPT_GENERATED", "RECEIPT", receipt.getReference(), null, null, http);

        return PaymentDto.from(payment, receipt.getReference());
    }

    private void allocate(Payment payment, TaxDebt debt, AllocationRequest allocations) {
        BigDecimal remaining = payment.getAmount();

        if (allocations != null) {
            allocateComponent(payment, debt, PaymentAllocation.Component.PRINCIPAL, allocations.principal(), remaining);
            BigDecimal used = safe(allocations.principal());
            remaining = remaining.subtract(used);
            BigDecimal penalty = safe(allocations.penalty());
            allocateComponent(payment, debt, PaymentAllocation.Component.PENALTY, penalty, remaining);
            remaining = remaining.subtract(penalty);
            BigDecimal interest = safe(allocations.interest());
            allocateComponent(payment, debt, PaymentAllocation.Component.INTEREST, interest, remaining);
            remaining = remaining.subtract(interest);
            if (remaining.signum() != 0) {
                throw new BusinessException("ALLOCATION_MISMATCH",
                        "La somme des allocations ne correspond pas au montant payé (" + payment.getAmount() + ").");
            }
            return;
        }

        remaining = autoAllocate(payment, debt, PaymentAllocation.Component.PRINCIPAL, remaining);
        remaining = autoAllocate(payment, debt, PaymentAllocation.Component.PENALTY, remaining);
        autoAllocate(payment, debt, PaymentAllocation.Component.INTEREST, remaining);
    }

    private BigDecimal autoAllocate(Payment payment, TaxDebt debt, PaymentAllocation.Component component,
                                    BigDecimal available) {
        if (available.signum() <= 0) {
            return BigDecimal.ZERO;
        }
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
                                   BigDecimal requested, BigDecimal maxAvailable) {
        if (requested == null || requested.signum() <= 0) {
            return;
        }
        BigDecimal available = maxAvailable;
        BigDecimal allocated = allocationRepository.sumByDebtAndComponent(debt.getId(), component);
        BigDecimal componentTotal = switch (component) {
            case PRINCIPAL -> debt.getPrincipalAmount();
            case PENALTY -> debt.getPenaltyAmount();
            case INTEREST -> debt.getInterestAmount();
        };
        BigDecimal componentRemaining = componentTotal.subtract(allocated).max(BigDecimal.ZERO);
        BigDecimal amount = requested.min(available).min(componentRemaining);
        if (amount.signum() > 0) {
            allocationRepository.save(PaymentAllocation.builder()
                    .payment(payment)
                    .debt(debt)
                    .amount(amount.setScale(2, RoundingMode.HALF_UP))
                    .component(component)
                    .allocatedAt(Instant.now())
                    .createdBy(SecurityUtils.currentUsername())
                    .build());
        } else {
            throw new BusinessException("ALLOCATION_EXCEEDS_COMPONENT",
                    "L'allocation demandée sur " + component + " dépasse le montant restant de cette composante.");
        }
    }

    @Transactional(readOnly = true)
    public PaymentDto get(Long id) {
        Payment payment = paymentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Paiement", id));
        String receiptRef = receiptRepository.findByPaymentId(id)
                .map(Receipt::getReference).orElse(null);
        return PaymentDto.from(payment, receiptRef);
    }

    @Transactional(readOnly = true)
    public Page<PaymentDto> search(com.mnktax.payment.entity.PaymentStatus status, Long taxpayerId,
                                   String method, java.time.LocalDate from, java.time.LocalDate to,
                                   String q, Pageable pageable) {
        return paymentRepository.search(status, taxpayerId, method, from, to, blankToNull(q), pageable)
                .map(p -> {
                    String receiptRef = receiptRepository.findByPaymentId(p.getId())
                            .map(Receipt::getReference).orElse(null);
                    return PaymentDto.from(p, receiptRef);
                });
    }

    public java.util.List<Payment> listByTaxpayer(Long taxpayerId) {
        return paymentRepository.findByTaxpayerIdOrderByIdDesc(taxpayerId);
    }

    private BigDecimal safe(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }
}
