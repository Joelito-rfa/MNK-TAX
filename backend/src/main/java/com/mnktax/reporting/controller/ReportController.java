package com.mnktax.reporting.controller;

import com.mnktax.audit.entity.AuditLog;
import com.mnktax.audit.repository.AuditLogRepository;
import com.mnktax.auth.security.Permissions;
import com.mnktax.declaration.dto.DeclarationDtos.DeclarationDto;
import com.mnktax.declaration.repository.DeclarationRepository;
import com.mnktax.debt.dto.DebtDtos.TaxDebtDto;
import com.mnktax.debt.service.DebtService;
import com.mnktax.payment.dto.PaymentDtos.PaymentDto;
import com.mnktax.payment.service.PaymentService;
import com.mnktax.reporting.service.ReportService;
import com.mnktax.reporting.service.ReportService.DebtReportStats;
import com.mnktax.reporting.service.ReportService.DeclarationReportStats;
import com.mnktax.reporting.service.ReportService.ReportStats;
import com.mnktax.taxpayer.dto.TaxpayerDtos.TaxpayerSummaryDto;
import com.mnktax.taxpayer.entity.TaxpayerStatus;
import com.mnktax.taxpayer.repository.TaxpayerRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.time.LocalDate;

@RestController
@RequestMapping("/api/reports")
@Tag(name = "Rapports", description = "Rapports fiscaux et financiers")
public class ReportController {

    private final DebtService debtService;
    private final PaymentService paymentService;
    private final ReportService reportService;
    private final DeclarationRepository declarationRepository;
    private final TaxpayerRepository taxpayerRepository;
    private final AuditLogRepository auditLogRepository;

    public ReportController(DebtService debtService, PaymentService paymentService,
                            ReportService reportService, DeclarationRepository declarationRepository,
                            TaxpayerRepository taxpayerRepository, AuditLogRepository auditLogRepository) {
        this.debtService = debtService;
        this.paymentService = paymentService;
        this.reportService = reportService;
        this.declarationRepository = declarationRepository;
        this.taxpayerRepository = taxpayerRepository;
        this.auditLogRepository = auditLogRepository;
    }

    /* ── Statistiques globales ── */

    @GetMapping("/stats")
    @PreAuthorize("hasAuthority('" + Permissions.REPORT_READ + "')")
    @Operation(summary = "Statistiques globales pour la page rapports")
    public ResponseEntity<ReportStats> stats() {
        return ResponseEntity.ok(reportService.getStats());
    }

    @GetMapping("/stats/declarations")
    @PreAuthorize("hasAuthority('" + Permissions.REPORT_READ + "')")
    @Operation(summary = "Statistiques des déclarations")
    public ResponseEntity<DeclarationReportStats> declarationStats() {
        return ResponseEntity.ok(reportService.getDeclarationStats());
    }

    @GetMapping("/stats/debts")
    @PreAuthorize("hasAuthority('" + Permissions.REPORT_READ + "')")
    @Operation(summary = "Statistiques des créances")
    public ResponseEntity<DebtReportStats> debtStats() {
        return ResponseEntity.ok(reportService.getDebtStats());
    }

    /* ── Rapports de données ── */

    @GetMapping("/collection")
    @PreAuthorize("hasAuthority('" + Permissions.REPORT_READ + "')")
    @Operation(summary = "Rapport de recouvrement (créances)")
    public ResponseEntity<Page<TaxDebtDto>> collection(@RequestParam(required = false) String status,
                                                       @RequestParam(required = false) String taxTypeCode,
                                                       @RequestParam(required = false) Long taxpayerId,
                                                       @PageableDefault(size = 50) Pageable pageable) {
        com.mnktax.debt.entity.DebtStatus s = status == null || status.isBlank()
                ? null : com.mnktax.debt.entity.DebtStatus.valueOf(status);
        return ResponseEntity.ok(debtService.search(s, taxTypeCode, null, taxpayerId,
                null, null, null, false, null, pageable));
    }

    @GetMapping("/payments")
    @PreAuthorize("hasAuthority('" + Permissions.REPORT_READ + "')")
    @Operation(summary = "Rapport des paiements")
    public ResponseEntity<Page<PaymentDto>> payments(
            @RequestParam(required = false) Long taxpayerId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @PageableDefault(size = 50) Pageable pageable) {
        return ResponseEntity.ok(paymentService.search(null, taxpayerId, null, from, to, null, null, null, null, null, pageable));
    }

    @Transactional(readOnly = true)
    @GetMapping("/declarations")
    @PreAuthorize("hasAuthority('" + Permissions.REPORT_READ + "')")
    @Operation(summary = "Rapport des déclarations")
    public ResponseEntity<Page<DeclarationDto>> declarations(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String taxTypeCode,
            @RequestParam(required = false) Long taxpayerId,
            @PageableDefault(size = 50) Pageable pageable) {
        com.mnktax.declaration.entity.DeclarationStatus s = status == null || status.isBlank()
                ? null : com.mnktax.declaration.entity.DeclarationStatus.valueOf(status);
        return ResponseEntity.ok(
                declarationRepository.search(s, taxTypeCode, null, taxpayerId, null, null, null, pageable)
                        .map(DeclarationDto::fromReport));
    }

    @Transactional(readOnly = true)
    @GetMapping("/taxpayers")
    @PreAuthorize("hasAuthority('" + Permissions.REPORT_READ + "')")
    @Operation(summary = "Rapport des contribuables")
    public ResponseEntity<Page<TaxpayerSummaryDto>> taxpayers(
            @RequestParam(required = false) String status,
            @PageableDefault(size = 50) Pageable pageable) {
        TaxpayerStatus s = status == null || status.isBlank()
                ? null : TaxpayerStatus.valueOf(status);
        return ResponseEntity.ok(
                taxpayerRepository.search(null, null, s, null, null, null, null, pageable)
                        .map(TaxpayerSummaryDto::from));
    }

    @GetMapping("/activity")
    @PreAuthorize("hasAuthority('" + Permissions.REPORT_READ + "')")
    @Operation(summary = "Rapport d'activité (journal d'audit)")
    public ResponseEntity<Page<AuditLog>> activity(
            @RequestParam(required = false) String username,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to,
            @PageableDefault(size = 50) Pageable pageable) {
        return ResponseEntity.ok(auditLogRepository.search(
                blankToNull(username), blankToNull(action), null, null, from, to, pageable));
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }
}
