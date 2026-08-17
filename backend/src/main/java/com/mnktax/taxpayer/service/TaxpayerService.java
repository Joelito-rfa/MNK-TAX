package com.mnktax.taxpayer.service;

import com.mnktax.audit.service.AuditService;
import com.mnktax.common.exception.BusinessException;
import com.mnktax.common.exception.ResourceNotFoundException;
import com.mnktax.common.util.NifValidator;
import com.mnktax.tax.entity.TaxCenter;
import com.mnktax.tax.entity.TaxRegime;
import com.mnktax.tax.repository.TaxCenterRepository;
import com.mnktax.tax.repository.TaxObligationRepository;
import com.mnktax.tax.repository.TaxRegimeRepository;
import com.mnktax.taxpayer.dto.TaxpayerDtos.ActivityDto;
import com.mnktax.taxpayer.dto.TaxpayerDtos.AddressDto;
import com.mnktax.taxpayer.dto.TaxpayerDtos.CreateTaxpayerRequest;
import com.mnktax.taxpayer.dto.TaxpayerDtos.TaxpayerDetailDto;
import com.mnktax.taxpayer.dto.TaxpayerDtos.TaxpayerSummaryDto;
import com.mnktax.taxpayer.dto.TaxpayerDtos.UpdateTaxpayerRequest;
import com.mnktax.taxpayer.entity.Taxpayer;
import com.mnktax.taxpayer.entity.TaxpayerActivity;
import com.mnktax.taxpayer.entity.TaxpayerAddress;
import com.mnktax.taxpayer.entity.TaxpayerStatus;
import com.mnktax.taxpayer.repository.TaxpayerRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Service
public class TaxpayerService {

    private final TaxpayerRepository taxpayerRepository;
    private final TaxCenterRepository taxCenterRepository;
    private final TaxRegimeRepository taxRegimeRepository;
    private final TaxObligationRepository obligationRepository;
    private final AuditService auditService;

