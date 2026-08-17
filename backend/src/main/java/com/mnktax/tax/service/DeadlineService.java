package com.mnktax.tax.service;

import com.mnktax.audit.service.AuditService;
import com.mnktax.common.exception.BusinessException;
import com.mnktax.common.exception.ResourceNotFoundException;
import com.mnktax.tax.dto.DeadlineDtos.DeadlineDto;
import com.mnktax.tax.dto.DeadlineDtos.DeadlineRequest;
import com.mnktax.tax.entity.Deadline;
import com.mnktax.tax.entity.TaxType;
import com.mnktax.tax.repository.DeadlineRepository;
import com.mnktax.tax.repository.TaxTypeRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

@Service
public class DeadlineService {

    private final DeadlineRepository deadlineRepository;
    private final TaxTypeRepository taxTypeRepository;
    private final AuditService auditService;

    public DeadlineService(DeadlineRepository deadlineRepository, TaxTypeRepository taxTypeRepository,
                           AuditService auditService) {
        this.deadlineRepository = deadlineRepository;
        this.taxTypeRepository = taxTypeRepository;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public List<DeadlineDto> list() {
        return deadlineRepository.findAllByOrderByDeclarationDeadlineAsc().stream()
                .map(DeadlineDto::from)
                .toList();
    }

    @Transactional
    public DeadlineDto create(DeadlineRequest request, HttpServletRequest http) {
        TaxType taxType = taxTypeRepository.findByCode(request.taxTypeCode())
                .orElseThrow(() -> new ResourceNotFoundException("Type d'impôt", request.taxTypeCode()));
        if (deadlineRepository.findByTaxTypeIdAndPeriod(taxType.getId(), request.period()).isPresent()) {
            throw new BusinessException("DUPLICATE", "Une échéance existe déjà pour cet impôt et cette période.");
        }
        if (request.paymentDeadline().isBefore(request.declarationDeadline())) {
            throw new BusinessException("VALIDATION_ERROR",
                    "La date limite de paiement doit être postérieure à la date limite de déclaration.");
        }
        Deadline deadline = Deadline.builder()
                .taxType(taxType)
                .period(request.period())
                .declarationDeadline(request.declarationDeadline())
                .paymentDeadline(request.paymentDeadline())
                .createdAt(Instant.now())
                .build();
        Deadline saved = deadlineRepository.save(deadline);
        auditService.record("CREATE", "DEADLINE", String.valueOf(saved.getId()), null, DeadlineDto.from(saved), http);
        return DeadlineDto.from(saved);
    }

    @Transactional(readOnly = true)
    public List<DeadlineDto> upcoming(LocalDate from, int limit) {
        return deadlineRepository.findByDeclarationDeadlineGreaterThanEqualOrderByDeclarationDeadlineAsc(from)
                .stream().limit(limit).map(DeadlineDto::from).toList();
    }
}
