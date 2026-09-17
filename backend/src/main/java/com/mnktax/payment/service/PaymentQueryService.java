package com.mnktax.payment.service;

import com.mnktax.common.exception.ResourceNotFoundException;
import com.mnktax.payment.dto.PaymentDtos.PaymentDto;
import com.mnktax.payment.dto.PaymentDtos.PaymentStatsDto;
import com.mnktax.payment.dto.PaymentDtos.ReconcileResult;
import com.mnktax.payment.entity.Payment;
import com.mnktax.payment.entity.PaymentAllocation;
import com.mnktax.payment.entity.PaymentStatus;
import com.mnktax.payment.repository.PaymentAllocationRepository;
import com.mnktax.payment.repository.PaymentRepository;
import com.mnktax.receipt.repository.ReceiptRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Service
public class PaymentQueryService {

    private final PaymentRepository paymentRepository;
    private final PaymentAllocationRepository allocationRepository;
    private final ReceiptRepository receiptRepository;

    public PaymentQueryService(PaymentRepository paymentRepository, PaymentAllocationRepository allocationRepository,
                               ReceiptRepository receiptRepository) {
        this.paymentRepository = paymentRepository;
        this.allocationRepository = allocationRepository;
        this.receiptRepository = receiptRepository;
    }

    @Transactional(readOnly = true)
    public PaymentDto get(Long id) {
        Payment payment = paymentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Paiement", id));
        return toDto(payment);
    }

    @Transactional(readOnly = true)
    public Page<PaymentDto> search(PaymentStatus status, Long taxpayerId, String method, LocalDate from, LocalDate to,
                                   String q, Long debtId, String taxTypeCode, Long declarationId, String center, Pageable pageable) {
        String q2 = (q == null || q.isBlank()) ? null : q.trim();
        String method2 = (method == null || method.isBlank()) ? null : method.trim();
        String center2 = (center == null || center.isBlank()) ? null : center.trim();
        return paymentRepository.search(status, taxpayerId, method2, from, to, q2, debtId, taxTypeCode, declarationId, center2, pageable)
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
                .map(PaymentAllocation::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal unpaid = payment.getAmount().subtract(allocSum);
        boolean consistent = allocSum.add(unpaid).compareTo(payment.getAmount()) == 0;
        List<String> issues = new ArrayList<>();
        if (!consistent) {
            issues.add("Incohérence : montant payé=" + payment.getAmount() + ", allocations=" + allocSum + ", non alloué=" + unpaid);
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

    private PaymentDto toDto(Payment payment) {
        String receiptRef = receiptRepository.findByPaymentId(payment.getId())
                .map(com.mnktax.receipt.entity.Receipt::getReference).orElse(null);
        List<PaymentAllocation> allocs = allocationRepository.findByPaymentIdOrderByIdAsc(payment.getId());
        return PaymentDto.from(payment, receiptRef, allocs);
    }
}
