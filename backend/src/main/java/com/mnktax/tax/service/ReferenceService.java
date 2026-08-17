package com.mnktax.tax.service;

import com.mnktax.audit.service.AuditService;
import com.mnktax.common.exception.BusinessException;
import com.mnktax.common.exception.ResourceNotFoundException;
import com.mnktax.tax.dto.TaxDtos.TaxCenterDto;
import com.mnktax.tax.dto.TaxDtos.TaxRegimeDto;
import com.mnktax.tax.dto.TaxDtos.TaxTypeDto;
import com.mnktax.tax.entity.TaxCenter;
import com.mnktax.tax.entity.TaxRegime;
import com.mnktax.tax.entity.TaxType;
import com.mnktax.tax.repository.TaxCenterRepository;
import com.mnktax.tax.repository.TaxRegimeRepository;
import com.mnktax.tax.repository.TaxTypeRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Service
public class ReferenceService {

    private final TaxTypeRepository taxTypeRepository;
    private final TaxRegimeRepository regimeRepository;
    private final TaxCenterRepository centerRepository;
    private final AuditService auditService;

    public ReferenceService(TaxTypeRepository taxTypeRepository, TaxRegimeRepository regimeRepository,
                            TaxCenterRepository centerRepository, AuditService auditService) {
        this.taxTypeRepository = taxTypeRepository;
        this.regimeRepository = regimeRepository;
        this.centerRepository = centerRepository;
        this.auditService = auditService;
    }

    // ---- Types d'impôts ----
    @Transactional(readOnly = true)
    public List<TaxTypeDto> listTaxTypes() {
        return taxTypeRepository.findByActiveTrueOrderByCodeAsc().stream().map(TaxTypeDto::from).toList();
    }

    @Transactional
    public TaxTypeDto createTaxType(TaxTypeDto request, HttpServletRequest http) {
        if (taxTypeRepository.existsByCode(request.code())) {
            throw new BusinessException("DUPLICATE", "Un type d'impôt avec ce code existe déjà.");
        }
        TaxType type = TaxType.builder()
                .code(request.code())
                .name(request.name())
                .category(request.category())
                .description(request.description())
                .active(true)
                .build();
        TaxType saved = taxTypeRepository.save(type);
        auditService.record("CREATE", "TAX_TYPE", String.valueOf(saved.getId()), null, TaxTypeDto.from(saved), http);
        return TaxTypeDto.from(saved);
    }

    @Transactional
    public void toggleTaxType(Long id, boolean active, HttpServletRequest http) {
        TaxType type = taxTypeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Type d'impôt", id));
        type.setActive(active);
        taxTypeRepository.save(type);
        auditService.record("UPDATE", "TAX_TYPE", String.valueOf(id), !active, active, http);
    }

    // ---- Régimes ----
    @Transactional(readOnly = true)
    public List<TaxRegimeDto> listRegimes() {
        return regimeRepository.findAll().stream().map(TaxRegimeDto::from).toList();
    }

    @Transactional
    public TaxRegimeDto createRegime(TaxRegimeDto request, HttpServletRequest http) {
        if (regimeRepository.existsByCode(request.code())) {
            throw new BusinessException("DUPLICATE", "Un régime avec ce code existe déjà.");
        }
        TaxRegime regime = TaxRegime.builder()
                .code(request.code())
                .name(request.name())
                .description(request.description())
                .category(request.category())
                .build();
        TaxRegime saved = regimeRepository.save(regime);
        auditService.record("CREATE", "TAX_REGIME", String.valueOf(saved.getId()), null, TaxRegimeDto.from(saved), http);
        return TaxRegimeDto.from(saved);
    }

    // ---- Centres fiscaux ----
    @Transactional(readOnly = true)
    public List<TaxCenterDto> listCenters() {
        return centerRepository.findAll().stream().map(TaxCenterDto::from).toList();
    }

    @Transactional
    public TaxCenterDto createCenter(TaxCenterDto request, HttpServletRequest http) {
        if (centerRepository.existsByCode(request.code())) {
            throw new BusinessException("DUPLICATE", "Un centre fiscal avec ce code existe déjà.");
        }
        TaxCenter center = TaxCenter.builder()
                .code(request.code())
                .name(request.name())
                .address(request.address())
                .createdAt(Instant.now())
                .build();
        TaxCenter saved = centerRepository.save(center);
        auditService.record("CREATE", "TAX_CENTER", String.valueOf(saved.getId()), null, TaxCenterDto.from(saved), http);
        return TaxCenterDto.from(saved);
    }
}
