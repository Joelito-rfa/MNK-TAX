package com.mnktax.assessment.service;

import com.mnktax.assessment.dto.AssessmentDtos.AdjustRequest;
import com.mnktax.assessment.dto.AssessmentDtos.AssessmentDto;
import com.mnktax.assessment.dto.AssessmentDtos.HistoryDto;
import com.mnktax.assessment.dto.AssessmentDtos.ManualRequest;
import com.mnktax.assessment.dto.AssessmentDtos.SimulateRequest;
import com.mnktax.assessment.dto.AssessmentDtos.SimulationDto;
import com.mnktax.assessment.dto.AssessmentDtos.StatsDto;
import com.mnktax.assessment.entity.Assessment;
import com.mnktax.assessment.entity.AssessmentHistory;
import com.mnktax.assessment.entity.AssessmentLine;
import com.mnktax.assessment.entity.AssessmentOrigin;
import com.mnktax.assessment.entity.AssessmentStatus;
import com.mnktax.assessment.repository.AssessmentHistoryRepository;
import com.mnktax.assessment.repository.AssessmentRepository;
import com.mnktax.audit.service.AuditService;
import com.mnktax.common.exception.BusinessException;
import com.mnktax.common.exception.ResourceNotFoundException;
import com.mnktax.common.util.ReferenceGenerator;
import com.mnktax.common.util.SecurityUtils;
import com.mnktax.debt.service.DebtService;
import com.mnktax.declaration.entity.Declaration;
import com.mnktax.notification.entity.NotificationType;
import com.mnktax.notification.service.NotificationService;
import com.mnktax.tax.engine.CalculationResult;
import com.mnktax.tax.engine.RuleResolver;
import com.mnktax.tax.engine.TaxCalculator;
import com.mnktax.tax.engine.TaxContext;
import com.mnktax.tax.entity.TaxRule;
import com.mnktax.tax.entity.TaxType;
import com.mnktax.tax.repository.TaxRuleVersionRepository;
import com.mnktax.tax.repository.TaxTypeRepository;
import com.mnktax.taxpayer.entity.Taxpayer;
import com.mnktax.taxpayer.entity.TaxpayerActivity;
import com.mnktax.taxpayer.repository.TaxpayerRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/**
 * Cycle de vie complet des impositions : déclarative, rectificative (delta),
 * redressement (contrôle) et taxation d'office (manuelle).
 */
@Service
public class AssessmentService {

    private final AssessmentRepository assessmentRepository;
    private final AssessmentHistoryRepository historyRepository;
    private final RuleResolver ruleResolver;
    private final TaxCalculator taxCalculator;
    private final TaxRuleVersionRepository versionRepository;
    private final DebtService debtService;
    private final TaxpayerRepository taxpayerRepository;
    private final TaxTypeRepository taxTypeRepository;
    private final NotificationService notificationService;
    private final AuditService auditService;

    public AssessmentService(AssessmentRepository assessmentRepository,
                             AssessmentHistoryRepository historyRepository,
                             RuleResolver ruleResolver,
                             TaxCalculator taxCalculator, TaxRuleVersionRepository versionRepository,
                             DebtService debtService, TaxpayerRepository taxpayerRepository,
                             TaxTypeRepository taxTypeRepository,
                             NotificationService notificationService,
                             AuditService auditService) {
        this.assessmentRepository = assessmentRepository;
        this.historyRepository = historyRepository;
        this.ruleResolver = ruleResolver;
        this.taxCalculator = taxCalculator;
        this.versionRepository = versionRepository;
        this.debtService = debtService;
        this.taxpayerRepository = taxpayerRepository;
        this.taxTypeRepository = taxTypeRepository;
        this.notificationService = notificationService;
        this.auditService = auditService;
    }

    // ── Création déclarative (validation de déclaration) ──

    @Transactional
    public Assessment createFromDeclaration(Declaration declaration) {
        return createFromDeclaration(declaration, null, null);
    }

