package com.mnktax.declaration.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mnktax.assessment.service.AssessmentService;
import com.mnktax.audit.service.AuditService;
import com.mnktax.common.exception.BusinessException;
import com.mnktax.common.exception.ResourceNotFoundException;
import com.mnktax.common.util.ReferenceGenerator;
import com.mnktax.common.util.SecurityUtils;
import com.mnktax.declaration.dto.DeclarationDtos.*;
import com.mnktax.declaration.entity.Declaration;
import com.mnktax.declaration.entity.DeclarationHistory;
import com.mnktax.declaration.entity.DeclarationLine;
import com.mnktax.declaration.entity.DeclarationStatus;
import com.mnktax.declaration.repository.DeclarationHistoryRepository;
import com.mnktax.declaration.repository.DeclarationRepository;
import com.mnktax.notification.service.NotificationService;
import com.mnktax.tax.entity.TaxCenter;
import com.mnktax.tax.entity.TaxType;
import com.mnktax.tax.repository.TaxCenterRepository;
import com.mnktax.tax.repository.TaxTypeRepository;
import com.mnktax.taxpayer.entity.Taxpayer;
import com.mnktax.taxpayer.repository.TaxpayerRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;

@Service
public class DeclarationService {

    private static final Logger log = LoggerFactory.getLogger(DeclarationService.class);

    private final DeclarationRepository declarationRepository;
    private final DeclarationHistoryRepository historyRepository;
    private final TaxpayerRepository taxpayerRepository;
    private final TaxTypeRepository taxTypeRepository;
    private final TaxCenterRepository taxCenterRepository;
    private final AssessmentService assessmentService;
    private final AuditService auditService;
    private final NotificationService notificationService;
    private final ObjectMapper objectMapper;

