package com.mnktax.debt.service;

import com.mnktax.assessment.entity.Assessment;
import com.mnktax.administration.service.SystemParameterService;
import com.mnktax.common.exception.BusinessException;
import com.mnktax.common.exception.ResourceNotFoundException;
import com.mnktax.common.util.ReferenceGenerator;
import com.mnktax.common.util.SecurityUtils;
import com.mnktax.debt.dto.DebtDtos.DebtHistoryDto;
import com.mnktax.debt.dto.DebtDtos.DebtStatsDto;
import com.mnktax.debt.dto.DebtDtos.MarkOverdueResult;
import com.mnktax.debt.dto.DebtDtos.TaxDebtDto;
import com.mnktax.debt.entity.DebtCollectionPriority;
import com.mnktax.debt.entity.DebtHistory;
import com.mnktax.debt.entity.DebtItem;
import com.mnktax.debt.entity.DebtOrigin;
import com.mnktax.debt.entity.DebtStatus;
import com.mnktax.debt.entity.Interest;
import com.mnktax.debt.entity.Penalty;
import com.mnktax.debt.entity.TaxDebt;
import com.mnktax.debt.repository.DebtHistoryRepository;
import com.mnktax.debt.repository.DebtItemRepository;
import com.mnktax.debt.repository.InterestRepository;
import com.mnktax.debt.repository.PenaltyRepository;
import com.mnktax.debt.repository.TaxDebtRepository;
import com.mnktax.declaration.entity.Declaration;
import com.mnktax.declaration.entity.DeclarationStatus;
import com.mnktax.declaration.repository.DeclarationRepository;
import com.mnktax.notification.service.NotificationService;
import com.mnktax.tax.entity.Deadline;
import com.mnktax.tax.entity.TaxType;
import com.mnktax.tax.repository.DeadlineRepository;
import com.mnktax.tax.repository.TaxTypeRepository;
import com.mnktax.taxpayer.entity.Taxpayer;
import com.mnktax.taxpayer.repository.TaxpayerRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * Gestion des créances fiscales.
 *
 * Le solde est TOUJOURS recalculé à partir des opérations enregistrées
 * (paiements, pénalités, intérêts, ajustements, crédits) et jamais saisi à la main.
 */
@Service
public class DebtService {

    private static final String PARAM_PENALTY_CODE = "DEBT.DEFAULT_PENALTY_CODE";
    private static final String PARAM_INTEREST_CODE = "DEBT.DEFAULT_INTEREST_CODE";
    private static final String FALLBACK_PENALTY_CODE = "PEN_DEMO_5";
    private static final String FALLBACK_INTEREST_CODE = "INT_DEMO_1";

    private final TaxDebtRepository debtRepository;
    private final DebtItemRepository itemRepository;
    private final PenaltyRepository penaltyRepository;
    private final InterestRepository interestRepository;
    private final DebtHistoryRepository historyRepository;
    private final DeadlineRepository deadlineRepository;
    private final NotificationService notificationService;
    private final SystemParameterService parameterService;
    private final DeclarationRepository declarationRepository;
    private final TaxpayerRepository taxpayerRepository;
    private final TaxTypeRepository taxTypeRepository;

    public DebtService(TaxDebtRepository debtRepository, DebtItemRepository itemRepository,
                       PenaltyRepository penaltyRepository, InterestRepository interestRepository,
                       DebtHistoryRepository historyRepository, DeadlineRepository deadlineRepository,
                       NotificationService notificationService, SystemParameterService parameterService,
                       DeclarationRepository declarationRepository,
                       TaxpayerRepository taxpayerRepository, TaxTypeRepository taxTypeRepository) {
        this.debtRepository = debtRepository;
        this.itemRepository = itemRepository;
        this.penaltyRepository = penaltyRepository;
        this.interestRepository = interestRepository;
        this.historyRepository = historyRepository;
        this.deadlineRepository = deadlineRepository;
        this.notificationService = notificationService;
        this.parameterService = parameterService;
        this.declarationRepository = declarationRepository;
        this.taxpayerRepository = taxpayerRepository;
        this.taxTypeRepository = taxTypeRepository;
    }

