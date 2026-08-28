package com.mnktax.refund.service;

import com.mnktax.audit.service.AuditService;
import com.mnktax.common.exception.BusinessException;
import com.mnktax.common.exception.ResourceNotFoundException;
import com.mnktax.common.util.SecurityUtils;
import com.mnktax.refund.dto.RefundDtos;
import com.mnktax.refund.dto.RefundDtos.RefundDto;
import com.mnktax.refund.dto.RefundDtos.RefundStatsDto;
import com.mnktax.refund.entity.Refund;
import com.mnktax.refund.entity.RefundStatus;
import com.mnktax.refund.repository.RefundRepository;
import com.mnktax.taxpayer.entity.Taxpayer;
import com.mnktax.taxpayer.repository.TaxpayerRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.concurrent.atomic.AtomicInteger;

@Service
public class RefundService {

    private static final AtomicInteger COUNTER = new AtomicInteger(0);

    private final RefundRepository refundRepository;
    private final TaxpayerRepository taxpayerRepository;
    private final AuditService auditService;

    public RefundService(RefundRepository refundRepository,
                         TaxpayerRepository taxpayerRepository,
                         AuditService auditService) {
        this.refundRepository = refundRepository;
        this.taxpayerRepository = taxpayerRepository;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public Page<RefundDto> search(RefundStatus status, Long taxpayerId, String q, Pageable pageable) {
        return refundRepository.search(status, taxpayerId, q, pageable).map(RefundDto::from);
    }

    @Transactional(readOnly = true)
    public RefundDto get(Long id) {
        Refund r = refundRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Remboursement non trouvé : " + id));
        return RefundDto.from(r);
    }

    @Transactional
    public RefundDto create(RefundDtos.CreateRefundRequest req, HttpServletRequest http) {
        Taxpayer tp = taxpayerRepository.findById(req.taxpayerId())
                .orElseThrow(() -> new ResourceNotFoundException("Contribuable non trouvé : " + req.taxpayerId()));

        String username = SecurityUtils.currentUsername();

        Refund r = Refund.builder()
                .reference(generateReference())
                .taxpayer(tp)
                .reason(req.reason())
                .description(req.description())
                .debtId(req.debtId())
                .declarationId(req.declarationId())
                .amount(req.amount())
                .status(RefundStatus.PENDING)
                .requestedBy(username)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
        r = refundRepository.save(r);
        auditService.record("CREATE", "REFUND", r.getId().toString(), null, r, http);
        return RefundDto.from(r);
    }

    @Transactional
    public RefundDto review(Long id, RefundDtos.ReviewRefundRequest req, HttpServletRequest http) {
        Refund r = refundRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Remboursement non trouvé : " + id));

        if (r.getStatus() != RefundStatus.PENDING && r.getStatus() != RefundStatus.UNDER_REVIEW) {
            throw new BusinessException("INVALID_STATUS",
                    "Ce remboursement ne peut plus être examiné.");
        }

        Object old = RefundDto.from(r);

        String username = SecurityUtils.currentUsername();
        r.setReviewedBy(username);
        r.setReviewedAt(Instant.now());
        r.setUpdatedAt(Instant.now());

        if (Boolean.TRUE.equals(req.approve())) {
            r.setStatus(RefundStatus.APPROVED);
            r.setApprovedAmount(req.approvedAmount() != null ? req.approvedAmount() : r.getAmount());
        } else {
            r.setStatus(RefundStatus.REJECTED);
            r.setRejectionReason(req.rejectionReason());
        }

        r = refundRepository.save(r);
        auditService.record("REVIEW", "REFUND", id.toString(), old, r, http);
        return RefundDto.from(r);
    }

    @Transactional
    public RefundDto pay(Long id, RefundDtos.PayRefundRequest req, HttpServletRequest http) {
        Refund r = refundRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Remboursement non trouvé : " + id));

        if (r.getStatus() != RefundStatus.APPROVED) {
            throw new BusinessException("INVALID_STATUS",
                    "Seul un remboursement approuvé peut être payé.");
        }

        Object old = RefundDto.from(r);

        r.setStatus(RefundStatus.PAID);
        r.setPaymentMethod(req.paymentMethod());
        r.setPaymentReference(req.paymentReference());
        r.setPaidAt(Instant.now());
        r.setUpdatedAt(Instant.now());

        r = refundRepository.save(r);
        auditService.record("PAY", "REFUND", id.toString(), old, r, http);
        return RefundDto.from(r);
    }

    @Transactional(readOnly = true)
    public RefundStatsDto stats() {
        return new RefundStatsDto(
                refundRepository.count(),
                refundRepository.countByStatus(RefundStatus.PENDING),
                refundRepository.countByStatus(RefundStatus.UNDER_REVIEW),
                refundRepository.countByStatus(RefundStatus.APPROVED),
                refundRepository.countByStatus(RefundStatus.REJECTED),
                refundRepository.countByStatus(RefundStatus.PAID)
        );
    }

    private String generateReference() {
        return "REM-" + System.currentTimeMillis() + "-" + COUNTER.incrementAndGet();
    }
}
