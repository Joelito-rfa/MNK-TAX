package com.mnktax.collection.service;

import com.mnktax.audit.service.AuditService;
import com.mnktax.collection.dto.CollectionDtos.CollectionActionDto;
import com.mnktax.collection.dto.CollectionDtos.CollectionDebtRowDto;
import com.mnktax.collection.dto.CollectionDtos.CollectionHistoryDto;
import com.mnktax.collection.dto.CollectionDtos.CollectionNoticeDto;
import com.mnktax.collection.dto.CollectionDtos.CollectionStatsDto;
import com.mnktax.collection.dto.CollectionDtos.CreateActionRequest;
import com.mnktax.collection.dto.CollectionDtos.CreateNoticeRequest;
import com.mnktax.collection.entity.CollectionAction;
import com.mnktax.collection.entity.CollectionActionType;
import com.mnktax.collection.entity.CollectionNotice;
import com.mnktax.collection.repository.CollectionActionRepository;
import com.mnktax.collection.repository.CollectionNoticeRepository;
import com.mnktax.common.exception.ResourceNotFoundException;
import com.mnktax.common.util.ReferenceGenerator;
import com.mnktax.common.util.SecurityUtils;
import com.mnktax.debt.entity.DebtStatus;
import com.mnktax.debt.entity.TaxDebt;
import com.mnktax.debt.repository.TaxDebtRepository;
import com.mnktax.payment.dto.PaymentDtos.CreatePaymentRequest;
import com.mnktax.payment.entity.PaymentMethod;
import com.mnktax.payment.service.PaymentService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

@Service
public class CollectionService {

    private final CollectionActionRepository actionRepository;
    private final CollectionNoticeRepository noticeRepository;
    private final TaxDebtRepository debtRepository;
    private final PaymentService paymentService;
    private final AuditService auditService;

    public CollectionService(CollectionActionRepository actionRepository,
                             CollectionNoticeRepository noticeRepository,
                             TaxDebtRepository debtRepository,
                             PaymentService paymentService,
                             AuditService auditService) {
        this.actionRepository = actionRepository;
        this.noticeRepository = noticeRepository;
        this.debtRepository = debtRepository;
        this.paymentService = paymentService;
        this.auditService = auditService;
    }

    // ── Actions ──────────────────────────────────────────────

    @Transactional
    public CollectionActionDto createAction(CreateActionRequest request, HttpServletRequest http) {
        TaxDebt debt = debtRepository.findById(request.debtId())
                .orElseThrow(() -> new ResourceNotFoundException("Créance", request.debtId()));
        CollectionAction action = CollectionAction.builder()
                .debt(debt)
                .type(request.type())
                .description(request.description())
                .actionDate(request.actionDate())
                .outcome(request.outcome())
                .responsibleUserId(SecurityUtils.currentUserId())
                .status("COMPLETED")
                .nextAction(request.nextAction())
                .nextActionDate(request.nextActionDate())
                .createdAt(Instant.now())
                .build();
        CollectionAction saved = actionRepository.save(action);
        auditService.record("COLLECTION_ACTION", "DEBT", String.valueOf(debt.getId()),
                null, saved.getType() + " : " + saved.getDescription(), http);
        return CollectionActionDto.from(saved);
    }

    // ── Notices ──────────────────────────────────────────────

    @Transactional
    public CollectionNoticeDto createNotice(CreateNoticeRequest request, HttpServletRequest http) {
        TaxDebt debt = debtRepository.findById(request.debtId())
                .orElseThrow(() -> new ResourceNotFoundException("Créance", request.debtId()));
        CollectionNotice notice = CollectionNotice.builder()
                .debt(debt)
                .noticeNumber(ReferenceGenerator.documentRef("MAD"))
                .noticeDate(LocalDate.now())
                .noticeType(request.noticeType())
                .content(request.content())
                .status("SENT")
                .createdAt(Instant.now())
                .build();
        CollectionNotice saved = noticeRepository.save(notice);

        CollectionAction noticeAction = CollectionAction.builder()
                .debt(debt)
                .type(CollectionActionType.NOTICE)
                .description("Mise en demeure " + saved.getNoticeNumber() + (saved.getContent() != null ? " — " + saved.getContent() : ""))
                .actionDate(LocalDate.now())
                .outcome("Mise en demeure émise")
                .responsibleUserId(SecurityUtils.currentUserId())
                .status("COMPLETED")
                .createdAt(Instant.now())
                .build();
        actionRepository.save(noticeAction);

        auditService.record("COLLECTION_NOTICE", "DEBT", String.valueOf(debt.getId()),
                null, saved.getNoticeNumber(), http);
        return CollectionNoticeDto.from(saved);
    }

    // ── Search actions ───────────────────────────────────────

    @Transactional(readOnly = true)
    public Page<CollectionActionDto> search(Long debtId, Long taxpayerId, CollectionActionType type,
                                            Pageable pageable) {
        return actionRepository.search(debtId, taxpayerId, type, pageable).map(CollectionActionDto::from);
    }