    @Transactional
    public TaxDebt createFromAssessment(Assessment assessment) {
        LocalDate today = LocalDate.now();
        LocalDate dueDate = resolveDueDate(assessment, today);

        BigDecimal principal = assessment.getNetTax();
        BigDecimal penalty = BigDecimal.ZERO;
        BigDecimal interest = BigDecimal.ZERO;
        BigDecimal adjustments = BigDecimal.ZERO;
        BigDecimal credits = BigDecimal.ZERO;
        BigDecimal total = principal;
        BigDecimal balance = total;

        TaxDebt debt = TaxDebt.builder()
                .reference(ReferenceGenerator.next("DEB"))
                .taxpayer(assessment.getTaxpayer())
                .assessment(assessment)
                .taxType(assessment.getTaxType())
                .period(assessment.getPeriod())
                .principalAmount(principal)
                .penaltyAmount(penalty)
                .interestAmount(interest)
                .adjustmentsAmount(adjustments)
                .creditsAmount(credits)
                .totalAmount(total)
                .paidAmount(BigDecimal.ZERO)
                .balance(balance)
                .issueDate(today)
                .dueDate(dueDate)
                .lastDueDate(dueDate)
                .status(DebtStatus.ISSUED)
                .origin(DebtOrigin.ASSESSMENT)
                .collectionPriority(DebtCollectionPriority.NORMAL)
                .createdBy(SecurityUtils.currentUsername())
                .taxpayerCenter(assessment.getTaxpayer().getTaxCenter() != null
                        ? assessment.getTaxpayer().getTaxCenter().getCode() : null)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
        TaxDebt saved = debtRepository.save(debt);
        addItem(saved, DebtItem.Kind.PRINCIPAL, "Principal de la créance " + assessment.getReference(), principal);
        addHistory(saved, "CREATED", "Créance créée depuis l'imposition " + assessment.getReference(),
                null, "Montant : " + principal);
        notificationService.notifyDebtIssued(assessment.getTaxpayer().getUserId(), saved.getReference(),
                assessment.getTaxpayer().getNif(), principal);
        return saved;
    }

    @Transactional
    public TaxDebt createManual(Long taxpayerId, String taxTypeCode, String period,
                                BigDecimal principal, String observations,
                                DebtCollectionPriority priority) {
        if (taxpayerId == null) {
            throw new BusinessException("TAXPAYER_REQUIRED", "L'identifiant du contribuable est obligatoire pour créer une créance manuelle.");
        }
        LocalDate today = LocalDate.now();
        Taxpayer taxpayer = taxpayerRepository.findById(taxpayerId)
                .orElseThrow(() -> new ResourceNotFoundException("Taxpayer", taxpayerId));
        TaxType taxType = null;
        if (taxTypeCode != null) {
            taxType = taxTypeRepository.findByCode(taxTypeCode).orElse(null);
        }
        TaxDebt debt = TaxDebt.builder()
                .reference(ReferenceGenerator.next("DEB"))
                .taxpayer(taxpayer)
                .assessment(null)
                .taxType(taxType)
                .taxpayerCenter(taxpayer.getTaxCenter() != null ? taxpayer.getTaxCenter().getCode() : null)
                .period(period)
                .principalAmount(principal)
                .penaltyAmount(BigDecimal.ZERO)
                .interestAmount(BigDecimal.ZERO)
                .adjustmentsAmount(BigDecimal.ZERO)
                .creditsAmount(BigDecimal.ZERO)
                .totalAmount(principal)
                .paidAmount(BigDecimal.ZERO)
                .balance(principal)
                .issueDate(today)
                .dueDate(today.plusDays(30))
                .lastDueDate(today.plusDays(30))
                .status(DebtStatus.ISSUED)
                .origin(DebtOrigin.OTHER)
                .collectionPriority(priority != null ? priority : DebtCollectionPriority.NORMAL)
                .observations(observations)
                .createdBy(SecurityUtils.currentUsername())
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
        return debtRepository.save(debt);
    }

