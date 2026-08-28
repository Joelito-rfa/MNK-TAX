package com.mnktax.receipt.controller;

import com.mnktax.auth.security.Permissions;
import com.mnktax.receipt.dto.ReceiptDto;
import com.mnktax.receipt.dto.ReceiptStatsDto;
import com.mnktax.receipt.dto.ReceiptVerificationDto;
import com.mnktax.receipt.entity.ReceiptStatus;
import com.mnktax.receipt.service.ReceiptService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
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

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.Map;

@RestController
@RequestMapping("/api/receipts")
@Tag(name = "Quittances", description = "Registre sécurisé des quittances fiscales")
public class ReceiptController {

    private final ReceiptService receiptService;

    public ReceiptController(ReceiptService receiptService) {
        this.receiptService = receiptService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('" + Permissions.RECEIPT_READ + "')")
    @Operation(summary = "Lister / filtrer / rechercher les quittances")
    public ResponseEntity<Page<ReceiptDto>> list(
            @RequestParam(required = false) ReceiptStatus status,
            @RequestParam(required = false) Long taxpayerId,
            @RequestParam(required = false) String taxTypeCode,
            @RequestParam(required = false) String method,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @RequestParam(required = false) String center,
            @RequestParam(required = false) String q,
            @PageableDefault(size = 25) Pageable pageable) {
        Instant from = fromDate != null ? fromDate.atStartOfDay(ZoneOffset.UTC).toInstant() : null;
        Instant to = toDate != null ? toDate.plusDays(1).atStartOfDay(ZoneOffset.UTC).toInstant() : null;
        return ResponseEntity.ok(receiptService.search(status, taxpayerId, taxTypeCode, method, from, to, center, q, pageable));
    }

    @GetMapping("/stats")
    @PreAuthorize("hasAuthority('" + Permissions.RECEIPT_READ + "')")
    @Operation(summary = "Statistiques des quittances")
    public ResponseEntity<ReceiptStatsDto> stats() {
        return ResponseEntity.ok(receiptService.stats());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('" + Permissions.RECEIPT_READ + "')")
    @Operation(summary = "Détail d'une quittance")
    public ResponseEntity<ReceiptDto> get(@PathVariable Long id) {
        return ResponseEntity.ok(receiptService.get(id));
    }

    @GetMapping("/{id}/pdf")
    @PreAuthorize("hasAuthority('" + Permissions.RECEIPT_DOWNLOAD + "')")
    @Operation(summary = "Télécharger la quittance en PDF")
    public ResponseEntity<byte[]> pdf(@PathVariable Long id, HttpServletRequest request) {
        byte[] content = receiptService.pdf(id, request);
        ReceiptDto dto = receiptService.get(id);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=quittance-" + dto.receiptNumber() + ".pdf")
                .contentType(MediaType.APPLICATION_PDF)
                .body(content);
    }

    @PutMapping("/{id}/cancel")
    @PreAuthorize("hasAuthority('" + Permissions.RECEIPT_CANCEL + "')")
    @Operation(summary = "Annuler une quittance",
            description = "Annule une quittance existante. Le motif est obligatoire.")
    public ResponseEntity<ReceiptDto> cancel(@PathVariable Long id,
                                             @RequestBody Map<String, String> body,
                                             HttpServletRequest request) {
        String reason = body.get("reason");
        return ResponseEntity.ok(receiptService.cancel(id, reason, request));
    }

    @PostMapping("/{id}/replace")
    @PreAuthorize("hasAuthority('" + Permissions.RECEIPT_REPLACE + "')")
    @Operation(summary = "Remplacer une quittance",
            description = "Crée une nouvelle quittance et marque l'ancienne comme remplacée.")
    public ResponseEntity<ReceiptDto> replace(@PathVariable Long id,
                                              @RequestBody Map<String, String> body,
                                              HttpServletRequest request) {
        String reason = body.getOrDefault("reason", "Remplacement");
        return ResponseEntity.ok(receiptService.replace(id, reason, request));
    }

    @PutMapping("/{id}/refund")
    @PreAuthorize("hasAuthority('" + Permissions.RECEIPT_REFUND + "')")
    @Operation(summary = "Marquer une quittance comme remboursée")
    public ResponseEntity<ReceiptDto> refund(@PathVariable Long id,
                                             @RequestBody Map<String, String> body,
                                             HttpServletRequest request) {
        String refundRef = body.getOrDefault("refundReference", null);
        return ResponseEntity.ok(receiptService.refund(id, refundRef, request));
    }

    /* ── Vérification publique (sans auth) ── */

    @GetMapping("/verify/{token}")
    @SecurityRequirements
    @Operation(summary = "Vérification publique d'une quittance via token",
            description = "Page publique accessible sans authentification via le QR code.")
    public ResponseEntity<ReceiptVerificationDto> verify(@PathVariable String token) {
        return ResponseEntity.ok(receiptService.verify(token));
    }
}