    @Transactional
    public Assessment createFromDeclaration(Declaration declaration, BigDecimal credit, BigDecimal adjustment) {
        if (declaration.getId() != null
                && assessmentRepository.findByDeclarationId(declaration.getId()).isPresent()) {
            throw new BusinessException("ASSESSMENT_EXISTS",
                    "Une imposition existe déjà pour cette déclaration : "
                            + assessmentRepository.findByDeclarationId(declaration.getId()).get().getReference());
        }
        AssessmentOrigin origin = declaration.isRectificative()
                ? AssessmentOrigin.RECTIFICATIVE : AssessmentOrigin.DECLARATIVE;
        Assessment parent = null;
        if (origin == AssessmentOrigin.RECTIFICATIVE && declaration.getDeclarationOrigine() != null) {
            parent = assessmentRepository.findByDeclarationId(declaration.getDeclarationOrigine().getId())
                    .orElse(null);
            // Annule-et-remplace : une seule rectificative active par origine.
            if (parent != null) {
                List<Assessment> children = assessmentRepository.findByParentId(parent.getId());
                if (!children.isEmpty()) {
                    throw new BusinessException("RECTIFICATIVE_EXISTS",
                            "Une imposition rectificative existe déjà pour " + parent.getReference()
                                    + ". Annulez-la avant d'en créer une nouvelle.");
                }
            }
        } else if (origin == AssessmentOrigin.DECLARATIVE) {
            // Garde-fou anti double imposition sur la même période.
            List<Assessment> existing = assessmentRepository
                    .findByTaxpayerIdAndTaxTypeIdAndPeriod(declaration.getTaxpayer().getId(),
                            declaration.getTaxType().getId(), declaration.getPeriod());
            if (!existing.isEmpty()) {
                throw new BusinessException("ASSESSMENT_PERIOD_EXISTS",
                        "Une imposition existe déjà pour ce contribuable, cet impôt et cette période : "
                                + existing.get(0).getReference());
            }
        }

        CalculationResult result = calculate(declaration.getTaxpayer(), declaration.getTaxType(),
                declaration.getPeriod(), declaration.getTaxBase(), declaration.getSubmissionDate());
        Assessment saved = persist(declaration.getTaxpayer(), declaration.getTaxType(),
                declaration.getPeriod(), result,
                credit != null ? credit : BigDecimal.ZERO,
                adjustment != null ? adjustment : BigDecimal.ZERO,
                origin, parent, declaration,
                declaration.isRectificative()
                        ? "Imposition rectificative (annule-et-remplace)" : null);

        if (origin == AssessmentOrigin.RECTIFICATIVE && parent != null) {
            // Delta : ajustement de la créance d'origine au lieu d'une créance doublon.
            BigDecimal delta = saved.getNetTax().subtract(parent.getNetTax());
            debtService.adjustForRectificative(parent, saved, delta);
            addHistory(saved, "RECTIFICATIVE", parent.getReference(), saved.getReference(),
                    "Delta de " + delta + " MGA vs " + parent.getReference());
        } else {
            debtService.createFromAssessment(saved);
        }
        notifyIssued(saved);
        return saved;
    }

    // ── Taxation d'office (manuelle, sans déclaration) ──

    @Transactional
    public AssessmentDto createManual(ManualRequest req, HttpServletRequest http) {
        Taxpayer taxpayer = taxpayerRepository.findById(req.taxpayerId())
                .orElseThrow(() -> new ResourceNotFoundException("Contribuable", req.taxpayerId()));
        TaxType taxType = taxTypeRepository.findByCode(req.taxTypeCode())
                .orElseThrow(() -> new ResourceNotFoundException("Type d'impôt", req.taxTypeCode()));
        if (req.taxBase() == null || req.taxBase().signum() < 0) {
            throw new BusinessException("INVALID_BASE", "L'assiette de la taxation d'office doit être positive ou nulle.");
        }
        CalculationResult result = calculate(taxpayer, taxType, req.period(), req.taxBase(), null);
        Assessment saved = persist(taxpayer, taxType, req.period(), result,
                req.credit() != null ? req.credit() : BigDecimal.ZERO,
                req.adjustment() != null ? req.adjustment() : BigDecimal.ZERO,
                AssessmentOrigin.OFFICE, null, null, req.observations());
        debtService.createFromAssessment(saved);
        addHistory(saved, "CREATED_OFFICE", null, saved.getReference(),
                "Taxation d'office" + (req.observations() != null ? " : " + req.observations() : ""));
        auditService.record("CREATE", "ASSESSMENT", String.valueOf(saved.getId()), null,
                AssessmentDto.from(saved), http);
        notifyIssued(saved);
        return AssessmentDto.from(saved);
    }

