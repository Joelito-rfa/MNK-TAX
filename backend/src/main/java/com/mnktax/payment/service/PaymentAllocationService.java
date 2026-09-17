package com.mnktax.payment.service;

import com.mnktax.common.exception.BusinessException;
import com.mnktax.common.exception.ResourceNotFoundException;
import com.mnktax.common.util.SecurityUtils;
import com.mnktax.debt.entity.DebtStatus;
import com.mnktax.debt.entity.TaxDebt;
import com.mnktax.debt.repository.TaxDebtRepository;
import com.mnktax.debt.service.DebtService;
import com.mnktax.payment.dto.PaymentDtos.AllocationRequest;
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
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.List;

@Service
public class PaymentAllocationService {

    private final PaymentRepository paymentRepository;
    private final PaymentAllocationRepository allocationRepository;
    private final TaxDebtRepository debtRepository;
    private final DebtService debtService;
    private final PaymentPlanService paymentPlanService;
    private final ReceiptService receiptService;
    private final ReceiptRepository receiptRepository;

    public PaymentAllocationService(PaymentRepository paymentRepository, PaymentAllocationRepository allocationRepository,
                                    TaxDebtRepository debtRepository, DebtService debtService,
                                    PaymentPlanService paymentPlanService,
                                    @Lazy ReceiptService receiptService, ReceiptRepository receiptRepository) {
        this.paymentRepository = paymentRepository;
        this.allocationRepository = allocationRepository;
        this.debtRepository = debtRepository;
        this.debtService = debtService;
        this.paymentPlanService = paymentPlanService;
        this.receiptService = receiptService;
        this.receiptRepository = receiptRepository;
    }

    public static void allocate(Payment payment, TaxDebt debt, List<AllocationRequest> allocations,
                                PaymentAllocationRepository allocationRepository, TaxDebtRepository debtRepository) {
        BigDecimal remaining = payment.getAmount();
        if (allocations != null && !allocations.isEmpty()) {
            for (AllocationRequest alloc : allocations) {
                if (remaining.signum() <= 0) break;
                TaxDebt allocDebt = alloc.debtId().equals(debt.getId())
                        ? debt : debtRepository.findByIdForUpdate(alloc.debtId())
                        .orElseThrow(() -> new ResourceNotFoundException("Créance", alloc.debtId()));
                BigDecimal allocAmount = alloc.amount().min(remaining);
                PaymentAllocationService.allocateComponent(payment, allocDebt, PaymentAllocation.Component.PRINCIPAL, allocAmount, alloc.comment(), allocationRepository);
                remaining = remaining.subtract(allocAmount);
            }
            if (remaining.signum() != 0) {
                throw new BusinessException("ALLOCATION_MISMATCH",
                        "La somme des allocations ne couvre pas le montant payé.");
            }
            return;
        }
        autoAllocate(payment, debt, PaymentAllocation.Component.PRINCIPAL, remaining, allocationRepository, debtRepository);
        autoAllocate(payment, debt, PaymentAllocation.Component.PENALTY, remaining, allocationRepository, debtRepository);
        autoAllocate(payment, debt, PaymentAllocation.Component.INTEREST, remaining, allocationRepository, debtRepository);
    }

    public static BigDecimal autoAllocate(Payment payment, TaxDebt debt, PaymentAllocation.Component component,
                                          BigDecimal available, PaymentAllocationRepository allocationRepository, TaxDebtRepository debtRepository) {
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
                    .payment(payment).debt(debt).amount(amount.setScale(2, RoundingMode.HALF_UP))
                    .component(component).allocatedAt(Instant.now()).createdBy(SecurityUtils.currentUsername()).build());
        }
        return available.subtract(amount);
    }

    public static void allocateComponent(Payment payment, TaxDebt debt, PaymentAllocation.Component component,
                                         BigDecimal amount, String comment, PaymentAllocationRepository allocationRepository) {
        if (amount == null || amount.signum() <= 0) return;
        allocationRepository.save(PaymentAllocation.builder()
                .payment(payment).debt(debt).amount(amount.setScale(2, RoundingMode.HALF_UP))
                .component(component).allocatedAt(Instant.now()).createdBy(SecurityUtils.currentUsername())
                .comment(comment).build());
    }

    @Transactional
    public PaymentDto allocate(Long paymentId, List<AllocationRequest> allocations, jakarta.servlet.http.HttpServletRequest http) {
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new ResourceNotFoundException("Paiement", paymentId));
        if (payment.getStatus() == PaymentStatus.CANCELLED || payment.getStatus() == PaymentStatus.REFUNDED) {
            throw new BusinessException("INVALID_STATUS", "On ne peut pas allouer un paiement " + payment.getStatus() + ".");
        }
        if (payment.getStatus() == PaymentStatus.ALLOCATED) {
            throw new BusinessException("ALREADY_ALLOCATED", "Ce paiement est déjà entièrement alloué.");
        }
        BigDecimal remaining = payment.getAmount().subtract(payment.getAllocatedAmount());
        for (AllocationRequest alloc : allocations) {
            if (remaining.signum() <= 0) break;
            TaxDebt debt = debtRepository.findByIdForUpdate(alloc.debtId())
                    .orElseThrow(() -> new ResourceNotFoundException("Créance", alloc.debtId()));
            if (debt.getStatus() == DebtStatus.PAID || debt.getStatus() == DebtStatus.CANCELLED) {
                throw new BusinessException("DEBT_NOT_PAYABLE", "La créance " + debt.getReference() + " est " + debt.getStatus() + ".");
            }
            BigDecimal allocAmount = alloc.amount().min(remaining);
            allocateComponent(payment, debt, PaymentAllocation.Component.PRINCIPAL, allocAmount, alloc.comment(), allocationRepository);
            remaining = remaining.subtract(allocAmount);
        }
        BigDecimal totalAllocated = allocationRepository.findByPaymentIdOrderByIdAsc(paymentId).stream()
                .map(PaymentAllocation::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        payment.setAllocatedAmount(totalAllocated);
        payment.setUnpaidAmount(payment.getAmount().subtract(totalAllocated));
        if (totalAllocated.compareTo(payment.getAmount()) >= 0) {
            payment.setStatus(PaymentStatus.ALLOCATED);
        } else {
            payment.setStatus(PaymentStatus.PARTIALLY_ALLOCATED);
        }
        payment.setUpdatedAt(Instant.now());
        paymentRepository.save(payment);
        for (PaymentAllocation pa : allocationRepository.findByPaymentIdOrderByIdAsc(paymentId)) {
            TaxDebt d = pa.getDebt();
            d.setPaidAmount(allocationRepository.findByDebtIdOrderByIdAsc(d.getId()).stream()
                    .map(PaymentAllocation::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add));
            debtService.recalculate(d);
            d.setUpdatedAt(Instant.now());
            debtRepository.save(d);
            paymentPlanService.syncFromPayments(d.getId());
        }
        if (payment.getStatus() == PaymentStatus.ALLOCATED) {
            Receipt receipt = receiptRepository.findByPaymentId(paymentId).orElse(null);
            if (receipt == null) {
                receipt = receiptService.generate(payment);
            }
        }
        return toDto(payment);
    }

    private PaymentDto toDto(Payment payment) {
        String receiptRef = receiptRepository.findByPaymentId(payment.getId())
                .map(Receipt::getReference).orElse(null);
        List<PaymentAllocation> allocs = allocationRepository.findByPaymentIdOrderByIdAsc(payment.getId());
        return PaymentDto.from(payment, receiptRef, allocs);
    }
}
