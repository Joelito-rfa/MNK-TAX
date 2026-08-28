package com.mnktax.tax.service;

import com.mnktax.audit.service.AuditService;
import com.mnktax.common.exception.BusinessException;
import com.mnktax.common.exception.ResourceNotFoundException;
import com.mnktax.tax.dto.ObligationDtos.CreateObligationRequest;
import com.mnktax.tax.dto.ObligationDtos.ObligationDto;
import com.mnktax.tax.dto.ObligationDtos.UpdateObligationRequest;
import com.mnktax.tax.entity.Deadline;
import com.mnktax.tax.entity.DeclarationObligationStatus;
import com.mnktax.tax.entity.ObligationStatus;
import com.mnktax.tax.entity.PaymentObligationStatus;
import com.mnktax.tax.entity.Periodicity;
import com.mnktax.tax.entity.TaxCenter;
import com.mnktax.tax.entity.TaxObligation;
import com.mnktax.tax.entity.TaxRegime;
import com.mnktax.tax.entity.TaxType;
import com.mnktax.tax.repository.DeadlineRepository;
import com.mnktax.tax.repository.TaxCenterRepository;
import com.mnktax.tax.repository.TaxObligationRepository;
import com.mnktax.tax.repository.TaxRegimeRepository;
import com.mnktax.tax.repository.TaxTypeRepository;
import com.mnktax.taxpayer.entity.Taxpayer;
import com.mnktax.taxpayer.entity.TaxpayerStatus;
import com.mnktax.taxpayer.repository.TaxpayerRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

@Service
public class TaxObligationService {

    private final TaxObligationRepository obligationRepository;
    private final TaxpayerRepository taxpayerRepository;
    private final TaxTypeRepository taxTypeRepository;
    private final TaxRegimeRepository regimeRepository;
    private final TaxCenterRepository centerRepository;
    private final DeadlineRepository deadlineRepository;
    private final AuditService auditService;

