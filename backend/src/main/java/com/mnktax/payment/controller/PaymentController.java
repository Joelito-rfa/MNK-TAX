package com.mnktax.payment.controller;

import com.mnktax.auth.security.Permissions;
import com.mnktax.payment.dto.PaymentDtos.AllocationRequest;
import com.mnktax.payment.dto.PaymentDtos.CancelPaymentRequest;
import com.mnktax.payment.dto.PaymentDtos.CreatePaymentRequest;
import com.mnktax.payment.dto.PaymentDtos.PaymentDto;
import com.mnktax.payment.dto.PaymentDtos.PaymentStatsDto;
import com.mnktax.payment.dto.PaymentDtos.ReconcileResult;
import com.mnktax.payment.entity.PaymentStatus;
import com.mnktax.payment.service.PaymentService;
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
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/payments")
@Tag(name = "Paiements", description = "Enregistrement, allocation et gestion des paiements")
public class PaymentController {

    private final PaymentService paymentService;

    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('" + Permissions.PAYMENT_READ + "')")
    @Operation(summary = "Lister / filtrer les paiements")
    public ResponseEntity<Page<PaymentDto>> list(
            @RequestParam(required = false) PaymentStatus status,
            @RequestParam(required = false) Long taxpayerId,
            @RequestParam(required = false) Long debtId,
            @RequestParam(required = false) String taxTypeCode,
            @RequestParam(required = false) String method,
            @RequestParam(required = false) Long declarationId,
            @RequestParam(required = false) String center,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) String q,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(paymentService.search(status, taxpayerId, method, from, to, q,
                debtId, taxTypeCode, declarationId, center, pageable));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('" + Permissions.PAYMENT_READ + "')")
    @Operation(summary = "Détail d'un paiement")
    public ResponseEntity<PaymentDto> get(@PathVariable Long id) {
        return ResponseEntity.ok(paymentService.get(id));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('" + Permissions.PAYMENT_WRITE + "')")
    @Operation(summary = "Enregistrer un paiement",
            description = "Transaction : paiement → allocation (principal/pénalité/intérêt) → mise à jour du solde → quittance → audit.")
    public ResponseEntity<PaymentDto> record(@Valid @RequestBody CreatePaymentRequest request,
                                             HttpServletRequest http) {
        return ResponseEntity.ok(paymentService.record(request, http));
    }

    @PutMapping("/{id}/confirm")
    @PreAuthorize("hasAuthority('" + Permissions.PAYMENT_CONFIRM + "')")
    @Operation(summary = "Confirmer un paiement")
    public ResponseEntity<PaymentDto> confirm(@PathVariable Long id, HttpServletRequest http) {
        return ResponseEntity.ok(paymentService.confirm(id, http));
    }

    @PutMapping("/{id}/allocate")
    @PreAuthorize("hasAuthority('" + Permissions.PAYMENT_ALLOCATE + "')")
    @Operation(summary = "Allouer un paiement sur des créances")
    public ResponseEntity<PaymentDto> allocate(@PathVariable Long id,
                                               @RequestBody List<AllocationRequest> allocations,
                                               HttpServletRequest http) {
        return ResponseEntity.ok(paymentService.allocatePayment(id, allocations, http));
    }

    @PutMapping("/{id}/cancel")
    @PreAuthorize("hasAuthority('" + Permissions.PAYMENT_CANCEL + "')")
    @Operation(summary = "Annuler un paiement")
    public ResponseEntity<PaymentDto> cancel(@PathVariable Long id,
                                             @Valid @RequestBody CancelPaymentRequest request,
                                             HttpServletRequest http) {
        return ResponseEntity.ok(paymentService.cancel(id, request, http));
    }

    @PutMapping("/{id}/reject")
    @PreAuthorize("hasAuthority('" + Permissions.PAYMENT_CANCEL + "')")
    @Operation(summary = "Rejeter un paiement")
    public ResponseEntity<PaymentDto> reject(@PathVariable Long id,
                                             @RequestBody Map<String, String> body,
                                             HttpServletRequest http) {
        return ResponseEntity.ok(paymentService.reject(id, body.get("reason"), http));
    }

    @GetMapping("/stats")
    @PreAuthorize("hasAuthority('" + Permissions.PAYMENT_READ + "')")
    @Operation(summary = "Statistiques des paiements")
    public ResponseEntity<PaymentStatsDto> stats() {
        return ResponseEntity.ok(paymentService.stats());
    }

    @GetMapping("/{id}/reconcile")
    @PreAuthorize("hasAuthority('" + Permissions.PAYMENT_RECONCILE + "')")
    @Operation(summary = "Réconcilier un paiement")
    public ResponseEntity<ReconcileResult> reconcile(@PathVariable Long id) {
        return ResponseEntity.ok(paymentService.reconcile(id));
    }
}