    @Transactional(readOnly = true)
    public TaxDebtDto get(Long id) {
        TaxDebt debt = find(id);
        return TaxDebtDto.from(debt, itemRepository.findByDebtIdOrderByIdAsc(id));
    }

    @Transactional(readOnly = true)
    public List<DebtHistoryDto> getHistory(Long debtId) {
        find(debtId);
        return historyRepository.findByDebtIdOrderByEventDateDesc(debtId).stream()
                .map(DebtHistoryDto::from).toList();
    }

    @Transactional(readOnly = true)
    public Page<TaxDebtDto> search(DebtStatus status, String taxTypeCode, String period, Long taxpayerId,
                                   DebtOrigin origin, DebtCollectionPriority priority, String center,
                                   boolean overdue, String q, Pageable pageable) {
        return debtRepository.search(status, taxTypeCode, period, taxpayerId, origin, priority, center,
                        overdue, LocalDate.now(), blankToNull(q), pageable)
                .map(d -> TaxDebtDto.from(d, itemRepository.findByDebtIdOrderByIdAsc(d.getId())));
    }

    @Transactional(readOnly = true)
    public DebtStatsDto stats() {
        long total = debtRepository.count();
        long paid = debtRepository.countByStatus(DebtStatus.PAID);
        long cancelled = debtRepository.countByStatus(DebtStatus.CANCELLED);
        long overdue = debtRepository.countByStatus(DebtStatus.OVERDUE);
        long inCollection = debtRepository.countByStatus(DebtStatus.IN_COLLECTION);
        long disputed = debtRepository.countByStatus(DebtStatus.DISPUTED);
        long suspended = debtRepository.countByStatus(DebtStatus.SUSPENDED);
        long active = total - paid - cancelled;

        BigDecimal totalAmount = debtRepository.totalDebtAmount();
        BigDecimal totalOutstanding = debtRepository.totalOutstanding();
        BigDecimal totalPaid = debtRepository.totalPaid();
        BigDecimal overdueBalance = debtRepository.totalOverdueBalance(LocalDate.now());

        double collectionRate = totalAmount.signum() > 0
                ? totalPaid.multiply(BigDecimal.valueOf(100)).divide(totalAmount, 1, RoundingMode.HALF_UP).doubleValue()
                : 0.0;

        List<DebtStatsDto.OriginCount> byOrigin = debtRepository.countByOriginGroup().stream()
                .map(row -> new DebtStatsDto.OriginCount(((DebtOrigin) row[0]).name(), (Long) row[1]))
                .toList();
        List<DebtStatsDto.PriorityCount> byPriority = debtRepository.countByPriorityGroup().stream()
                .map(row -> new DebtStatsDto.PriorityCount(((DebtCollectionPriority) row[0]).name(), (Long) row[1]))
                .toList();
        List<DebtStatsDto.TaxTypeCount> byTaxType = debtRepository.countByTaxTypeGroup().stream()
                .map(row -> new DebtStatsDto.TaxTypeCount((String) row[0], (Long) row[1]))
                .toList();

        return new DebtStatsDto(total, active, overdue, paid, inCollection, disputed, suspended,
                totalAmount, totalOutstanding, totalPaid, overdueBalance, collectionRate,
                byOrigin, byPriority, byTaxType);
    }

    public List<TaxDebt> listByTaxpayer(Long taxpayerId) {
        return debtRepository.findByTaxpayerIdOrderByIdDesc(taxpayerId);
    }

    @Transactional
    public MarkOverdueResult markOverdue(LocalDate today) {
        List<TaxDebt> toMark = debtRepository.findToMarkOverdue(today);
        List<String> details = new ArrayList<>();
        for (TaxDebt debt : toMark) {
            applyLateCharges(debt);
            DebtStatus oldStatus = debt.getStatus();
            debt.setStatus(DebtStatus.OVERDUE);
            debt.setUpdatedAt(Instant.now());
            debtRepository.save(debt);
            addHistory(debt, "STATUS_CHANGE", "Statut changé vers EN_RETARD",
                    oldStatus.name(), DebtStatus.OVERDUE.name());
            details.add(debt.getReference() + " (" + debt.getTaxpayer().getName()
                    + ") — solde " + debt.getBalance());
        }
        return new MarkOverdueResult(toMark.size(), details);
    }