    // ── Redressement issu d'un contrôle ──

    @Transactional
    public Assessment createFromRedressement(Taxpayer taxpayer, TaxType taxType, String period,
                                             BigDecimal redressBase, Assessment parent, String observations) {
        CalculationResult result = calculate(taxpayer, taxType, period, redressBase, null);
        Assessment saved = persist(taxpayer, taxType, period, result,
                BigDecimal.ZERO, BigDecimal.ZERO, AssessmentOrigin.REDRESSEMENT, parent, null, observations);
        debtService.createFromAssessment(saved);
        addHistory(saved, "REDRESSEMENT",
                parent != null ? parent.getReference() : null, saved.getReference(),
                "Redressement" + (observations != null ? " : " + observations : ""));
        notifyIssued(saved);
        return saved;
    }

    // ── Simulation (sans persistance) ──

    @Transactional(readOnly = true)
    public SimulationDto simulate(SimulateRequest req) {
        Taxpayer taxpayer = taxpayerRepository.findById(req.taxpayerId())
                .orElseThrow(() -> new ResourceNotFoundException("Contribuable", req.taxpayerId()));
        TaxType taxType = taxTypeRepository.findByCode(req.taxTypeCode())
                .orElseThrow(() -> new ResourceNotFoundException("Type d'impôt", req.taxTypeCode()));
        CalculationResult result = calculate(taxpayer, taxType, req.period(), req.taxBase(), null);
        return new SimulationDto(result.baseAmount(), result.rate(), result.grossTax(),
                result.exemption(), result.deduction(), result.netTax(),
                result.rule().getCode(), result.ruleVersion());
    }

    // ── Ajustement (crédit / ajustement explicites, traçés) ──

    @Transactional
    public AssessmentDto adjust(Long id, AdjustRequest req, HttpServletRequest http) {
        Assessment a = find(id);
        requireActive(a);
        BigDecimal credit = req.credit() != null ? req.credit() : a.getCredit();
        BigDecimal adjustment = req.adjustment() != null ? req.adjustment() : a.getAdjustment();
        BigDecimal net = a.getGrossTax()
                .subtract(nz(a.getExemption())).subtract(nz(a.getDeduction()))
                .subtract(nz(credit)).add(nz(adjustment));
        if (net.signum() < 0) {
            net = BigDecimal.ZERO;
        }
        String old = "net=" + a.getNetTax() + " credit=" + a.getCredit() + " adj=" + a.getAdjustment();
        a.setCredit(credit);
        a.setAdjustment(adjustment);
        a.setNetTax(net);
        if (req.observations() != null) {
            a.setObservations(req.observations());
        }
        Assessment saved = assessmentRepository.save(a);
        debtService.adjustForAssessment(saved);
        addHistory(saved, "ADJUSTED", old,
                "net=" + net + " credit=" + credit + " adj=" + adjustment,
                "Ajustement manuel de l'imposition");
        auditService.record("UPDATE", "ASSESSMENT", String.valueOf(id), null,
                AssessmentDto.from(saved), http);
        return AssessmentDto.from(saved);
    }

    @Transactional
    public AssessmentDto notify(Long id, HttpServletRequest http) {
        Assessment a = find(id);
        requireActive(a);
        a.setStatus(AssessmentStatus.NOTIFIEE);
        a.setNotifiedAt(Instant.now());
        Assessment saved = assessmentRepository.save(a);
        addHistory(saved, "NOTIFIED", AssessmentStatus.EMISED.name(), AssessmentStatus.NOTIFIEE.name(),
                "Avis d'imposition notifié");
        auditService.record("NOTIFY", "ASSESSMENT", String.valueOf(id), null,
                AssessmentDto.from(saved), http);
        notifyIssued(saved);
        return AssessmentDto.from(saved);
    }

