package com.mnktax.complaint.service;

import com.mnktax.audit.service.AuditService;
import com.mnktax.complaint.dto.ComplaintDtos;
import com.mnktax.complaint.dto.ComplaintDtos.ComplaintDetailDto;
import com.mnktax.complaint.dto.ComplaintDtos.ComplaintDto;
import com.mnktax.complaint.dto.ComplaintDtos.ComplaintResponseDto;
import com.mnktax.complaint.dto.ComplaintDtos.ComplaintStatsDto;
import com.mnktax.complaint.entity.Complaint;
import com.mnktax.complaint.entity.ComplaintResponse;
import com.mnktax.complaint.entity.ComplaintStatus;
import com.mnktax.common.exception.BusinessException;
import com.mnktax.common.exception.ResourceNotFoundException;
import com.mnktax.complaint.repository.ComplaintRepository;
import com.mnktax.complaint.repository.ComplaintResponseRepository;
import com.mnktax.common.util.SecurityUtils;
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
public class ComplaintService {

    private static final AtomicInteger COUNTER = new AtomicInteger(0);

    private final ComplaintRepository complaintRepository;
    private final ComplaintResponseRepository responseRepository;
    private final TaxpayerRepository taxpayerRepository;
    private final AuditService auditService;

    public ComplaintService(ComplaintRepository complaintRepository,
                            ComplaintResponseRepository responseRepository,
                            TaxpayerRepository taxpayerRepository,
                            AuditService auditService) {
        this.complaintRepository = complaintRepository;
        this.responseRepository = responseRepository;
        this.taxpayerRepository = taxpayerRepository;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public Page<ComplaintDto> search(ComplaintStatus status, Long taxpayerId,
                                     String contextType, String q, Pageable pageable) {
        return complaintRepository.search(status, taxpayerId, contextType, q, pageable)
                .map(ComplaintDto::from);
    }

    @Transactional(readOnly = true)
    public ComplaintDetailDto get(Long id) {
        Complaint c = complaintRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Réclamation non trouvée : " + id));
        List<ComplaintResponseDto> responses = responseRepository.findByComplaintIdOrderByCreatedAt(id)
                .stream().map(ComplaintResponseDto::from).toList();
        return new ComplaintDetailDto(ComplaintDto.from(c), responses);
    }

    @Transactional
    public ComplaintDto create(ComplaintDtos.CreateComplaintRequest req, HttpServletRequest http) {
        Taxpayer tp = taxpayerRepository.findById(req.taxpayerId())
                .orElseThrow(() -> new ResourceNotFoundException("Contribuable non trouvé : " + req.taxpayerId()));

        Complaint c = Complaint.builder()
                .reference(generateReference())
                .taxpayer(tp)
                .subject(req.subject())
                .description(req.description())
                .contextType(req.contextType())
                .contextRef(req.contextRef())
                .declarationId(req.declarationId())
                .debtId(req.debtId())
                .paymentId(req.paymentId())
                .controlId(req.controlId())
                .status(ComplaintStatus.OPEN)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
        c = complaintRepository.save(c);
        auditService.record("CREATE", "COMPLAINT", c.getId().toString(), null, c, http);
        return ComplaintDto.from(c);
    }

    @Transactional
    public ComplaintDto update(Long id, ComplaintDtos.UpdateComplaintRequest req, HttpServletRequest http) {
        Complaint c = complaintRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Réclamation non trouvée : " + id));

        Object old = ComplaintDto.from(c);

        if (req.status() != null) {
            validateTransition(c.getStatus(), req.status());
            c.setStatus(req.status());
            if (req.status() == ComplaintStatus.CLOSED) {
                c.setClosedAt(Instant.now());
            }
        }
        if (req.resolution() != null) {
            c.setResolution(req.resolution());
            c.setResolvedAt(Instant.now());
        }
        if (req.assignedTo() != null) c.setAssignedTo(req.assignedTo());
        c.setUpdatedAt(Instant.now());

        c = complaintRepository.save(c);
        auditService.record("UPDATE", "COMPLAINT", id.toString(), old, c, http);
        return ComplaintDto.from(c);
    }

    @Transactional
    public void delete(Long id, HttpServletRequest http) {
        Complaint c = complaintRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Réclamation non trouvée : " + id));

        if (c.getStatus() != ComplaintStatus.OPEN) {
            throw new BusinessException("INVALID_STATUS",
                    "Seule une réclamation ouverte peut être supprimée.");
        }

        ComplaintDto old = ComplaintDto.from(c);
        complaintRepository.delete(c);
        auditService.record("DELETE", "COMPLAINT", id.toString(), old, null, http);
    }

    @Transactional
    public ComplaintResponseDto addResponse(Long complaintId, ComplaintDtos.AddResponseRequest req,
                                            HttpServletRequest http) {
        Complaint c = complaintRepository.findById(complaintId)
                .orElseThrow(() -> new ResourceNotFoundException("Réclamation non trouvée : " + complaintId));

        Long userId = SecurityUtils.currentUserId();
        String username = SecurityUtils.currentUsername();

        ComplaintResponse resp = ComplaintResponse.builder()
                .complaint(c)
                .authorId(userId)
                .authorName(username != null ? username : "Système")
                .content(req.content())
                .createdAt(Instant.now())
                .build();
        resp = responseRepository.save(resp);

        if (c.getStatus() == ComplaintStatus.OPEN) {
            c.setStatus(ComplaintStatus.UNDER_REVIEW);
            c.setUpdatedAt(Instant.now());
            complaintRepository.save(c);
        }

        auditService.record("ADD_RESPONSE", "COMPLAINT", complaintId.toString(), null, resp, http);
        return ComplaintResponseDto.from(resp);
    }

    @Transactional(readOnly = true)
    public ComplaintStatsDto stats() {
        return new ComplaintStatsDto(
                complaintRepository.count(),
                complaintRepository.countByStatus(ComplaintStatus.OPEN),
                complaintRepository.countByStatus(ComplaintStatus.UNDER_REVIEW),
                complaintRepository.countByStatus(ComplaintStatus.ACCEPTED),
                complaintRepository.countByStatus(ComplaintStatus.REJECTED),
                complaintRepository.countByStatus(ComplaintStatus.CLOSED)
        );
    }

    private void validateTransition(ComplaintStatus from, ComplaintStatus to) {
        boolean valid = switch (from) {
            case OPEN -> to == ComplaintStatus.UNDER_REVIEW || to == ComplaintStatus.CLOSED;
            case UNDER_REVIEW -> to == ComplaintStatus.ACCEPTED || to == ComplaintStatus.REJECTED || to == ComplaintStatus.CLOSED;
            case ACCEPTED -> to == ComplaintStatus.CLOSED;
            case REJECTED -> to == ComplaintStatus.CLOSED;
            case CLOSED -> false;
        };
        if (!valid) {
            throw new BusinessException("INVALID_STATUS_TRANSITION",
                    "Transition de " + from + " vers " + to + " non autorisée.");
        }
    }

    private String generateReference() {
        return "REC-" + System.currentTimeMillis() + "-" + COUNTER.incrementAndGet();
    }
}