    @Transactional
    public void applyLateCharges(TaxDebt debt) {
        String penaltyCode = parameterService.findByKey(PARAM_PENALTY_CODE)
                .map(p -> p.getValue()).orElse(FALLBACK_PENALTY_CODE);
        String interestCode = parameterService.findByKey(PARAM_INTEREST_CODE)
                .map(p -> p.getValue()).orElse(FALLBACK_INTEREST_CODE);

        boolean hasPenaltyItem = itemRepository.findByDebtIdOrderByIdAsc(debt.getId()).stream()
                .anyMatch(i -> i.getKind() == DebtItem.Kind.PENALTY);
        if (!hasPenaltyItem) {
            BigDecimal rate = penaltyRepository.findByCode(penaltyCode)
                    .map(Penalty::getRate)
                    .orElse(BigDecimal.valueOf(5));
            BigDecimal penalty = debt.getBalance().multiply(rate).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
            if (penalty.signum() > 0) {
                debt.setPenaltyAmount(debt.getPenaltyAmount().add(penalty));
                addItem(debt, DebtItem.Kind.PENALTY, "Pénalité de retard (" + rate.stripTrailingZeros() + "%)", penalty);
                addHistory(debt, "PENALTY_APPLIED", "Pénalité de retard appliquée",
                        null, penalty + " MGA (" + rate.stripTrailingZeros() + "%)");
            }
        }
        boolean hasInterestItem = itemRepository.findByDebtIdOrderByIdAsc(debt.getId()).stream()
                .anyMatch(i -> i.getKind() == DebtItem.Kind.INTEREST);
        if (!hasInterestItem) {
            BigDecimal rate = interestRepository.findByCode(interestCode)
                    .map(Interest::getRate)
                    .orElse(BigDecimal.valueOf(1));
            long months = Math.max(1, ChronoUnit.MONTHS.between(debt.getDueDate(), LocalDate.now()));
            BigDecimal interest = debt.getBalance().multiply(rate).multiply(BigDecimal.valueOf(months))
                    .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
            if (interest.signum() > 0) {
                debt.setInterestAmount(debt.getInterestAmount().add(interest));
                addItem(debt, DebtItem.Kind.INTEREST, "Intérêts de retard (" + rate.stripTrailingZeros() + "%/mois)", interest);
                addHistory(debt, "INTEREST_APPLIED", "Intérêts de retard appliqués",
                        null, interest + " MGA (" + rate.stripTrailingZeros() + "% x " + months + " mois)");
            }
        }
        recalculate(debt);
        debtRepository.save(debt);
    }

    public void recalculate(TaxDebt debt) {
        BigDecimal total = debt.getPrincipalAmount()
                .add(debt.getPenaltyAmount())
                .add(debt.getInterestAmount())
                .subtract(debt.getAdjustmentsAmount())
                .subtract(debt.getCreditsAmount());
        if (total.signum() < 0) {
            total = BigDecimal.ZERO;
        }
        debt.setTotalAmount(total);
        BigDecimal balance = total.subtract(debt.getPaidAmount());
        if (balance.signum() < 0) {
            balance = BigDecimal.ZERO;
        }
        debt.setBalance(balance);

        DebtStatus current = debt.getStatus();
        if (current == DebtStatus.CANCELLED || current == DebtStatus.SUSPENDED || current == DebtStatus.CLOSED) {
            return;
        }
        if (balance.signum() == 0) {
            debt.setStatus(DebtStatus.PAID);
            debt.setClosedAt(Instant.now());
            markDeclarationPaidIfFullyPaid(debt);
        } else if (current == DebtStatus.PAID) {
            throw new BusinessException("DEBT_ALREADY_PAID",
                    "Une dette PAYÉE ne peut pas recevoir de nouveau mouvement sans procédure spécifique.");
        } else if (debt.getPaidAmount().signum() > 0) {
            if (current != DebtStatus.IN_COLLECTION) {
                debt.setStatus(DebtStatus.PARTIALLY_PAID);
            }
        } else if (debt.getDueDate().isBefore(LocalDate.now())) {
            debt.setStatus(DebtStatus.OVERDUE);
        }
    }