    public TaxObligationService(TaxObligationRepository obligationRepository,
                                TaxpayerRepository taxpayerRepository,
                                TaxTypeRepository taxTypeRepository,
                                TaxRegimeRepository regimeRepository,
                                TaxCenterRepository centerRepository,
                                DeadlineRepository deadlineRepository,
                                AuditService auditService) {
        this.obligationRepository = obligationRepository;
        this.taxpayerRepository = taxpayerRepository;
        this.taxTypeRepository = taxTypeRepository;
        this.regimeRepository = regimeRepository;
        this.centerRepository = centerRepository;
        this.deadlineRepository = deadlineRepository;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public List<ObligationDto> listByTaxpayer(Long taxpayerId) {
        return obligationRepository.findByTaxpayerIdOrderByIdAsc(taxpayerId).stream()
                .map(ObligationDto::from)
                .toList();
    }

    @Transactional
    public ObligationDto create(CreateObligationRequest request, HttpServletRequest http) {
        Taxpayer taxpayer = taxpayerRepository.findById(request.taxpayerId())
                .orElseThrow(() -> new ResourceNotFoundException("Contribuable", request.taxpayerId()));
        requireOpen(taxpayer);
        TaxType taxType = taxTypeRepository.findByCode(request.taxTypeCode())
                .orElseThrow(() -> new ResourceNotFoundException("Type d'impôt", request.taxTypeCode()));

        TaxRegime regime = null;
        if (request.taxRegimeId() != null) {
            regime = regimeRepository.findById(request.taxRegimeId()).orElse(null);
        }
        TaxCenter center = null;
        if (request.taxCenterId() != null) {
            center = centerRepository.findById(request.taxCenterId()).orElse(null);
        }

        TaxObligation obligation = TaxObligation.builder()
                .taxpayer(taxpayer)
                .taxType(taxType)
                .taxRegime(regime)
                .taxCenter(center)
                .periodicity(request.periodicity())
                .startDate(request.startDate())
                .endDate(request.endDate())
                .period(request.period() != null ? request.period() : computeCurrentPeriod(request.periodicity()))
                .declarationDeadline(request.declarationDeadline() != null ? request.declarationDeadline()
                        : computeDeclarationDeadline(request.periodicity()))
                .paymentDeadline(request.paymentDeadline() != null ? request.paymentDeadline()
                        : computePaymentDeadline(request.periodicity()))
                .expectedAmount(request.expectedAmount())
                .declarationStatus(DeclarationObligationStatus.NOT_SUBMITTED)
                .paymentStatus(PaymentObligationStatus.UNPAID)
                .status(ObligationStatus.ACTIVE)
                .createdAt(Instant.now())
                .build();
        return ObligationDto.from(obligationRepository.save(obligation));
    }

    @Transactional
    public ObligationDto update(Long id, UpdateObligationRequest request, HttpServletRequest http) {
        TaxObligation obligation = obligationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Obligation", id));

        Object old = ObligationDto.from(obligation);

        obligation.setPeriodicity(request.periodicity());
        obligation.setEndDate(request.endDate());
        obligation.setStatus(request.status());

        if (request.taxRegimeId() != null) {
            obligation.setTaxRegime(regimeRepository.findById(request.taxRegimeId()).orElse(null));
        }
        if (request.taxCenterId() != null) {
            obligation.setTaxCenter(centerRepository.findById(request.taxCenterId()).orElse(null));
        }
        if (request.period() != null) obligation.setPeriod(request.period());
        if (request.declarationDeadline() != null) obligation.setDeclarationDeadline(request.declarationDeadline());
        if (request.paymentDeadline() != null) obligation.setPaymentDeadline(request.paymentDeadline());
        if (request.expectedAmount() != null) obligation.setExpectedAmount(request.expectedAmount());
        if (request.declarationStatus() != null) obligation.setDeclarationStatus(request.declarationStatus());
        if (request.paymentStatus() != null) obligation.setPaymentStatus(request.paymentStatus());
        obligation.setUpdatedAt(Instant.now());

        return ObligationDto.from(obligationRepository.save(obligation));
    }

    @Transactional
    public void delete(Long id) {
        obligationRepository.deleteById(id);
    }

    /**
     * Auto-génère les obligations fiscales d'un contribuable à partir de son régime.
     * Appelé lors de l'assignation ou du changement de régime.
     */
    @Transactional
    public List<ObligationDto> generateFromRegime(Long taxpayerId, Long regimeId, HttpServletRequest http) {
        Taxpayer taxpayer = taxpayerRepository.findById(taxpayerId)
                .orElseThrow(() -> new ResourceNotFoundException("Contribuable", taxpayerId));
        TaxRegime regime = regimeRepository.findById(regimeId)
                .orElseThrow(() -> new ResourceNotFoundException("Régime fiscal", regimeId));

        List<ObligationDto> generated = new java.util.ArrayList<>();

        if (regime.getApplicableTaxTypes() != null && !regime.getApplicableTaxTypes().isBlank()) {
            String[] taxTypeCodes = regime.getApplicableTaxTypes().split(",");
            Periodicity defaultPeriodicity = regime.getObligationPeriodicity() != null
                    ? Periodicity.valueOf(regime.getObligationPeriodicity())
                    : Periodicity.MONTHLY;

            for (String code : taxTypeCodes) {
                String trimmed = code.trim();
                if (trimmed.isEmpty()) continue;

                boolean exists = obligationRepository.existsByTaxpayerIdAndTaxTypeCode(
                        taxpayerId, trimmed);
                if (exists) continue;

                TaxType taxType = taxTypeRepository.findByCode(trimmed).orElse(null);
                if (taxType == null) continue;

                TaxObligation obligation = TaxObligation.builder()
                        .taxpayer(taxpayer)
                        .taxType(taxType)
                        .taxRegime(regime)
                        .taxCenter(taxpayer.getTaxCenter())
                        .periodicity(defaultPeriodicity)
                        .startDate(java.time.LocalDate.now())
                        .period(computeCurrentPeriod(defaultPeriodicity))
                        .declarationDeadline(computeDeclarationDeadline(defaultPeriodicity))
                        .paymentDeadline(computePaymentDeadline(defaultPeriodicity))
                        .status(ObligationStatus.ACTIVE)
                        .declarationStatus(DeclarationObligationStatus.NOT_SUBMITTED)
                        .paymentStatus(PaymentObligationStatus.UNPAID)
                        .createdAt(Instant.now())
                        .build();
                generated.add(ObligationDto.from(obligationRepository.save(obligation)));
            }
        }

        auditService.record("GENERATE_FROM_REGIME", "OBLIGATION", taxpayerId.toString(),
                null, generated.size() + " obligations créées", http);
        return generated;
    }

    private void requireOpen(Taxpayer taxpayer) {
        if (taxpayer.getStatus() == TaxpayerStatus.CLOSED) {
            throw new BusinessException("TAXPAYER_CLOSED",
                    "Le contribuable est clôturé : impossible de créer une nouvelle obligation.");
        }
    }

    public List<Periodicity> periodicities() {
        return List.of(Periodicity.values());
    }

    /**
     * Synchronise le statut de déclaration de l'obligation correspondante
     * lorsque une déclaration est soumise, validée ou rejetée.
     */
    @Transactional
    public void syncDeclarationStatus(Long taxpayerId, String taxTypeCode, String period,
                                      DeclarationObligationStatus newStatus) {
        Optional<TaxObligation> opt = obligationRepository.findByTaxpayerIdAndTaxTypeCodeAndPeriod(
                taxpayerId, taxTypeCode, period);
        if (opt.isEmpty()) return;
        TaxObligation obligation = opt.get();
        if (obligation.getStatus() != ObligationStatus.ACTIVE) return;
        obligation.setDeclarationStatus(newStatus);
        obligation.setUpdatedAt(Instant.now());
        obligationRepository.save(obligation);
    }

    /**
     * Synchronise le statut de paiement de l'obligation correspondante
     * lorsque un paiement est enregistré.
     */
    @Transactional
    public void syncPaymentStatus(Long taxpayerId, String taxTypeCode, String period,
                                  PaymentObligationStatus newStatus) {
        Optional<TaxObligation> opt = obligationRepository.findByTaxpayerIdAndTaxTypeCodeAndPeriod(
                taxpayerId, taxTypeCode, period);
        if (opt.isEmpty()) return;
        TaxObligation obligation = opt.get();
        if (obligation.getStatus() != ObligationStatus.ACTIVE) return;
        obligation.setPaymentStatus(newStatus);
        obligation.setUpdatedAt(Instant.now());
        obligationRepository.save(obligation);
    }

    /**
     * Met automatiquement les obligations avec paiement en retard en OVERDUE.
     * Appelé par le scheduler.
     */
    @Transactional
    public int markOverdueObligations(LocalDate today) {
        List<TaxObligation> overdue = obligationRepository.findOverduePaymentObligations(today);
        int count = 0;
        for (TaxObligation o : overdue) {
            o.setPaymentStatus(PaymentObligationStatus.OVERDUE);
            o.setUpdatedAt(Instant.now());
            obligationRepository.save(o);
            count++;
        }
        return count;
    }

    /**
     * Termine automatiquement les obligations dont la date de fin est dépassée.
     * Appelé par le scheduler.
     */
    @Transactional
    public int terminateExpired(LocalDate today) {
        List<TaxObligation> expired = obligationRepository.findExpiredObligations(today);
        int count = 0;
        for (TaxObligation o : expired) {
            o.setStatus(ObligationStatus.TERMINATED);
            o.setUpdatedAt(Instant.now());
            obligationRepository.save(o);
            count++;
        }
        return count;
    }

    /**
     * Retourne les obligations actives avec déclaration non soumise dont l'échéance est dépassée.
     * Utile pour le scheduler de notifications ciblées.
     */
    @Transactional(readOnly = true)
    public List<TaxObligation> findMissedDeclarations(LocalDate today) {
        return obligationRepository.findMissedDeclarationObligations(today);
    }

    /**
     * Retourne les obligations actives avec paiement en retard.
     * Utile pour le scheduler de notifications ciblées.
     */
    @Transactional(readOnly = true)
    public List<TaxObligation> findOverduePayments(LocalDate today) {
        return obligationRepository.findOverduePaymentObligations(today);
    }

    /**
     * Compte le nombre total d'obligations actives.
     */
    @Transactional(readOnly = true)
    public long countActive() {
        return obligationRepository.countByStatus(ObligationStatus.ACTIVE);
    }

    private String computeCurrentPeriod(Periodicity periodicity) {
        LocalDate now = LocalDate.now();
        return switch (periodicity) {
            case MONTHLY -> String.format("%d-%02d", now.getYear(), now.getMonthValue());
            case QUARTERLY -> String.format("%d-T%d", now.getYear(), (now.getMonthValue() - 1) / 3 + 1);
            case SEMI_ANNUAL -> String.format("%d-S%d", now.getYear(), now.getMonthValue() <= 6 ? 1 : 2);
            case ANNUAL -> String.valueOf(now.getYear());
            case EVENT_BASED -> String.format("%d-%02d", now.getYear(), now.getMonthValue());
        };
    }

    private LocalDate computeDeclarationDeadline(Periodicity periodicity) {
        LocalDate now = LocalDate.now();
        return switch (periodicity) {
            case MONTHLY -> now.plusMonths(1).withDayOfMonth(15);
            case QUARTERLY -> {
                int quarter = (now.getMonthValue() - 1) / 3;
                int endMonth = quarter * 3 + 3;
                yield LocalDate.of(now.getYear(), endMonth, 30).plusDays(15);
            }
            case SEMI_ANNUAL -> now.getMonthValue() <= 6
                    ? LocalDate.of(now.getYear(), 7, 1).plusDays(30)
                    : LocalDate.of(now.getYear() + 1, 1, 1).plusDays(30);
            case ANNUAL -> LocalDate.of(now.getYear() + 1, 3, 31);
            case EVENT_BASED -> now.plusDays(30);
        };
    }

    private LocalDate computePaymentDeadline(Periodicity periodicity) {
        return computeDeclarationDeadline(periodicity).plusDays(15);
    }
}
