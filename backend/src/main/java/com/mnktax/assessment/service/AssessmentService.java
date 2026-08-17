package com.mnktax.assessment.service;

import com.mnktax.assessment.dto.AssessmentDtos.AssessmentDto;
import com.mnktax.assessment.entity.Assessment;
import com.mnktax.assessment.entity.AssessmentLine;
import com.mnktax.assessment.repository.AssessmentRepository;
import com.mnktax.common.exception.BusinessException;
import com.mnktax.common.exception.ResourceNotFoundException;
import com.mnktax.common.util.ReferenceGenerator;
import com.mnktax.common.util.SecurityUtils;
import com.mnktax.debt.service.DebtService;
import com.mnktax.declaration.entity.Declaration;
import com.mnktax.tax.engine.CalculationResult;
import com.mnktax.tax.engine.RuleResolver;
import com.mnktax.tax.engine.TaxCalculator;
import com.mnktax.tax.engine.TaxContext;
import com.mnktax.tax.entity.TaxRule;
import com.mnktax.tax.repository.TaxRuleVersionRepository;
import com.mnktax.taxpayer.entity.TaxpayerActivity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

/**
 * Génère l'imposition (assessment) à partir d'une déclaration validée.
 * La version exacte de la règle fiscale utilisée est enregistrée.
 * La création d'une créance suit immédiatement la génération.
 */
@Service
public class AssessmentService {

    private final AssessmentRepository assessmentRepository;
    private final RuleResolver ruleResolver;
    private final TaxCalculator taxCalculator;
    private final TaxRuleVersionRepository versionRepository;
    private final DebtService debtService;

    public AssessmentService(AssessmentRepository assessmentRepository, RuleResolver ruleResolver,
                             TaxCalculator taxCalculator, TaxRuleVersionRepository versionRepository,
                             DebtService debtService) {
        this.assessmentRepository = assessmentRepository;
        this.ruleResolver = ruleResolver;
        this.taxCalculator = taxCalculator;
        this.versionRepository = versionRepository;
        this.debtService = debtService;
    }

    @Transactional
    public Assessment createFromDeclaration(Declaration declaration) {
        if (assessmentRepository.findByDeclarationId(declaration.getId()).isPresent()) {
            throw new BusinessException("ASSESSMENT_EXISTS",
                    "Une imposition existe déjà pour cette déclaration : "
                            + assessmentRepository.findByDeclarationId(declaration.getId()).get().getReference());
        }
        LocalDate effectDate = declaration.getSubmissionDate() != null ? declaration.getSubmissionDate() : LocalDate.now();
        String activityCode = declaration.getTaxpayer().getActivities().stream()
                .filter(TaxpayerActivity::isPrimary)
                .findFirst()
                .map(TaxpayerActivity::getCode)
                .orElse(null);

        TaxContext context = new TaxContext(declaration.getTaxpayer(), declaration.getTaxType(),
                declaration.getPeriod(), effectDate, declaration.getTaxBase(), activityCode);
        TaxRule rule = ruleResolver.resolve(context);
        int version = versionRepository.countByRule(rule);
        CalculationResult result = taxCalculator.calculate(context, rule, version);

        Assessment assessment = Assessment.builder()
                .reference(ReferenceGenerator.next("ASS"))
                .declaration(declaration)
                .taxpayer(declaration.getTaxpayer())
                .taxType(declaration.getTaxType())
                .period(declaration.getPeriod())
                .taxBase(result.baseAmount())
                .grossTax(result.grossTax())
                .deduction(result.deduction())
                .credit(BigDecimal.ZERO)
                .adjustment(BigDecimal.ZERO)
                .netTax(result.netTax())
                .calculationDate(LocalDate.now())
                .ruleCode(rule.getCode())
                .ruleVersion(version)
                .computedBy(SecurityUtils.currentUsername())
                .createdAt(Instant.now())
                .build();

        addLine(assessment, 1, "Assiette imposable", result.baseAmount(), null, result.baseAmount());
        addLine(assessment, 2, "Impôt brut (taux " + result.rate() + "%)", result.baseAmount(),
                result.rate(), result.grossTax());
        addLine(assessment, 3, "Exonération", null, null, result.exemption());
        addLine(assessment, 4, "Abattement / déduction", null, null, result.deduction());
        addLine(assessment, 5, "Impôt net à payer", null, null, result.netTax());

        Assessment saved = assessmentRepository.save(assessment);
        debtService.createFromAssessment(saved);
        return saved;
    }

    @Transactional(readOnly = true)
    public AssessmentDto get(Long id) {
        return AssessmentDto.from(assessmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Imposition", id)));
    }

    @Transactional(readOnly = true)
    public Page<AssessmentDto> search(Long taxpayerId, String taxTypeCode, String period, String q,
                                      Pageable pageable) {
        return assessmentRepository.search(taxpayerId, taxTypeCode, period, blankToNull(q), pageable)
                .map(AssessmentDto::from);
    }

    public java.util.List<Assessment> listByTaxpayer(Long taxpayerId) {
        return assessmentRepository.findByTaxpayerIdOrderByIdDesc(taxpayerId);
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

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }
}
