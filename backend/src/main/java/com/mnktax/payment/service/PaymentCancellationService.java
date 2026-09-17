package com.mnktax.payment.service;

import com.mnktax.common.exception.BusinessException;
import com.mnktax.common.exception.ResourceNotFoundException;
import com.mnktax.common.util.SecurityUtils;
import com.mnktax.debt.entity.DebtHistory;
import com.mnktax.debt.entity.DebtStatus;
import com.mnktax.debt.entity.TaxDebt;
import com.mnktax.debt.repository.DebtHistoryRepository;
import com.mnktax.debt.repository.TaxDebtRepository;
import com.mnktax.debt.service.DebtService;
import com.mnktax.payment.dto.PaymentDtos.CancelPaymentRequest;
import com.mnktax.payment.dto.PaymentDtos.PaymentDto;
import com.mnktax.payment.entity.Payment;
import com.mnktax.payment.entity.PaymentAllocation;
import com.mnktax.payment.entity.PaymentStatus;
import com.mnktax.payment.repository.PaymentAllocationRepository;
import com.mnktax.payment.repository.PaymentRepository;
import com.mnktax.paymentplan.service.PaymentPlanService;
import com.mnktax.receipt.entity.ReceiptStatus;
import com.mnktax.receipt.repository.ReceiptRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
public class PaymentCancellationService {

    private final PaymentRepository paymentRepository;
    private final PaymentAllocationRepository allocationRepository;
    private final TaxDebtRepository debtRepository;
    private final DebtHistoryRepository debtHistoryRepository;
    private final DebtService debtService;
    private final PaymentPlanService paymentPlanService;
    private final ReceiptRepository receiptRepository;

    public PaymentCancellationService(PaymentRepository paymentRepository, PaymentAllocationRepository allocationRepository,
                                      TaxDebtRepository debtRepository, DebtHistoryRepository debtHistoryRepository,
                                      DebtService debtService, PaymentPlanService paymentPlanService,
                                      ReceiptRepository receiptRepository) {
        this.paymentRepository = paymentRepository;
        this.allocationRepository = allocationRepository;
        this.debtRepository = debtRepository;
        this.debtHistoryRepository = debtHistoryRepository;
        this.debtService = debtService;
        this.paymentPlanService = paymentPlanService;
        this.receiptRepository = receiptRepository;
    }

    @Transactional
    public PaymentDto cancel(Long paymentId, CancelPaymentRequest request, jakarta.servlet.http.HttpServletRequest http) {
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new ResourceNotFoundException("Paiement", paymentId));
        if (payment.getStatus() == PaymentStatus.CANCELLED) {
            throw new BusinessException("ALREADY_CANCELLED", "Ce paiement est déjà annulé.");
        }
        if (payment.getStatus() == PaymentStatus.REFUNDED) {
            throw new BusinessException("ALREADY_REFUNDED", "Ce paiement a été remboursé.");
        }
        PaymentStatus oldStatus = payment.getStatus();
        List<PaymentAllocation> allocs = allocationRepository.findByPaymentIdOrderByIdAsc(paymentId);
        Set<Long> affectedDebts = new HashSet<>();
        for (PaymentAllocation alloc : allocs) {
            affectedDebts.add(alloc.getDebt().getId());
            TaxDebt debt = alloc.getDebt();
            debt.setPaidAmount(debt.getPaidAmount().subtract(alloc.getAmount()));
            debtService.recalculate(debt, true);
            debt.setUpdatedAt(Instant.now());
            debtRepository.save(debt);
            debtHistoryRepository.save(DebtHistory.builder()
                    .debt(debt).eventType("PAYMENT_CANCELLED")
                    .description("Paiement " + payment.getReference() + " annulé : " + alloc.getAmount() + " MGA retirés"
                            + (request.reason() != null ? " — " + request.reason() : ""))
                    .oldValue(null)
                    .newValue("Nouveau solde : " + debt.getBalance())
                    .performedBy(SecurityUtils.currentUsername())
                    .eventDate(Instant.now()).createdAt(Instant.now()).build());
        }
        allocationRepository.deleteAll(allocs);
        for (Long debtId : affectedDebts) {
            paymentPlanService.syncFromPayments(debtId);
        }
        payment.setStatus(PaymentStatus.CANCELLED);
        payment.setAllocatedAmount(BigDecimal.ZERO);
        payment.setUnpaidAmount(payment.getAmount());
        payment.setRejectionReason(request.reason());
        payment.setUpdatedAt(Instant.now());
        Payment saved = paymentRepository.save(payment);
        receiptRepository.findByPaymentId(paymentId).ifPresent(receipt -> {
            receipt.setStatus(ReceiptStatus.VOID);
            receiptRepository.save(receipt);
        });
        return toDto(saved);
    }

    @Transactional
    public PaymentDto reject(Long paymentId, String reason, jakarta.servlet.http.HttpServletRequest http) {
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new ResourceNotFoundException("Paiement", paymentId));
        if (payment.getStatus() == PaymentStatus.CANCELLED || payment.getStatus() == PaymentStatus.REFUNDED) {
            throw new BusinessException("INVALID_STATUS", "On ne peut pas rejeter un paiement " + payment.getStatus() + ".");
        }
        PaymentStatus oldStatus = payment.getStatus();
        payment.setStatus(PaymentStatus.REJECTED);
        payment.setRejectionReason(reason);
        payment.setUpdatedAt(Instant.now());
        Payment saved = paymentRepository.save(payment);
        return toDto(saved);
    }

    private PaymentDto toDto(Payment payment) {
        String receiptRef = receiptRepository.findByPaymentId(payment.getId())
                .map(com.mnktax.receipt.entity.Receipt::getReference).orElse(null);
        List<PaymentAllocation> allocs = allocationRepository.findByPaymentIdOrderByIdAsc(payment.getId());
        return PaymentDto.from(payment, receiptRef, allocs);
    }
}
