package com.mnktax.refund.controller;

import com.mnktax.auth.security.Permissions;
import com.mnktax.refund.dto.RefundDtos;
import com.mnktax.refund.dto.RefundDtos.RefundDto;
import com.mnktax.refund.dto.RefundDtos.RefundStatsDto;
import com.mnktax.refund.entity.RefundReason;
import com.mnktax.refund.entity.RefundStatus;
import com.mnktax.refund.service.RefundService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;

@RestController
@RequestMapping("/api/refunds")
@Tag(name = "Remboursements", description = "Demandes de remboursement")
public class RefundController {

    private final RefundService refundService;

    public RefundController(RefundService refundService) {
        this.refundService = refundService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('" + Permissions.REFUND_READ + "')")
    @Operation(summary = "Lister / filtrer les remboursements")
    public ResponseEntity<Page<RefundDto>> list(
            @RequestParam(required = false) RefundStatus status,
            @RequestParam(required = false) RefundReason reason,
            @RequestParam(required = false) Long taxpayerId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @RequestParam(required = false) BigDecimal minAmount,
            @RequestParam(required = false) BigDecimal maxAmount,
            @RequestParam(required = false) String q,
            @PageableDefault(size = 20) Pageable pageable) {
        Instant from = fromDate != null ? fromDate.atStartOfDay(ZoneOffset.UTC).toInstant() : null;
        Instant to = toDate != null ? toDate.plusDays(1).atStartOfDay(ZoneOffset.UTC).toInstant() : null;
        return ResponseEntity.ok(refundService.search(status, reason, taxpayerId, q,
                from, to, minAmount, maxAmount, pageable));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('" + Permissions.REFUND_READ + "')")
    @Operation(summary = "Détail d'un remboursement")
    public ResponseEntity<RefundDto> get(@PathVariable Long id) {
        return ResponseEntity.ok(refundService.get(id));
    }

    @GetMapping("/stats")
    @PreAuthorize("hasAuthority('" + Permissions.REFUND_READ + "')")
    @Operation(summary = "Statistiques des remboursements")
    public ResponseEntity<RefundStatsDto> stats() {
        return ResponseEntity.ok(refundService.stats());
    }

    @PostMapping
    @PreAuthorize("hasAuthority('" + Permissions.REFUND_WRITE + "')")
    @Operation(summary = "Créer une demande de remboursement")
    public ResponseEntity<RefundDto> create(@Valid @RequestBody RefundDtos.CreateRefundRequest req,
                                            HttpServletRequest http) {
        return ResponseEntity.ok(refundService.create(req, http));
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasAuthority('" + Permissions.REFUND_WRITE + "')")
    @Operation(summary = "Modifier un remboursement en attente")
    public ResponseEntity<RefundDto> update(@PathVariable Long id,
                                            @Valid @RequestBody RefundDtos.UpdateRefundRequest req,
                                            HttpServletRequest http) {
        return ResponseEntity.ok(refundService.update(id, req, http));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('" + Permissions.REFUND_WRITE + "')")
    @Operation(summary = "Supprimer un remboursement en attente")
    public ResponseEntity<Void> delete(@PathVariable Long id, HttpServletRequest http) {
        refundService.delete(id, http);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/review")
    @PreAuthorize("hasAuthority('" + Permissions.REFUND_WRITE + "')")
    @Operation(summary = "Examiner / approuver / rejeter un remboursement")
    public ResponseEntity<RefundDto> review(@PathVariable Long id,
                                            @Valid @RequestBody RefundDtos.ReviewRefundRequest req,
                                            HttpServletRequest http) {
        return ResponseEntity.ok(refundService.review(id, req, http));
    }

    @PatchMapping("/{id}/pay")
    @PreAuthorize("hasAuthority('" + Permissions.REFUND_WRITE + "')")
    @Operation(summary = "Enregistrer le paiement d'un remboursement")
    public ResponseEntity<RefundDto> pay(@PathVariable Long id,
                                         @Valid @RequestBody RefundDtos.PayRefundRequest req,
                                         HttpServletRequest http) {
        return ResponseEntity.ok(refundService.pay(id, req, http));
    }
}