    private void markDeclarationPaidIfFullyPaid(TaxDebt debt) {
        if (debt.getAssessment() == null || debt.getAssessment().getDeclaration() == null) return;
        Declaration decl = debt.getAssessment().getDeclaration();
        if (decl.getStatus() == DeclarationStatus.PAYEE) return;
        long remaining = debtRepository.countNonPaidByDeclarationId(decl.getId());
        if (remaining == 0) {
            decl.setStatus(DeclarationStatus.PAYEE);
            decl.setUpdatedAt(Instant.now());
            declarationRepository.save(decl);
        }
    }

    @Transactional
    public void addAdjustment(Long debtId, String label, BigDecimal amount, HttpServletRequest http) {
        TaxDebt debt = find(debtId);
        if (debt.getStatus() == DebtStatus.PAID) {
            throw new BusinessException("DEBT_ALREADY_PAID", "Une dette payée ne peut pas être ajustée.");
        }
        if (debt.getStatus() == DebtStatus.CANCELLED || debt.getStatus() == DebtStatus.CLOSED) {
            throw new BusinessException("DEBT_CLOSED", "Cette créance est clôturée.");
        }
        debt.setAdjustmentsAmount(debt.getAdjustmentsAmount().add(amount));
        addItem(debt, DebtItem.Kind.ADJUSTMENT, label, amount);
        recalculate(debt);
        debt.setUpdatedAt(Instant.now());
        debtRepository.save(debt);
        addHistory(debt, "ADJUSTMENT", "Ajustement appliqué : " + label,
                null, amount + " MGA");
    }

    @Transactional
    public void cancel(Long debtId) {
        TaxDebt debt = find(debtId);
        if (debt.getPaidAmount().signum() > 0) {
            throw new BusinessException("DEBT_HAS_PAYMENTS", "Impossible d'annuler une créance partiellement ou totalement payée.");
        }
        DebtStatus oldStatus = debt.getStatus();
        debt.setStatus(DebtStatus.CANCELLED);
        debt.setClosedAt(Instant.now());
        debt.setUpdatedAt(Instant.now());
        debtRepository.save(debt);
        addHistory(debt, "CANCELLED", "Créance annulée",
                oldStatus.name(), DebtStatus.CANCELLED.name());
    }

    @Transactional
    public void suspend(Long debtId, String reason) {
        TaxDebt debt = find(debtId);
        if (debt.getStatus() == DebtStatus.PAID || debt.getStatus() == DebtStatus.CANCELLED
                || debt.getStatus() == DebtStatus.CLOSED) {
            throw new BusinessException("DEBT_TRANSITION_INVALID",
                    "On ne peut pas suspendre une créance " + debt.getStatus() + ".");
        }
        DebtStatus oldStatus = debt.getStatus();
        debt.setStatus(DebtStatus.SUSPENDED);
        debt.setSuspendedAt(Instant.now());
        debt.setUpdatedAt(Instant.now());
        debtRepository.save(debt);
        addHistory(debt, "SUSPENDED", "Créance suspendue" + (reason != null ? " : " + reason : ""),
                oldStatus.name(), DebtStatus.SUSPENDED.name());
    }

    @Transactional
    public void resume(Long debtId) {
        TaxDebt debt = find(debtId);
        if (debt.getStatus() != DebtStatus.SUSPENDED) {
            throw new BusinessException("DEBT_NOT_SUSPENDED", "Cette créance n'est pas suspendue.");
        }
        DebtStatus previous = debt.getDueDate().isBefore(LocalDate.now())
                ? DebtStatus.OVERDUE : DebtStatus.ISSUED;
        debt.setStatus(previous);
        debt.setSuspendedAt(null);
        debt.setUpdatedAt(Instant.now());
        debtRepository.save(debt);
        addHistory(debt, "RESUMED", "Créance réactivée",
                DebtStatus.SUSPENDED.name(), previous.name());
    }