    public TaxpayerService(TaxpayerRepository taxpayerRepository, TaxCenterRepository taxCenterRepository,
                           TaxRegimeRepository taxRegimeRepository, TaxObligationRepository obligationRepository,
                           AuditService auditService) {
        this.taxpayerRepository = taxpayerRepository;
        this.taxCenterRepository = taxCenterRepository;
        this.taxRegimeRepository = taxRegimeRepository;
        this.obligationRepository = obligationRepository;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public Page<TaxpayerSummaryDto> search(String q, TaxpayerStatus status, Long taxCenterId, Long taxRegimeId,
                                           String activityCode, String taxTypeCode, Pageable pageable) {
        return taxpayerRepository.search(blankToNull(q), status, taxCenterId, taxRegimeId,
                        blankToNull(activityCode), blankToNull(taxTypeCode), pageable)
                .map(TaxpayerSummaryDto::from);
    }

    @Transactional(readOnly = true)
    public TaxpayerDetailDto get(Long id) {
        Taxpayer taxpayer = find(id);
        long obligations = obligationRepository.countByTaxpayerId(id);
        return TaxpayerDetailDto.from(taxpayer, obligations);
    }

    @Transactional(readOnly = true)
    public TaxpayerDetailDto getByNif(String nif) {
        NifValidator.validate(nif);
        Taxpayer taxpayer = taxpayerRepository.findByNif(nif)
                .orElseThrow(() -> new ResourceNotFoundException("Contribuable NIF", nif));
        long obligations = obligationRepository.countByTaxpayerId(taxpayer.getId());
        return TaxpayerDetailDto.from(taxpayer, obligations);
    }

    @Transactional(readOnly = true)
    public TaxpayerDetailDto getByNifOrNull(String nif) {
        NifValidator.validate(nif);
        return taxpayerRepository.findByNif(nif)
                .map(t -> TaxpayerDetailDto.from(t, obligationRepository.countByTaxpayerId(t.getId())))
                .orElse(null);
    }

    @Transactional
    public TaxpayerDetailDto create(CreateTaxpayerRequest request, HttpServletRequest http) {
        NifValidator.validate(request.nif());
        if (taxpayerRepository.existsByNif(request.nif())) {
            throw new BusinessException("DUPLICATE", "Un contribuable avec ce NIF existe déjà : " + request.nif());
        }
        Taxpayer taxpayer = Taxpayer.builder()
                .nif(request.nif())
                .type(request.type())
                .name(request.name())
                .businessName(request.businessName())
                .firstName(request.firstName())
                .lastName(request.lastName())
                .phone(request.phone())
                .email(request.email())
                .address(request.address())
                .taxCenter(resolveCenter(request.taxCenterId()))
                .taxRegime(resolveRegime(request.taxRegimeId()))
                .status(TaxpayerStatus.ACTIVE)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
        if (request.addresses() != null) {
            for (AddressDto a : request.addresses()) {
                taxpayer.getAddresses().add(TaxpayerAddress.builder()
                        .taxpayer(taxpayer)
                        .type(a.type())
                        .addressLine1(a.addressLine1())
                        .addressLine2(a.addressLine2())
                        .city(a.city())
                        .region(a.region())
                        .country(a.country())
                        .postalCode(a.postalCode())
                        .build());
            }
        }
        if (request.activities() != null) {
            for (ActivityDto a : request.activities()) {
                taxpayer.getActivities().add(TaxpayerActivity.builder()
                        .taxpayer(taxpayer)
                        .code(a.code())
                        .label(a.label())
                        .description(a.description())
                        .primary(a.primary())
                        .build());
            }
        }
        Taxpayer saved = taxpayerRepository.save(taxpayer);
        auditService.record("CREATE", "TAXPAYER", String.valueOf(saved.getId()), null,
                TaxpayerDetailDto.from(saved, 0), http);
        return TaxpayerDetailDto.from(saved, 0);
    }

    @Transactional
    public TaxpayerDetailDto update(Long id, UpdateTaxpayerRequest request, HttpServletRequest http) {
        Taxpayer taxpayer = find(id);
        TaxpayerDetailDto old = TaxpayerDetailDto.from(taxpayer,
                obligationRepository.countByTaxpayerId(id));
        taxpayer.setType(request.type());
        if (request.name() != null) {
            taxpayer.setName(request.name());
        }
        taxpayer.setBusinessName(request.businessName());
        taxpayer.setFirstName(request.firstName());
        taxpayer.setLastName(request.lastName());
        taxpayer.setPhone(request.phone());
        taxpayer.setEmail(request.email());
        taxpayer.setAddress(request.address());
        taxpayer.setTaxCenter(resolveCenter(request.taxCenterId()));
        taxpayer.setTaxRegime(resolveRegime(request.taxRegimeId()));
        taxpayer.setStatus(request.status());
        taxpayer.setUpdatedAt(Instant.now());
        Taxpayer saved = taxpayerRepository.save(taxpayer);
        auditService.record("UPDATE", "TAXPAYER", String.valueOf(id), old,
                TaxpayerDetailDto.from(saved, obligationRepository.countByTaxpayerId(id)), http);
        return TaxpayerDetailDto.from(saved, obligationRepository.countByTaxpayerId(id));
    }

    @Transactional
    public void changeStatus(Long id, TaxpayerStatus status, HttpServletRequest http) {
        Taxpayer taxpayer = find(id);
        TaxpayerStatus old = taxpayer.getStatus();
        taxpayer.setStatus(status);
        taxpayer.setUpdatedAt(Instant.now());
        taxpayerRepository.save(taxpayer);
        auditService.record("UPDATE", "TAXPAYER", String.valueOf(id), old, status, http);
    }

    private Taxpayer find(Long id) {
        return taxpayerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Contribuable", id));
    }

    private TaxCenter resolveCenter(Long id) {
        if (id == null) {
            return null;
        }
        return taxCenterRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Centre fiscal", id));
    }

    private TaxRegime resolveRegime(Long id) {
        if (id == null) {
            return null;
        }
        return taxRegimeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Régime fiscal", id));
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }
}