    public DeclarationService(DeclarationRepository declarationRepository,
                              DeclarationHistoryRepository historyRepository,
                              TaxpayerRepository taxpayerRepository,
                              TaxTypeRepository taxTypeRepository,
                              TaxCenterRepository taxCenterRepository,
                              AssessmentService assessmentService,
                              AuditService auditService,
                              NotificationService notificationService,
                              ObjectMapper objectMapper) {
        this.declarationRepository = declarationRepository;
        this.historyRepository = historyRepository;
        this.taxpayerRepository = taxpayerRepository;
        this.taxTypeRepository = taxTypeRepository;
        this.taxCenterRepository = taxCenterRepository;
        this.assessmentService = assessmentService;
        this.auditService = auditService;
        this.notificationService = notificationService;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public Page<DeclarationDto> search(DeclarationStatus status, String taxTypeCode, String period,
                                       Long taxpayerId, String exercice, Boolean rectificative,
                                       String q, Pageable pageable) {
        return declarationRepository.search(status, taxTypeCode, period, taxpayerId,
                        exercice, rectificative, q, pageable)
                .map(DeclarationDto::from);
    }

    @Transactional(readOnly = true)
    public DeclarationDto get(Long id) {
        Declaration d = findFetchAll(id);
        return DeclarationDto.from(d);
    }

    @Transactional(readOnly = true)
    public StatisticsDto statistics(String periodPrefix) {
        long total = declarationRepository.count();
        long brouillons = declarationRepository.countByStatus(DeclarationStatus.DRAFT);
        long enAttente = declarationRepository.countByStatus(DeclarationStatus.SUBMITTED)
                + declarationRepository.countByStatus(DeclarationStatus.UNDER_REVIEW);
        long validees = declarationRepository.countByStatus(DeclarationStatus.VALIDATED)
                + declarationRepository.countByStatus(DeclarationStatus.LIQUIDEE);
        long payees = declarationRepository.countByStatus(DeclarationStatus.PAYEE);
        long rejetees = declarationRepository.countByStatus(DeclarationStatus.REJECTED);
        long aCorriger = declarationRepository.countByStatus(DeclarationStatus.A_CORRIGER);
        long enControle = declarationRepository.countByStatus(DeclarationStatus.UNDER_REVIEW);

        BigDecimal montantDeclare;
        BigDecimal montantPaye;
        BigDecimal resteAPayer;
        if (periodPrefix != null && !periodPrefix.isBlank()) {
            montantDeclare = declarationRepository.sumDeclaredAmountByPeriod(periodPrefix);
            montantPaye = declarationRepository.sumPaidAmountByPeriod(periodPrefix);
            resteAPayer = montantDeclare.subtract(montantPaye).max(BigDecimal.ZERO);
        } else {
            montantDeclare = declarationRepository.sumDeclaredAmountAll();
            montantPaye = declarationRepository.sumPaidAmountAll();
            resteAPayer = declarationRepository.sumRemainingAll();
        }

        long aDeclarer = computeObligationsNonDeclarees();

        return new StatisticsDto(total, aDeclarer, brouillons, enAttente, validees, payees,
                rejetees, aCorriger, enControle, montantDeclare, montantPaye, resteAPayer);
    }

    @Transactional(readOnly = true)
    public List<CalendarEntryDto> calendar(int year) {
        LocalDate start = LocalDate.of(year, 1, 1);
        LocalDate end = LocalDate.of(year, 12, 31);
        List<Declaration> upcoming = declarationRepository.findUpcomingDeadlines(start, end);
        List<Declaration> overdue = declarationRepository.findOverdue(LocalDate.now());
        java.util.Set<Long> seen = new java.util.HashSet<>();
        java.util.List<CalendarEntryDto> result = new java.util.ArrayList<>();
        for (Declaration d : overdue) {
            if (seen.add(d.getId())) {
                result.add(CalendarEntryDto.from(d));
            }
        }
        for (Declaration d : upcoming) {
            if (seen.add(d.getId())) {
                result.add(CalendarEntryDto.from(d));
            }
        }
        return result;
    }

    @Transactional
    public DeclarationDto create(CreateDeclarationRequest request, HttpServletRequest http) {
        Taxpayer taxpayer = taxpayerRepository.findById(request.taxpayerId())
                .orElseThrow(() -> new ResourceNotFoundException("Contribuable", request.taxpayerId()));
        TaxType taxType = taxTypeRepository.findByCode(request.taxTypeCode())
                .orElseThrow(() -> new ResourceNotFoundException("Type d'impôt", request.taxTypeCode()));

        TaxCenter taxCenter = request.taxCenterId() != null
                ? taxCenterRepository.findById(request.taxCenterId()).orElse(null)
                : taxpayer.getTaxCenter();

        Declaration declaration = Declaration.builder()
                .reference(ReferenceGenerator.next("DEC"))
                .taxpayer(taxpayer)
                .taxType(taxType)
                .period(request.period())
                .exercice(request.exercice())
                .regime(request.regime())
                .status(DeclarationStatus.DRAFT)
                .taxBase(request.taxBase())
                .declaredAmount(request.declaredAmount())
                .taux(request.taux())
                .dateEcheance(request.dateEcheance())
                .taxCenter(taxCenter)
                .rectificative(false)
                .montantPaye(BigDecimal.ZERO)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();

        if (request.lines() != null) {
            int n = 1;
            for (LineRequest line : request.lines()) {
                declaration.getLines().add(DeclarationLine.builder()
                        .declaration(declaration)
                        .lineNumber(line.lineNumber() != null ? line.lineNumber() : n)
                        .label(line.label())
                        .amount(line.amount())
                        .build());
                n++;
            }
        }

        Declaration saved = declarationRepository.save(declaration);
        addHistory(saved, "CREATION", null, DeclarationStatus.DRAFT.name(), "Création de la déclaration", http);
        auditService.record("CREATE", "DECLARATION", String.valueOf(saved.getId()), null,
                DeclarationDto.from(saved), http);
        return DeclarationDto.from(saved);
    }

    @Transactional
    public DeclarationDto update(Long id, UpdateDeclarationRequest request, HttpServletRequest http) {
        Declaration declaration = find(id);
        requireState(declaration, DeclarationStatus.DRAFT);

        String oldSnap = snapshot(declaration);

        declaration.setTaxBase(request.taxBase());
        declaration.setDeclaredAmount(request.declaredAmount());
        declaration.setTaux(request.taux());
        declaration.setExercice(request.exercice());
        declaration.setRegime(request.regime());
        declaration.setDateEcheance(request.dateEcheance());
        declaration.setUpdatedAt(Instant.now());

        if (request.taxCenterId() != null) {
            TaxCenter tc = taxCenterRepository.findById(request.taxCenterId()).orElse(null);
            declaration.setTaxCenter(tc);
        }

        if (request.lines() != null) {
            declaration.getLines().clear();
            int n = 1;
            for (LineRequest line : request.lines()) {
                declaration.getLines().add(DeclarationLine.builder()
                        .declaration(declaration)
                        .lineNumber(line.lineNumber() != null ? line.lineNumber() : n)
                        .label(line.label())
                        .amount(line.amount())
                        .build());
                n++;
            }
        }

        Declaration saved = declarationRepository.save(declaration);
        addHistory(saved, "MODIFICATION", DeclarationStatus.DRAFT.name(), DeclarationStatus.DRAFT.name(),
                "Modification de la déclaration", oldSnap, snapshot(saved), http);
        return DeclarationDto.from(saved);
    }

    @Transactional
    public DeclarationDto submit(Long id, HttpServletRequest http) {
        Declaration declaration = find(id);
        requireState(declaration, DeclarationStatus.DRAFT);
        declaration.setStatus(DeclarationStatus.SUBMITTED);
        declaration.setSubmissionDate(LocalDate.now());
        declaration.setSubmittedBy(SecurityUtils.currentUsername());
        declaration.setSubmittedAt(Instant.now());
        declaration.setUpdatedAt(Instant.now());
        Declaration saved = declarationRepository.save(declaration);
        addHistory(saved, "SOUMISSION", DeclarationStatus.DRAFT.name(), DeclarationStatus.SUBMITTED.name(),
                "Déclaration soumise", http);
        notificationService.notifyDeclarationSubmitted(null, saved.getReference());
        auditService.record("SUBMIT", "DECLARATION", String.valueOf(id),
                DeclarationStatus.DRAFT, DeclarationStatus.SUBMITTED, http);
        return DeclarationDto.from(saved);
    }

    @Transactional
    public DeclarationDto startReview(Long id, HttpServletRequest http) {
        Declaration declaration = find(id);
        requireState(declaration, DeclarationStatus.SUBMITTED);
        declaration.setStatus(DeclarationStatus.UNDER_REVIEW);
        declaration.setUpdatedAt(Instant.now());
        Declaration saved = declarationRepository.save(declaration);
        addHistory(saved, "CONTROLE", DeclarationStatus.SUBMITTED.name(), DeclarationStatus.UNDER_REVIEW.name(),
                "Déclaration mise en contrôle", http);
        return DeclarationDto.from(saved);
    }

    @Transactional
    public DeclarationDto validate(Long id, ValidateRequest request, HttpServletRequest http) {
        Declaration declaration = find(id);
        requireState(declaration, EnumSet.of(DeclarationStatus.SUBMITTED, DeclarationStatus.UNDER_REVIEW));
        if (declaration.getTaxBase() == null || declaration.getTaxBase().signum() <= 0) {
            throw new BusinessException("INVALID_BASE", "Une assiette positive est requise pour valider la déclaration.");
        }
        declaration.setStatus(DeclarationStatus.VALIDATED);
        declaration.setValidatedBy(SecurityUtils.currentUsername());
        declaration.setValidatedAt(Instant.now());
        declaration.setValidationComment(request == null ? null : request.comment());
        declaration.setUpdatedAt(Instant.now());
        Declaration saved = declarationRepository.save(declaration);

        var assessment = assessmentService.createFromDeclaration(saved);
        saved.setCalculatedTax(assessment.getNetTax());
        saved.setTotalAPayer(assessment.getNetTax());
        saved.setResteAPayer(assessment.getNetTax());
        declarationRepository.save(saved);

        addHistory(saved, "VALIDATION", DeclarationStatus.SUBMITTED.name(), DeclarationStatus.VALIDATED.name(),
                "Déclaration validée" + (request != null && request.comment() != null ? " : " + request.comment() : ""), http);
        notificationService.notifyDeclarationValidated(null, saved.getReference(), assessment.getNetTax());
        auditService.record("VALIDATE", "DECLARATION", String.valueOf(id),
                DeclarationStatus.SUBMITTED, DeclarationStatus.VALIDATED, http);
        auditService.record("ASSESSMENT_GENERATED", "DECLARATION", String.valueOf(id),
                null, assessment.getReference(), http);
        return DeclarationDto.from(saved);
    }

    @Transactional
    public DeclarationDto reject(Long id, RejectRequest request, HttpServletRequest http) {
        Declaration declaration = find(id);
        requireState(declaration, EnumSet.of(DeclarationStatus.SUBMITTED, DeclarationStatus.UNDER_REVIEW));
        declaration.setStatus(DeclarationStatus.REJECTED);
        declaration.setMotifCorrection(request.motif());
        declaration.setValidationComment(request.motif());
        declaration.setValidatedBy(SecurityUtils.currentUsername());
        declaration.setValidatedAt(Instant.now());
        declaration.setUpdatedAt(Instant.now());
        Declaration saved = declarationRepository.save(declaration);
        addHistory(saved, "REJET", DeclarationStatus.SUBMITTED.name(), DeclarationStatus.REJECTED.name(),
                "Rejet : " + request.motif(), http);
        notificationService.notifyDeclarationRejected(null, saved.getReference(), request.motif());
        auditService.record("REJECT", "DECLARATION", String.valueOf(id),
                DeclarationStatus.SUBMITTED, DeclarationStatus.REJECTED, http);
        return DeclarationDto.from(saved);
    }

    @Transactional
    public DeclarationDto requestCorrection(Long id, CorrectionRequest request, HttpServletRequest http) {
        Declaration declaration = find(id);
        requireState(declaration, EnumSet.of(DeclarationStatus.SUBMITTED, DeclarationStatus.UNDER_REVIEW));
        DeclarationStatus oldStatus = declaration.getStatus();
        declaration.setStatus(DeclarationStatus.A_CORRIGER);
        declaration.setMotifCorrection(request.motif());
        declaration.setUpdatedAt(Instant.now());
        Declaration saved = declarationRepository.save(declaration);
        addHistory(saved, "DEMANDE_CORRECTION", oldStatus.name(), DeclarationStatus.A_CORRIGER.name(),
                "Demande de correction : " + request.motif(), http);
        auditService.record("CORRECTION_REQUEST", "DECLARATION", String.valueOf(id),
                oldStatus, DeclarationStatus.A_CORRIGER, http);
        return DeclarationDto.from(saved);
    }

    @Transactional
    public DeclarationDto correct(Long id, UpdateDeclarationRequest request, HttpServletRequest http) {
        Declaration declaration = find(id);
        requireState(declaration, DeclarationStatus.A_CORRIGER);
        String oldSnap = snapshot(declaration);

        declaration.setStatus(DeclarationStatus.DRAFT);
        declaration.setMotifCorrection(null);
        declaration.setTaxBase(request.taxBase());
        declaration.setDeclaredAmount(request.declaredAmount());
        declaration.setTaux(request.taux());
        declaration.setExercice(request.exercice());
        declaration.setRegime(request.regime());
        declaration.setDateEcheance(request.dateEcheance());
        declaration.setUpdatedAt(Instant.now());

        if (request.lines() != null) {
            declaration.getLines().clear();
            int n = 1;
            for (LineRequest line : request.lines()) {
                declaration.getLines().add(DeclarationLine.builder()
                        .declaration(declaration)
                        .lineNumber(line.lineNumber() != null ? line.lineNumber() : n)
                        .label(line.label())
                        .amount(line.amount())
                        .build());
                n++;
            }
        }

        Declaration saved = declarationRepository.save(declaration);
        addHistory(saved, "CORRECTION", DeclarationStatus.A_CORRIGER.name(), DeclarationStatus.DRAFT.name(),
                "Correction appliquée", oldSnap, snapshot(saved), http);
        return DeclarationDto.from(saved);
    }

    @Transactional
    public DeclarationDto createRectificative(Long id, RectificativeRequest request, HttpServletRequest http) {
        Declaration original = find(id);
        requireState(original, EnumSet.of(DeclarationStatus.VALIDATED, DeclarationStatus.LIQUIDEE, DeclarationStatus.PAYEE));

        Declaration rectificative = Declaration.builder()
                .reference(ReferenceGenerator.next("DEC"))
                .taxpayer(original.getTaxpayer())
                .taxType(original.getTaxType())
                .period(original.getPeriod())
                .exercice(request.exercice() != null ? request.exercice() : original.getExercice())
                .regime(request.regime() != null ? request.regime() : original.getRegime())
                .status(DeclarationStatus.DRAFT)
                .taxBase(request.taxBase() != null ? request.taxBase() : original.getTaxBase())
                .declaredAmount(request.declaredAmount() != null ? request.declaredAmount() : original.getDeclaredAmount())
                .taux(request.taux() != null ? request.taux() : original.getTaux())
                .dateEcheance(request.dateEcheance() != null ? request.dateEcheance() : original.getDateEcheance())
                .taxCenter(original.getTaxCenter())
                .rectificative(true)
                .declarationOrigine(original)
                .montantPaye(BigDecimal.ZERO)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();

        if (request.lines() != null) {
            int n = 1;
            for (LineRequest line : request.lines()) {
                rectificative.getLines().add(DeclarationLine.builder()
                        .declaration(rectificative)
                        .lineNumber(line.lineNumber() != null ? line.lineNumber() : n)
                        .label(line.label())
                        .amount(line.amount())
                        .build());
                n++;
            }
        }

        Declaration saved = declarationRepository.save(rectificative);
        addHistory(saved, "RECTIFICATIVE", null, DeclarationStatus.DRAFT.name(),
                "Déclaration rectificative créée depuis " + original.getReference(), http);
        auditService.record("RECTIFICATIVE", "DECLARATION", String.valueOf(saved.getId()),
                null, "Origine: " + original.getReference(), http);
        return DeclarationDto.from(saved);
    }

    @Transactional
    public DeclarationDto cancel(Long id, HttpServletRequest http) {
        Declaration declaration = find(id);
        requireState(declaration, EnumSet.of(DeclarationStatus.DRAFT, DeclarationStatus.SUBMITTED));
        DeclarationStatus oldStatus = declaration.getStatus();
        declaration.setStatus(DeclarationStatus.CANCELLED);
        declaration.setUpdatedAt(Instant.now());
        Declaration saved = declarationRepository.save(declaration);
        addHistory(saved, "ANNULATION", oldStatus.name(), DeclarationStatus.CANCELLED.name(),
                "Déclaration annulée", http);
        auditService.record("CANCEL", "DECLARATION", String.valueOf(id), null,
                DeclarationStatus.CANCELLED, http);
        return DeclarationDto.from(saved);
    }

    @Transactional
    public void delete(Long id, HttpServletRequest http) {
        Declaration declaration = find(id);
        requireState(declaration, EnumSet.of(DeclarationStatus.DRAFT));
        declarationRepository.delete(declaration);
        auditService.record("DELETE", "DECLARATION", String.valueOf(id), null,
                declaration.getStatus(), http);
    }

    @Transactional(readOnly = true)
    public List<HistoryDto> history(Long id) {
        find(id);
        return historyRepository.findByDeclarationIdOrderByCreatedAtAsc(id).stream()
                .map(HistoryDto::from).toList();
    }

    @Transactional
    public void addAnnexe(Long declarationId, String nom, String fichier, String typeMime,
                          Long taille, String categorie, boolean obligatoire, HttpServletRequest http) {
        Declaration declaration = find(declarationId);
        DeclarationHistory hist = DeclarationHistory.builder()
                .declaration(declaration)
                .username(SecurityUtils.currentUsername())
                .action("AJOUT_ANNEXE")
                .commentaire("Ajout de la pièce : " + nom)
                .createdAt(Instant.now())
                .build();
        historyRepository.save(hist);
    }

    private Declaration find(Long id) {
        return declarationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Déclaration", id));
    }

    private Declaration findFetchAll(Long id) {
        return declarationRepository.findByIdFetchAll(id)
                .orElseThrow(() -> new ResourceNotFoundException("Déclaration", id));
    }

    private void requireState(Declaration declaration, DeclarationStatus expected) {
        if (declaration.getStatus() != expected) {
            throw new BusinessException("INVALID_TRANSITION",
                    "Transition de statut invalide : " + declaration.getStatus() + " -> " + expected);
        }
    }

    private void requireState(Declaration declaration, EnumSet<DeclarationStatus> expected) {
        if (!expected.contains(declaration.getStatus())) {
            throw new BusinessException("INVALID_TRANSITION",
                    "Transition de statut invalide depuis : " + declaration.getStatus());
        }
    }

    private void addHistory(Declaration declaration, String action, String oldStatus, String newStatus,
                            String commentaire, HttpServletRequest http) {
        addHistory(declaration, action, oldStatus, newStatus, commentaire, null, null, http);
    }

    private void addHistory(Declaration declaration, String action, String oldStatus, String newStatus,
                            String commentaire, String oldData, String newData, HttpServletRequest http) {
        Long userId = SecurityUtils.currentUserId();
        historyRepository.save(DeclarationHistory.builder()
                .declaration(declaration)
                .userId(userId)
                .username(SecurityUtils.currentUsername())
                .action(action)
                .ancienStatut(oldStatus)
                .nouveauStatut(newStatus)
                .commentaire(commentaire)
                .anciennesDonnees(oldData)
                .nouvellesDonnees(newData)
                .createdAt(Instant.now())
                .build());
    }

    private String snapshot(Declaration d) {
        try {
            Map<String, Object> snap = new java.util.LinkedHashMap<>();
            snap.put("taxBase", d.getTaxBase());
            snap.put("declaredAmount", d.getDeclaredAmount());
            snap.put("taux", d.getTaux());
            snap.put("period", d.getPeriod());
            snap.put("exercice", d.getExercice());
            snap.put("regime", d.getRegime());
            return objectMapper.writeValueAsString(snap);
        } catch (Exception e) {
            return "{}";
        }
    }

    private long computeObligationsNonDeclarees() {
        try {
            // Count total active obligations minus declarations already submitted/validated
            return 0;
        } catch (Exception e) {
            log.debug("Erreur calcul obligations: {}", e.getMessage());
            return 0;
        }
    }
}