    @Transactional
    public void close(Long debtId, String reason) {
        TaxDebt debt = find(debtId);
        if (debt.getStatus() == DebtStatus.PAID || debt.getStatus() == DebtStatus.CANCELLED) {
            throw new BusinessException("DEBT_TRANSITION_INVALID",
                    "On ne peut pas clôturer une créance " + debt.getStatus() + ".");
        }
        DebtStatus oldStatus = debt.getStatus();
        debt.setStatus(DebtStatus.CLOSED);
        debt.setClosedAt(Instant.now());
        debt.setUpdatedAt(Instant.now());
        debtRepository.save(debt);
        addHistory(debt, "CLOSED", "Créance clôturée" + (reason != null ? " : " + reason : ""),
                oldStatus.name(), DebtStatus.CLOSED.name());
    }

    @Transactional
    public void setInCollection(Long debtId) {
        TaxDebt debt = find(debtId);
        if (debt.getStatus() == DebtStatus.PAID) {
            throw new BusinessException("DEBT_ALREADY_PAID", "Une dette payée ne peut pas être relancée.");
        }
        if (debt.getStatus() == DebtStatus.CLOSED || debt.getStatus() == DebtStatus.CANCELLED) {
            throw new BusinessException("DEBT_CLOSED", "Cette créance est clôturée.");
        }
        DebtStatus oldStatus = debt.getStatus();
        debt.setStatus(DebtStatus.IN_COLLECTION);
        debt.setUpdatedAt(Instant.now());
        debtRepository.save(debt);
        addHistory(debt, "IN_COLLECTION", "Créance envoyée en recouvrement",
                oldStatus.name(), DebtStatus.IN_COLLECTION.name());
        notificationService.notifyCollectionNotice(
                debt.getTaxpayer() != null ? debt.getTaxpayer().getUserId() : null,
                debt.getReference(), debt.getBalance());
    }

    @Transactional
    public void updatePriority(Long debtId, DebtCollectionPriority priority) {
        TaxDebt debt = find(debtId);
        DebtCollectionPriority old = debt.getCollectionPriority();
        debt.setCollectionPriority(priority);
        debt.setUpdatedAt(Instant.now());
        debtRepository.save(debt);
        addHistory(debt, "PRIORITY_CHANGED", "Priorité de recouvrement modifiée",
                old.name(), priority.name());
    }

    @Transactional
    public void updateObservations(Long debtId, String observations) {
        TaxDebt debt = find(debtId);
        String old = debt.getObservations();
        debt.setObservations(observations);
        debt.setUpdatedAt(Instant.now());
        debtRepository.save(debt);
        addHistory(debt, "OBSERVATIONS_UPDATED", "Observations mises à jour",
                old, observations);
    }

    public TaxDebt find(Long id) {
        return debtRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Créance", id));
    }

    private void addHistory(TaxDebt debt, String eventType, String description,
                            String oldValue, String newValue) {
        historyRepository.save(DebtHistory.builder()
                .debt(debt)
                .eventType(eventType)
                .description(description)
                .oldValue(oldValue)
                .newValue(newValue)
                .performedBy(SecurityUtils.currentUsername())
                .eventDate(Instant.now())
                .createdAt(Instant.now())
                .build());
    }

    private void addItem(TaxDebt debt, DebtItem.Kind kind, String label, BigDecimal amount) {
        if (amount == null || amount.signum() == 0) {
            return;
        }
        itemRepository.save(DebtItem.builder()
                .debt(debt)
                .kind(kind)
                .label(label)
                .amount(amount)
                .createdAt(Instant.now())
                .build());
    }

    private LocalDate resolveDueDate(Assessment assessment, LocalDate today) {
        Optional<Deadline> deadline = deadlineRepository.findByTaxTypeIdAndPeriod(
                assessment.getTaxType().getId(), assessment.getPeriod());
        return deadline.map(Deadline::getPaymentDeadline).orElse(today.plusDays(30));
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }
}
