package com.mnktax.tax.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mnktax.audit.service.AuditService;
import com.mnktax.auth.security.Permissions;
import com.mnktax.common.exception.BusinessException;
import com.mnktax.common.exception.ResourceNotFoundException;
import com.mnktax.common.util.SecurityUtils;
import com.mnktax.tax.dto.RuleDtos.CreateRuleRequest;
import com.mnktax.tax.dto.RuleDtos.TaxRuleDto;
import com.mnktax.tax.dto.RuleDtos.TaxRuleVersionDto;
import com.mnktax.tax.entity.TaxRegime;
import com.mnktax.tax.entity.TaxRule;
import com.mnktax.tax.entity.TaxRuleVersion;
import com.mnktax.tax.entity.TaxType;
import com.mnktax.tax.repository.TaxRegimeRepository;
import com.mnktax.tax.repository.TaxRuleRepository;
import com.mnktax.tax.repository.TaxRuleVersionRepository;
import com.mnktax.tax.repository.TaxTypeRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Gestion des règles fiscales avec versioning.
 * Une ancienne règle n'est jamais écrasée : chaque modification archive
 * une copie de la règle précédente dans tax_rule_versions.
 */
@Service
public class TaxRuleService {

    private final TaxRuleRepository ruleRepository;
    private final TaxRuleVersionRepository versionRepository;
    private final TaxTypeRepository taxTypeRepository;
    private final TaxRegimeRepository taxRegimeRepository;
    private final ObjectMapper objectMapper;
    private final AuditService auditService;