    // ── History ──────────────────────────────────────────────

    @Transactional(readOnly = true)
    public CollectionHistoryDto history(Long debtId) {
        List<CollectionActionDto> actions = actionRepository.findByDebtIdOrderByActionDateDesc(debtId)
                .stream().map(CollectionActionDto::from).toList();
        List<CollectionNoticeDto> notices = noticeRepository.findByDebtIdOrderByNoticeDateDesc(debtId)
                .stream().map(CollectionNoticeDto::from).toList();
        return new CollectionHistoryDto(actions, notices);
    }

    // ── Collection debts table ───────────────────────────────

    @Transactional(readOnly = true)
    public Page<CollectionDebtRowDto> getCollectionDebts(String status, String taxTypeCode, String period,
                                                          String q, Pageable pageable) {
        DebtStatus debtStatus = mapToDebtStatus(status);
        return debtRepository.search(debtStatus, taxTypeCode, period, null, false,
                        LocalDate.now(), blankToNull(q), pageable)
                .map(debt -> {
                    CollectionAction lastAction = actionRepository.findLatestByDebtId(debt.getId()).orElse(null);
                    String nextAct = null;
                    LocalDate nextActDate = null;
                    if (lastAction != null) {
                        nextAct = lastAction.getNextAction();
                        nextActDate = lastAction.getNextActionDate();
                    }
                    String lastDesc = null;
                    LocalDate lastDate = null;
                    if (lastAction != null) {
                        lastDesc = (lastAction.getType() != null ? lastAction.getType().name() : "") + " — " + lastAction.getDescription();
                        lastDate = lastAction.getActionDate();
                    }
                    return CollectionDebtRowDto.from(debt, lastDesc, lastDate, nextAct, nextActDate);
                });
    }

    // ── Statistics ───────────────────────────────────────────

    @Transactional(readOnly = true)
    public CollectionStatsDto stats(String status, String taxTypeCode, String period, String q) {
        BigDecimal totalCollected = debtRepository.totalCollected();
        BigDecimal totalOutstanding = debtRepository.totalOutstanding();

        double collectionRate = 0.0;
        BigDecimal totalExigible = totalCollected.add(totalOutstanding);
        if (totalExigible.signum() > 0) {
            collectionRate = totalCollected.multiply(BigDecimal.valueOf(100))
                    .divide(totalExigible, 2, RoundingMode.HALF_UP)
                    .doubleValue();
        }

        long actionCount = actionRepository.countAll();

        return new CollectionStatsDto(collectionRate, totalCollected, totalOutstanding, actionCount);
    }

    // ── Register payment from collection module ──────────────

    @Transactional
    public com.mnktax.payment.dto.PaymentDtos.PaymentDto registerPayment(
            com.mnktax.collection.dto.CollectionDtos.RegisterPaymentRequest request,
            HttpServletRequest http) {

        PaymentMethod method;
        try {
            method = PaymentMethod.valueOf(request.method());
        } catch (IllegalArgumentException e) {
            throw new com.mnktax.common.exception.BusinessException(
                    "INVALID_PAYMENT_METHOD", "Mode de paiement invalide : " + request.method());
        }

        CreatePaymentRequest paymentRequest = new CreatePaymentRequest(
                request.debtId(),
                request.amount(),
                request.paymentDate(),
                method,
                null
        );

        com.mnktax.payment.dto.PaymentDtos.PaymentDto paymentDto = paymentService.record(paymentRequest, http);

        actionRepository.save(CollectionAction.builder()
                .debt(debtRepository.findById(request.debtId())
                        .orElseThrow(() -> new ResourceNotFoundException("Créance", request.debtId())))
                .type(CollectionActionType.PAYMENT_RECORD)
                .description("Paiement enregistré : " + paymentDto.reference() + " — " + request.amount() + " MGA")
                .actionDate(request.paymentDate())
                .outcome("Paiement de " + request.amount() + " MGA enregistré")
                .responsibleUserId(SecurityUtils.currentUserId())
                .status("COMPLETED")
                .createdAt(Instant.now())
                .build());

        return paymentDto;
    }

    // ── Helpers ──────────────────────────────────────────────

    private DebtStatus mapToDebtStatus(String status) {
        if (status == null || status.isBlank()) return null;
        return switch (status.toUpperCase()) {
            case "OVERDUE" -> DebtStatus.OVERDUE;
            case "IN_COLLECTION" -> DebtStatus.IN_COLLECTION;
            case "PAID" -> DebtStatus.PAID;
            case "ISSUED" -> DebtStatus.ISSUED;
            case "PARTIALLY_PAID" -> DebtStatus.PARTIALLY_PAID;
            case "DUE" -> DebtStatus.DUE;
            case "DISPUTED" -> DebtStatus.DISPUTED;
            case "CANCELLED" -> DebtStatus.CANCELLED;
            default -> null;
        };
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }
}
