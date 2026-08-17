package com.mnktax.receipt.controller;

import com.mnktax.auth.security.Permissions;
import com.mnktax.receipt.dto.ReceiptDto;
import com.mnktax.receipt.dto.ReceiptVerificationDto;
import com.mnktax.receipt.service.ReceiptService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/receipts")
@Tag(name = "Quittances", description = "Quittances de paiement, vérification publique et PDF")
public class ReceiptController {

    private final ReceiptService receiptService;

    public ReceiptController(ReceiptService receiptService) {
        this.receiptService = receiptService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('" + Permissions.RECEIPT_READ + "')")
    @Operation(summary = "Lister / filtrer les quittances")
    public ResponseEntity<Page<ReceiptDto>> list(@RequestParam(required = false) Long taxpayerId,
                                                 @RequestParam(required = false) String q,
                                                 @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(receiptService.search(taxpayerId, q, pageable));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('" + Permissions.RECEIPT_READ + "')")
    @Operation(summary = "Détail d'une quittance")
    public ResponseEntity<ReceiptDto> get(@PathVariable Long id) {
        return ResponseEntity.ok(receiptService.get(id));
    }

    @GetMapping("/{id}/pdf")
    @PreAuthorize("hasAuthority('" + Permissions.RECEIPT_READ + "')")
    @Operation(summary = "Télécharger la quittance en PDF")
    public ResponseEntity<byte[]> pdf(@PathVariable Long id) {
        byte[] content = receiptService.pdf(id);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=quittance-" + receiptService.get(id).reference() + ".pdf")
                .contentType(MediaType.APPLICATION_PDF)
                .body(content);
    }

    @GetMapping("/verify/{reference}")
    @SecurityRequirements
    @Operation(summary = "Vérification publique d'une quittance",
            description = "Page publique accessible sans authentification via le QR code.")
    public ResponseEntity<ReceiptVerificationDto> verify(@PathVariable String reference) {
        return ResponseEntity.ok(receiptService.verify(reference));
    }
}
