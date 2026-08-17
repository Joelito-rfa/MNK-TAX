package com.mnktax.payment.controller;

import com.mnktax.auth.security.Permissions;
import com.mnktax.payment.dto.PaymentDtos.CreatePaymentRequest;
import com.mnktax.payment.dto.PaymentDtos.PaymentDto;
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
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/payments")
@Tag(name = "Paiements", description = "Enregistrement et allocation des paiements")
public class PaymentController {

    private final PaymentService paymentService;

    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('" + Permissions.PAYMENT_READ + "')")
    @Operation(summary = "Lister / filtrer les paiements")
    public ResponseEntity<Page<PaymentDto>> list(@RequestParam(required = false) PaymentStatus status,
                                                 @RequestParam(required = false) Long taxpayerId,
                                                 @RequestParam(required = false) String method,
                                                 @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                                                 @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
                                                 @RequestParam(required = false) String q,
                                                 @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(paymentService.search(status, taxpayerId, method, from, to, q, pageable));
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
}