    @Transactional
    public AssessmentDto cancel(Long id, String reason, HttpServletRequest http) {
        Assessment a = find(id);
        requireActive(a);
        if (!assessmentRepository.findByParentId(id).isEmpty()) {
            throw new BusinessException("ASSESSMENT_HAS_CHILDREN",
                    "Impossible d'annuler : des impositions rectificatives/redressements y sont rattachés.");
        }
        AssessmentStatus old = a.getStatus();
        a.setStatus(AssessmentStatus.ANNULEE);
        a.setCancelledAt(Instant.now());
        if (reason != null) {
            a.setObservations(reason);
        }
        Assessment saved = assessmentRepository.save(a);
        debtService.cancelForAssessment(saved);
        addHistory(saved, "CANCELLED", old.name(), AssessmentStatus.ANNULEE.name(),
                reason != null ? reason : "Imposition annulée");
        auditService.record("CANCEL", "ASSESSMENT", String.valueOf(id), null,
                AssessmentDto.from(saved), http);
        return AssessmentDto.from(saved);
    }

    // ── Lecture ──

    @Transactional(readOnly = true)
    public AssessmentDto get(Long id) {
        return AssessmentDto.from(findFetch(id));
    }

    @Transactional(readOnly = true)
    public Page<AssessmentDto> search(Long taxpayerId, String taxTypeCode, String period,
                                      String status, String origin, String ruleCode,
                                      String q, Pageable pageable) {
        return assessmentRepository.search(taxpayerId, taxTypeCode, period, status, origin, ruleCode,
                        blankToNull(q), pageable)
                .map(AssessmentDto::from);
    }

    @Transactional(readOnly = true)
    public List<HistoryDto> history(Long id) {
        find(id);
        return historyRepository.findByAssessmentIdOrderByCreatedAtAsc(id).stream()
                .map(HistoryDto::from).toList();
    }

    @Transactional(readOnly = true)
    public StatsDto stats() {
        long total = assessmentRepository.count();
        BigDecimal base = assessmentRepository.sumBase();
        BigDecimal net = assessmentRepository.sumNet();
        List<StatsDto.OriginCount> byOrigin = assessmentRepository.countByOriginGroup().stream()
                .map(r -> new StatsDto.OriginCount(((AssessmentOrigin) r[0]).name(), (Long) r[1])).toList();
        List<StatsDto.StatusCount> byStatus = assessmentRepository.countByStatusGroup().stream()
                .map(r -> new StatsDto.StatusCount(((AssessmentStatus) r[0]).name(), (Long) r[1])).toList();
        return new StatsDto(total, base, net, byOrigin, byStatus);
    }

    public java.util.List<Assessment> listByTaxpayer(Long taxpayerId) {
        return assessmentRepository.findByTaxpayerIdOrderByIdDesc(taxpayerId);
    }

    // ── Internes ──

    private CalculationResult calculate(Taxpayer taxpayer, TaxType taxType, String period,
                                        BigDecimal base, LocalDate effectDate) {
        String activityCode = taxpayer.getActivities() != null ? taxpayer.getActivities().stream()
                .filter(TaxpayerActivity::isPrimary)
                .findFirst()
                .map(TaxpayerActivity::getCode)
                .orElse(null) : null;
        TaxContext context = new TaxContext(taxpayer, taxType, period,
                effectDate != null ? effectDate : LocalDate.now(),
                base != null ? base : BigDecimal.ZERO, activityCode);
        TaxRule rule = ruleResolver.resolve(context);
        List<com.mnktax.tax.entity.TaxRuleVersion> versions =
                versionRepository.findByRuleOrderByVersionNumberAsc(rule);
        int version = versions.isEmpty() ? 0
                : versions.get(versions.size() - 1).getVersionNumber();
        return taxCalculator.calculate(context, rule, version);
    }

