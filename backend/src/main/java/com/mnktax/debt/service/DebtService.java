package com.mnktax.debt.service;

import com.mnktax.assessment.entity.Assessment;
import com.mnktax.common.exception.BusinessException;
import com.mnktax.common.exception.ResourceNotFoundException;
import com.mnktax.common.util.ReferenceGenerator;
import com.mnktax.debt.dto.DebtDtos.TaxDebtDto;
import com.mnktax.debt.entity.DebtItem;
import com.mnktax.debt.entity.DebtStatus;
import com.mnktax.debt.entity.Interest;
import com.mnktax.debt.entity.Penalty;
import com.mnktax.debt.entity.TaxDebt;
import com.mnktax.debt.repository.DebtItemRepository;
import com.mnktax.debt.repository.InterestRepository;
import com.mnktax.debt.repository.PenaltyRepository;
import com.mnktax.debt.repository.TaxDebtRepository;
import com.mnktax.notification.service.NotificationService;
import com.mnktax.tax.entity.Deadline;
import com.mnktax.tax.repository.DeadlineRepository;
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

    private static final String DEFAULT_PENALTY_CODE = "PEN_DEMO_5";
    private static final String DEFAULT_INTEREST_CODE = "INT_DEMO_1";

    private final TaxDebtRepository debtRepository;
    private final DebtItemRepository itemRepository;
    private final PenaltyRepository penaltyRepository;
    private final InterestRepository interestRepository;
    private final DeadlineRepository deadlineRepository;
    private final NotificationService notificationService;

    public DebtService(TaxDebtRepository debtRepository, DebtItemRepository itemRepository,
                       PenaltyRepository penaltyRepository, InterestRepository interestRepository,
                       DeadlineRepository deadlineRepository, NotificationService notificationService) {
        this.debtRepository = debtRepository;
        this.itemRepository = itemRepository;
        this.penaltyRepository = penaltyRepository;
        this.interestRepository = interestRepository;
        this.deadlineRepository = deadlineRepository;
        this.notificationService = notificationService;
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
                .status(DebtStatus.ISSUED)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
        TaxDebt saved = debtRepository.save(debt);
        addItem(saved, DebtItem.Kind.PRINCIPAL, "Principal de la créance " + assessment.getReference(), principal);
        notificationService.notifyDebtIssued(null, saved.getReference(),
                assessment.getTaxpayer().getNif(), principal);
        return saved;
    }

    @Transactional(readOnly = true)
    public TaxDebtDto get(Long id) {
        TaxDebt debt = find(id);
        return TaxDebtDto.from(debt, itemRepository.findByDebtIdOrderByIdAsc(id));
    }

    @Transactional(readOnly = true)
    public Page<TaxDebtDto> search(DebtStatus status, String taxTypeCode, String period, Long taxpayerId,
                                   boolean overdue, String q, Pageable pageable) {
        return debtRepository.search(status, taxTypeCode, period, taxpayerId, overdue,
                        LocalDate.now(), blankToNull(q), pageable)
                .map(d -> TaxDebtDto.from(d, itemRepository.findByDebtIdOrderByIdAsc(d.getId())));
    }

    public List<TaxDebt> listByTaxpayer(Long taxpayerId) {
        return debtRepository.findByTaxpayerIdOrderByIdDesc(taxpayerId);
    }

    @Transactional
    public int markOverdue(LocalDate today) {
        List<TaxDebt> toMark = debtRepository.findToMarkOverdue(today);
        for (TaxDebt debt : toMark) {
            applyLateCharges(debt);
            debt.setStatus(DebtStatus.OVERDUE);
            debt.setUpdatedAt(Instant.now());
            debtRepository.save(debt);
        }
        return toMark.size();
    }

    /**
     * Applique pénalités et intérêts de retard uniquement si non déjà appliqués.
     * Taux configurables en base (données de démonstration clairement fictives).
     */
    @Transactional
    public void applyLateCharges(TaxDebt debt) {
        boolean hasPenaltyItem = itemRepository.findByDebtIdOrderByIdAsc(debt.getId()).stream()
                .anyMatch(i -> i.getKind() == DebtItem.Kind.PENALTY);
        if (!hasPenaltyItem) {
            BigDecimal rate = penaltyRepository.findByCode(DEFAULT_PENALTY_CODE)
                    .map(Penalty::getRate)
                    .orElse(BigDecimal.valueOf(5));
            BigDecimal penalty = debt.getBalance().multiply(rate).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
            if (penalty.signum() > 0) {
                debt.setPenaltyAmount(debt.getPenaltyAmount().add(penalty));
                addItem(debt, DebtItem.Kind.PENALTY, "Pénalité de retard (" + rate.stripTrailingZeros() + "%)", penalty);
            }
        }
        boolean hasInterestItem = itemRepository.findByDebtIdOrderByIdAsc(debt.getId()).stream()
                .anyMatch(i -> i.getKind() == DebtItem.Kind.INTEREST);
        if (!hasInterestItem) {
            BigDecimal rate = interestRepository.findByCode(DEFAULT_INTEREST_CODE)
                    .map(Interest::getRate)
                    .orElse(BigDecimal.valueOf(1));
            long months = Math.max(1, ChronoUnit.MONTHS.between(debt.getDueDate(), LocalDate.now()));
            BigDecimal interest = debt.getBalance().multiply(rate).multiply(BigDecimal.valueOf(months))
                    .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
            if (interest.signum() > 0) {
                debt.setInterestAmount(debt.getInterestAmount().add(interest));
                addItem(debt, DebtItem.Kind.INTEREST, "Intérêts de retard (" + rate.stripTrailingZeros() + "%/mois)", interest);
            }
        }
        recalculate(debt);
        debtRepository.save(debt);
    }

    /**
     * Recalcule total et solde à partir des composantes, puis ajuste le statut.
     */
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
        if (current == DebtStatus.CANCELLED) {
            return;
        }
        if (balance.signum() == 0 && total.signum() == 0) {
            debt.setStatus(DebtStatus.PAID);
            debt.setClosedAt(Instant.now());
        } else if (balance.signum() == 0) {
            debt.setStatus(DebtStatus.PAID);
            debt.setClosedAt(Instant.now());
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

    @Transactional
    public void addAdjustment(Long debtId, String label, BigDecimal amount, HttpServletRequest http) {
        TaxDebt debt = find(debtId);
        if (debt.getStatus() == DebtStatus.PAID) {
            throw new BusinessException("DEBT_ALREADY_PAID", "Une dette payée ne peut pas être ajustée.");
        }
        debt.setAdjustmentsAmount(debt.getAdjustmentsAmount().add(amount));
        addItem(debt, DebtItem.Kind.ADJUSTMENT, label, amount);
        recalculate(debt);
        debt.setUpdatedAt(Instant.now());
        debtRepository.save(debt);
    }

    @Transactional
    public void cancel(Long debtId) {
        TaxDebt debt = find(debtId);
        if (debt.getPaidAmount().signum() > 0) {
            throw new BusinessException("DEBT_HAS_PAYMENTS", "Impossible d'annuler une créance partiellement ou totalement payée.");
        }
        debt.setStatus(DebtStatus.CANCELLED);
        debt.setClosedAt(Instant.now());
        debt.setUpdatedAt(Instant.now());
        debtRepository.save(debt);
    }

    @Transactional
    public void setInCollection(Long debtId) {
        TaxDebt debt = find(debtId);
        if (debt.getStatus() == DebtStatus.PAID) {
            throw new BusinessException("DEBT_ALREADY_PAID", "Une dette payée ne peut pas être relancée.");
        }
        debt.setStatus(DebtStatus.IN_COLLECTION);
        debt.setUpdatedAt(Instant.now());
        debtRepository.save(debt);
        notificationService.notifyCollectionNotice(null, debt.getReference(), debt.getBalance());
    }

    public TaxDebt find(Long id) {
        return debtRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Créance", id));
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
