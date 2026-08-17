package com.mnktax.administration.service;

import com.mnktax.administration.entity.SystemParameter;
import com.mnktax.administration.repository.SystemParameterRepository;
import com.mnktax.audit.service.AuditService;
import com.mnktax.common.exception.ResourceNotFoundException;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Service
public class SystemParameterService {

    private final SystemParameterRepository parameterRepository;
    private final AuditService auditService;

    public SystemParameterService(SystemParameterRepository parameterRepository, AuditService auditService) {
        this.parameterRepository = parameterRepository;
        this.auditService = auditService;
    }

    public List<SystemParameter> findAll() {
        return parameterRepository.findAll();
    }

    public Optional<SystemParameter> findByKey(String key) {
        return parameterRepository.findByKey(key);
    }

    @Transactional
    public SystemParameter upsert(String key, String value, String description, String category,
                                  HttpServletRequest http) {
        SystemParameter parameter = parameterRepository.findByKey(key)
                .orElseGet(() -> SystemParameter.builder()
                        .key(key)
                        .updatedAt(Instant.now())
                        .build());
        String old = parameter.getValue();
        parameter.setValue(value);
        if (description != null) {
            parameter.setDescription(description);
        }
        if (category != null) {
            parameter.setCategory(category);
        }
        parameter.setUpdatedAt(Instant.now());
        SystemParameter saved = parameterRepository.save(parameter);
        auditService.record("UPDATE", "SYSTEM_PARAMETER", key, old, value, http);
        return saved;
    }

    public SystemParameter getRequired(Long id) {
        return parameterRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Paramètre système", id));
    }
}