    private Assessment persist(Taxpayer taxpayer, TaxType taxType, String period,
                               CalculationResult result, BigDecimal credit, BigDecimal adjustment,
                               AssessmentOrigin origin, Assessment parent, Declaration declaration,
                               String observations) {
        BigDecimal net = result.grossTax()
                .subtract(nz(result.exemption())).subtract(nz(result.deduction()))
                .subtract(nz(credit)).add(nz(adjustment));
        if (net.signum() < 0) {
            net = BigDecimal.ZERO;
        }
        Assessment assessment = Assessment.builder()
                .reference(ReferenceGenerator.next("ASS"))
                .declaration(declaration)
                .taxpayer(taxpayer)
                .taxType(taxType)
                .period(period)
                .taxBase(result.baseAmount())
                .grossTax(result.grossTax())
                .deduction(result.deduction())
                .exemption(result.exemption())
                .credit(credit)
                .adjustment(adjustment)
                .netTax(net)
                .calculationDate(LocalDate.now())
                .ruleCode(result.rule().getCode())
                .ruleVersion(result.ruleVersion())
                .computedBy(SecurityUtils.currentUsername())
                .createdAt(Instant.now())
                .status(AssessmentStatus.EMISED)
                .origin(origin)
                .parent(parent)
                .observations(observations)
                .build();

        addLine(assessment, 1, "Assiette imposable", result.baseAmount(), null, result.baseAmount());
        addLine(assessment, 2, "Impôt brut (taux " + result.rate() + "%)", result.baseAmount(),
                result.rate(), result.grossTax());
        addLine(assessment, 3, "Exonération", null, null, result.exemption());
        addLine(assessment, 4, "Abattement / déduction", null, null, result.deduction());
        if (credit != null && credit.signum() != 0) {
            addLine(assessment, 5, "Crédit d'impôt imputé", null, null, credit.negate());
        }
        if (adjustment != null && adjustment.signum() != 0) {
            addLine(assessment, 6, "Ajustement", null, null, adjustment);
        }
        addLine(assessment, 7, "Impôt net à payer", null, null, net);

        Assessment saved = assessmentRepository.save(assessment);
        addHistory(saved, "CREATED", null, saved.getReference(),
                "Imposition " + origin.name() + " — règle " + result.rule().getCode()
                        + " v" + result.ruleVersion());
        return saved;
    }

    private void addLine(Assessment assessment, int lineNumber, String label, BigDecimal base,
                         BigDecimal rate, BigDecimal amount) {
        if (amount == null) {
            return;
        }
        assessment.getLines().add(AssessmentLine.builder()
                .assessment(assessment)
                .lineNumber(lineNumber)
                .label(label)
                .baseAmount(base)
                .rate(rate)
                .calculatedAmount(amount)
                .build());
    }

    private void addHistory(Assessment assessment, String action, String oldValue,
                            String newValue, String commentaire) {
        historyRepository.save(AssessmentHistory.builder()
                .assessment(assessment)
                .username(SecurityUtils.currentUsername())
                .action(action)
                .oldValue(oldValue)
                .newValue(newValue)
                .commentaire(commentaire)
                .createdAt(Instant.now())
                .build());
    }

    private void notifyIssued(Assessment a) {
        try {
            notificationService.notifyTaxpayer(
                    a.getTaxpayer() != null ? a.getTaxpayer().getUserId() : null,
                    NotificationType.DOCUMENT_READY,
                    "Avis d'imposition - " + a.getReference(),
                    "Votre imposition " + a.getReference() + " (" + a.getOrigin().name()
                            + ") s'élève à " + a.getNetTax() + " MGA.",
                    "ASSESSMENT", a.getReference());
        } catch (Exception ignored) {
        }
    }

    private Assessment find(Long id) {
        return assessmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Imposition", id));
    }

    private Assessment findFetch(Long id) {
        return assessmentRepository.findByIdFetch(id)
                .orElseThrow(() -> new ResourceNotFoundException("Imposition", id));
    }

    private void requireActive(Assessment a) {
        if (a.getStatus() == AssessmentStatus.ANNULEE) {
            throw new BusinessException("ASSESSMENT_CANCELLED", "Cette imposition est annulée.");
        }
    }

    private BigDecimal nz(BigDecimal v) {
        return v == null ? BigDecimal.ZERO : v;
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }
}
