package com.mnktax.tax.service;

import com.mnktax.common.exception.ResourceNotFoundException;
import com.mnktax.tax.dto.ObligationDtos.CreateObligationRequest;
import com.mnktax.tax.dto.ObligationDtos.ObligationDto;
import com.mnktax.tax.dto.ObligationDtos.UpdateObligationRequest;
import com.mnktax.tax.entity.ObligationStatus;
import com.mnktax.tax.entity.Periodicity;
import com.mnktax.tax.entity.TaxObligation;
import com.mnktax.tax.entity.TaxType;
import com.mnktax.tax.repository.TaxObligationRepository;
import com.mnktax.tax.repository.TaxTypeRepository;
import com.mnktax.taxpayer.entity.Taxpayer;
import com.mnktax.taxpayer.repository.TaxpayerRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Service
public class TaxObligationService {

    private final TaxObligationRepository obligationRepository;
    private final TaxpayerRepository taxpayerRepository;
    private final TaxTypeRepository taxTypeRepository;

    public TaxObligationService(TaxObligationRepository obligationRepository,
                                TaxpayerRepository taxpayerRepository,
                                TaxTypeRepository taxTypeRepository) {
        this.obligationRepository = obligationRepository;
        this.taxpayerRepository = taxpayerRepository;
        this.taxTypeRepository = taxTypeRepository;
    }

    @Transactional(readOnly = true)
    public List<ObligationDto> listByTaxpayer(Long taxpayerId) {
        return obligationRepository.findByTaxpayerIdOrderByIdAsc(taxpayerId).stream()
                .map(ObligationDto::from)
                .toList();
    }

    @Transactional
    public ObligationDto create(CreateObligationRequest request) {
        Taxpayer taxpayer = taxpayerRepository.findById(request.taxpayerId())
                .orElseThrow(() -> new ResourceNotFoundException("Contribuable", request.taxpayerId()));
        TaxType taxType = taxTypeRepository.findByCode(request.taxTypeCode())
                .orElseThrow(() -> new ResourceNotFoundException("Type d'impôt", request.taxTypeCode()));
        TaxObligation obligation = TaxObligation.builder()
                .taxpayer(taxpayer)
                .taxType(taxType)
                .periodicity(request.periodicity())
                .startDate(request.startDate())
                .endDate(request.endDate())
                .status(ObligationStatus.ACTIVE)
                .createdAt(Instant.now())
                .build();
        return ObligationDto.from(obligationRepository.save(obligation));
    }

    @Transactional
    public ObligationDto update(Long id, UpdateObligationRequest request) {
        TaxObligation obligation = obligationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Obligation", id));
        obligation.setPeriodicity(request.periodicity());
        obligation.setEndDate(request.endDate());
        obligation.setStatus(request.status());
        return ObligationDto.from(obligationRepository.save(obligation));
    }

    @Transactional
    public void delete(Long id) {
        obligationRepository.deleteById(id);
    }

    public List<Periodicity> periodicities() {
        return List.of(Periodicity.values());
    }
}