    public TaxRuleService(TaxRuleRepository ruleRepository, TaxRuleVersionRepository versionRepository,
                          TaxTypeRepository taxTypeRepository, TaxRegimeRepository taxRegimeRepository,
                          ObjectMapper objectMapper, AuditService auditService) {
        this.ruleRepository = ruleRepository;
        this.versionRepository = versionRepository;
        this.taxTypeRepository = taxTypeRepository;
        this.taxRegimeRepository = taxRegimeRepository;
        this.objectMapper = objectMapper;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public List<TaxRuleDto> findAll(String taxTypeCode) {
        List<TaxRule> rules = taxTypeCode == null || taxTypeCode.isBlank()
                ? ruleRepository.findByActiveTrueOrderByEffectiveFromAsc()
                : ruleRepository.findByTaxTypeCodeOrderByEffectiveFromAsc(taxTypeCode);
        return rules.stream()
                .map(r -> TaxRuleDto.from(r, currentVersion(r)))
                .toList();
    }

    @Transactional(readOnly = true)
    public TaxRuleDto get(Long id) {
        TaxRule rule = findRule(id);
        return TaxRuleDto.from(rule, currentVersion(rule));
    }

    @Transactional
    public TaxRuleDto create(CreateRuleRequest request) {
        if (ruleRepository.existsByCode(request.code())) {
            throw new BusinessException("DUPLICATE", "Une règle avec ce code existe déjà : " + request.code());
        }
        TaxType taxType = taxTypeRepository.findByCode(request.taxTypeCode())
                .orElseThrow(() -> new ResourceNotFoundException("Type d'impôt", request.taxTypeCode()));
        TaxRegime regime = request.regimeCode() == null ? null
                : taxRegimeRepository.findByCode(request.regimeCode())
                .orElseThrow(() -> new ResourceNotFoundException("Régime", request.regimeCode()));

        TaxRule rule = TaxRule.builder()
                .code(request.code())
                .name(request.name())
                .taxType(taxType)
                .taxpayerType(request.taxpayerType())
                .regime(regime)
                .activityCode(request.activityCode())
                .calculationMethod(request.calculationMethod())
                .rate(request.rate())
                .minimum(request.minimum())
                .maximum(request.maximum())
                .deduction(request.deduction())
                .exemption(request.exemption())
                .legalReference(request.legalReference())
                .brackets(request.brackets())
                .demo(request.demo())
                .effectiveFrom(request.effectiveFrom())
                .effectiveTo(request.effectiveTo())
                .active(true)
                .createdAt(Instant.now())
                .createdBy(SecurityUtils.currentUsername())
                .build();
        TaxRule saved = ruleRepository.save(rule);
        archiveVersion(saved, 1, "Création de la règle.");
        auditService.record("RULE_CHANGE", "TAX_RULE", String.valueOf(saved.getId()), null,
                TaxRuleDto.from(saved, 1));
        return TaxRuleDto.from(saved, 1);
    }

    @Transactional
    public TaxRuleDto update(Long id, CreateRuleRequest request, String reason) {
        TaxRule rule = findRule(id);
        int oldVersion = currentVersion(rule);
        archiveVersion(rule, oldVersion, "Sauvegarde avant mise à jour.");

        TaxType taxType = taxTypeRepository.findByCode(request.taxTypeCode())
                .orElseThrow(() -> new ResourceNotFoundException("Type d'impôt", request.taxTypeCode()));
        TaxRegime regime = request.regimeCode() == null ? null
                : taxRegimeRepository.findByCode(request.regimeCode())
                .orElseThrow(() -> new ResourceNotFoundException("Régime", request.regimeCode()));

        TaxRuleDto old = TaxRuleDto.from(rule, oldVersion);
        rule.setName(request.name());
        rule.setTaxType(taxType);
        rule.setTaxpayerType(request.taxpayerType());
        rule.setRegime(regime);
        rule.setActivityCode(request.activityCode());
        rule.setCalculationMethod(request.calculationMethod());
        rule.setRate(request.rate());
        rule.setMinimum(request.minimum());
        rule.setMaximum(request.maximum());
        rule.setDeduction(request.deduction());
        rule.setExemption(request.exemption());
        rule.setLegalReference(request.legalReference());
        rule.setBrackets(request.brackets());
        rule.setEffectiveFrom(request.effectiveFrom());
        rule.setEffectiveTo(request.effectiveTo());

        TaxRule saved = ruleRepository.save(rule);
        int newVersion = oldVersion + 1;
        archiveVersion(saved, newVersion, reason);
        auditService.record("RULE_CHANGE", "TAX_RULE", String.valueOf(id), old, TaxRuleDto.from(saved, newVersion));
        return TaxRuleDto.from(saved, newVersion);
    }

    @Transactional
    public void setActive(Long id, boolean active, String reason) {
        TaxRule rule = findRule(id);
        int version = currentVersion(rule);
        archiveVersion(rule, version, "Sauvegarde avant " + (active ? "activation" : "désactivation") + " : " + reason);
        boolean old = rule.isActive();
        rule.setActive(active);
        ruleRepository.save(rule);
        auditService.record("RULE_CHANGE", "TAX_RULE", String.valueOf(id), old, active);
    }

    @Transactional(readOnly = true)
    public List<TaxRuleVersionDto> versions(Long ruleId) {
        return versionRepository.findByRuleIdOrderByVersionNumberDesc(ruleId).stream()
                .map(v -> new TaxRuleVersionDto(v.getId(), v.getRule().getId(), v.getVersionNumber(),
                        v.getSnapshot(), v.getReason(), v.getChangedBy(), v.getRule().getEffectiveFrom()))
                .toList();
    }

    private TaxRule findRule(Long id) {
        return ruleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Règle fiscale", id));
    }

    private int currentVersion(TaxRule rule) {
        return versionRepository.countByRule(rule);
    }

    private void archiveVersion(TaxRule rule, int versionNumber, String reason) {
        try {
            versionRepository.save(TaxRuleVersion.builder()
                    .rule(rule)
                    .versionNumber(versionNumber)
                    .snapshot(toSnapshot(rule))
                    .reason(reason)
                    .changedBy(SecurityUtils.currentUsername())
                    .createdAt(Instant.now())
                    .build());
        } catch (JsonProcessingException ex) {
            throw new BusinessException("RULE_SNAPSHOT_ERROR", "Impossible d'archiver la règle : " + ex.getMessage());
        }
    }

    /**
     * Sérialise uniquement les champs simples de la règle : évite les erreurs
     * de sérialisation des proxies Hibernate (relations lazy) par Jackson.
     */
    private String toSnapshot(TaxRule rule) throws JsonProcessingException {
        Map<String, Object> snap = new LinkedHashMap<>();
        snap.put("code", rule.getCode());
        snap.put("name", rule.getName());
        snap.put("taxTypeCode", rule.getTaxType() == null ? null : rule.getTaxType().getCode());
        snap.put("taxpayerType", rule.getTaxpayerType());
        snap.put("regimeCode", rule.getRegime() == null ? null : rule.getRegime().getCode());
        snap.put("activityCode", rule.getActivityCode());
        snap.put("calculationMethod", rule.getCalculationMethod());
        snap.put("rate", rule.getRate());
        snap.put("minimum", rule.getMinimum());
        snap.put("maximum", rule.getMaximum());
        snap.put("deduction", rule.getDeduction());
        snap.put("exemption", rule.getExemption());
        snap.put("legalReference", rule.getLegalReference());
        snap.put("brackets", rule.getBrackets());
        snap.put("effectiveFrom", rule.getEffectiveFrom());
        snap.put("effectiveTo", rule.getEffectiveTo());
        snap.put("active", rule.isActive());
        return objectMapper.writeValueAsString(snap);
    }
}
