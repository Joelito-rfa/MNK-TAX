package com.mnktax.control.service;

import com.mnktax.audit.service.AuditService;
import com.mnktax.auth.entity.User;
import com.mnktax.auth.repository.UserRepository;
import com.mnktax.common.exception.BusinessException;
import com.mnktax.common.exception.ResourceNotFoundException;
import com.mnktax.control.dto.ControlDtos;
import com.mnktax.control.dto.ControlDtos.ControlDetailDto;
import com.mnktax.control.dto.ControlDtos.ControlDocumentDto;
import com.mnktax.control.dto.ControlDtos.TaxControlDto;
import com.mnktax.control.entity.ControlDocument;
import com.mnktax.control.entity.ControlStatus;
import com.mnktax.control.entity.TaxControl;
import com.mnktax.control.repository.ControlDocumentRepository;
import com.mnktax.control.repository.TaxControlRepository;
import com.mnktax.debt.entity.TaxDebt;
import com.mnktax.debt.repository.TaxDebtRepository;
import com.mnktax.taxpayer.entity.Taxpayer;
import com.mnktax.taxpayer.repository.TaxpayerRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

@Service
public class TaxControlService {

    private static final AtomicInteger COUNTER = new AtomicInteger(0);

    private final TaxControlRepository controlRepository;
    private final ControlDocumentRepository documentRepository;
    private final TaxpayerRepository taxpayerRepository;
    private final TaxDebtRepository debtRepository;
    private final UserRepository userRepository;
    private final AuditService auditService;

    public TaxControlService(TaxControlRepository controlRepository,
                             ControlDocumentRepository documentRepository,
                             TaxpayerRepository taxpayerRepository,
                             TaxDebtRepository debtRepository,
                             UserRepository userRepository,
                             AuditService auditService) {
        this.controlRepository = controlRepository;
        this.documentRepository = documentRepository;
        this.taxpayerRepository = taxpayerRepository;
        this.debtRepository = debtRepository;
        this.userRepository = userRepository;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public Page<TaxControlDto> search(ControlStatus status, Long taxpayerId, Long agentId,
                                      String q, Pageable pageable) {
        return controlRepository.search(status, taxpayerId, agentId, q, pageable)
                .map(tc -> TaxControlDto.from(tc, agentName(tc.getAgentId())));
    }

    @Transactional(readOnly = true)
    public ControlDetailDto get(Long id) {
        TaxControl tc = controlRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Contrôle non trouvé : " + id));
        List<ControlDocumentDto> docs = documentRepository.findByControlIdOrderByCreatedAt(id)
                .stream().map(ControlDocumentDto::from).toList();
        return new ControlDetailDto(TaxControlDto.from(tc, agentName(tc.getAgentId())), docs);
    }

    @Transactional
    public TaxControlDto create(ControlDtos.CreateControlRequest req, HttpServletRequest http) {
        Taxpayer tp = taxpayerRepository.findById(req.taxpayerId())
                .orElseThrow(() -> new ResourceNotFoundException("Contribuable non trouvé : " + req.taxpayerId()));

        TaxControl tc = TaxControl.builder()
                .reference(generateReference())
                .taxpayer(tp)
                .agentId(req.agentId())
                .controlType(req.controlType())
                .periodStart(req.periodStart())
                .periodEnd(req.periodEnd())
                .reason(req.reason())
                .status(ControlStatus.OPEN)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
        tc = controlRepository.save(tc);

        if (req.documents() != null) {
            for (ControlDtos.DocumentRequest docReq : req.documents()) {
                documentRepository.save(ControlDocument.builder()
                        .control(tc)
                        .title(docReq.title())
                        .documentType(docReq.documentType())
                        .requested(true)
                        .received(false)
                        .createdAt(Instant.now())
                        .build());
            }
        }

        auditService.record("CREATE", "TAX_CONTROL", tc.getId().toString(), null, tc, http);
        return TaxControlDto.from(tc, agentName(tc.getAgentId()));
    }

    @Transactional
    public TaxControlDto update(Long id, ControlDtos.UpdateControlRequest req, HttpServletRequest http) {
        TaxControl tc = controlRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Contrôle non trouvé : " + id));

        Object old = TaxControlDto.from(tc, null);

        if (req.status() != null) {
            validateTransition(tc.getStatus(), req.status());
            tc.setStatus(req.status());
            if (req.status() == ControlStatus.IN_PROGRESS && tc.getStartedAt() == null) {
                tc.setStartedAt(Instant.now());
            }
            if (req.status() == ControlStatus.CLOSED) {
                tc.setCompletedAt(Instant.now());
            }
        }
        if (req.observations() != null) tc.setObservations(req.observations());
        if (req.anomalies() != null) tc.setAnomalies(req.anomalies());
        if (req.redressement() != null) tc.setRedressement(req.redressement());
        if (req.penaltyAmount() != null) tc.setPenaltyAmount(req.penaltyAmount());
        tc.setUpdatedAt(Instant.now());

        tc = controlRepository.save(tc);
        auditService.record("UPDATE", "TAX_CONTROL", id.toString(), old, tc, http);
        return TaxControlDto.from(tc, agentName(tc.getAgentId()));
    }

    @Transactional
    public TaxControlDto closeWithRedressement(Long id, java.math.BigDecimal redressement,
                                               Long debtId, HttpServletRequest http) {
        TaxControl tc = controlRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Contrôle non trouvé : " + id));

        Object old = TaxControlDto.from(tc, null);

        tc.setStatus(ControlStatus.REDRESSEMENT);
        tc.setRedressement(redressement);
        tc.setCompletedAt(Instant.now());
        tc.setUpdatedAt(Instant.now());

        if (debtId != null) {
            TaxDebt debt = debtRepository.findById(debtId)
                    .orElseThrow(() -> new ResourceNotFoundException("Dette non trouvée : " + debtId));
            tc.setDebt(debt);
        }

        tc = controlRepository.save(tc);
        auditService.record("CLOSE_REDRESSEMENT", "TAX_CONTROL", id.toString(), old, tc, http);
        return TaxControlDto.from(tc, agentName(tc.getAgentId()));
    }

    private String agentName(Long userId) {
        if (userId == null) {
            return null;
        }
        return userRepository.findById(userId).map(User::getUsername).orElse(null);
    }

    private void validateTransition(ControlStatus from, ControlStatus to) {
        boolean valid = switch (from) {
            case OPEN -> to == ControlStatus.IN_PROGRESS;
            case IN_PROGRESS -> to == ControlStatus.ANOMALY_DETECTED || to == ControlStatus.CLOSED;
            case ANOMALY_DETECTED -> to == ControlStatus.REDRESSEMENT || to == ControlStatus.CLOSED;
            case REDRESSEMENT -> to == ControlStatus.CLOSED;
            case CLOSED -> false;
        };
        if (!valid) {
            throw new BusinessException("INVALID_STATUS_TRANSITION",
                    "Transition de " + from + " vers " + to + " non autorisée.");
        }
    }

    private String generateReference() {
        return "CTRL-" + System.currentTimeMillis() + "-" + COUNTER.incrementAndGet();
    }
}
