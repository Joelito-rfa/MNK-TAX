package com.mnktax.reporting.controller;

import com.mnktax.auth.security.Permissions;
import com.mnktax.debt.dto.DebtDtos.TaxDebtDto;
import com.mnktax.debt.service.DebtService;
import com.mnktax.payment.dto.PaymentDtos.PaymentDto;
import com.mnktax.payment.service.PaymentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/reports")
@Tag(name = "Rapports", description = "Rapports de recouvrement et de paiements")
public class ReportController {

    private final DebtService debtService;
    private final PaymentService paymentService;

    public ReportController(DebtService debtService, PaymentService paymentService) {
        this.debtService = debtService;
        this.paymentService = paymentService;
    }

    @GetMapping("/collection")
    @PreAuthorize("hasAuthority('" + Permissions.REPORT_READ + "')")
    @Operation(summary = "Rapport de recouvrement (créances)")
    public ResponseEntity<Page<TaxDebtDto>> collection(@RequestParam(required = false) String status,
                                                       @RequestParam(required = false) String taxTypeCode,
                                                       @RequestParam(required = false) Long taxpayerId,
                                                       @PageableDefault(size = 50) Pageable pageable) {
        com.mnktax.debt.entity.DebtStatus s = status == null || status.isBlank()
                ? null : com.mnktax.debt.entity.DebtStatus.valueOf(status);
        return ResponseEntity.ok(debtService.search(s, taxTypeCode, null, taxpayerId, false, null, pageable));
    }

    @GetMapping("/payments")
    @PreAuthorize("hasAuthority('" + Permissions.REPORT_READ + "')")
    @Operation(summary = "Rapport des paiements")
    public ResponseEntity<Page<PaymentDto>> payments(
            @RequestParam(required = false) Long taxpayerId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @PageableDefault(size = 50) Pageable pageable) {
        return ResponseEntity.ok(paymentService.search(null, taxpayerId, null, from, to, null, pageable));
    }
}
