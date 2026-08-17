package com.mnktax.tax.controller;

import com.mnktax.auth.security.Permissions;
import com.mnktax.tax.dto.TaxDtos.TaxCenterDto;
import com.mnktax.tax.dto.TaxDtos.TaxRegimeDto;
import com.mnktax.tax.dto.TaxDtos.TaxTypeDto;
import com.mnktax.tax.service.ReferenceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api")
@Tag(name = "Référentiels fiscaux", description = "Types d'impôts, régimes et centres fiscaux")
public class ReferenceController {

    private final ReferenceService referenceService;

    public ReferenceController(ReferenceService referenceService) {
        this.referenceService = referenceService;
    }

    @GetMapping("/tax-types")
    @PreAuthorize("hasAuthority('" + Permissions.TAXONOMY_READ + "')")
    @Operation(summary = "Lister les types d'impôts actifs")
    public ResponseEntity<List<TaxTypeDto>> taxTypes() {
        return ResponseEntity.ok(referenceService.listTaxTypes());
    }

    @PostMapping("/tax-types")
    @PreAuthorize("hasAuthority('" + Permissions.TAXONOMY_WRITE + "')")
    @Operation(summary = "Créer un type d'impôt")
    public ResponseEntity<TaxTypeDto> createTaxType(@RequestBody TaxTypeDto request, HttpServletRequest http) {
        return ResponseEntity.ok(referenceService.createTaxType(request, http));
    }

    @PatchMapping("/tax-types/{id}/active")
    @PreAuthorize("hasAuthority('" + Permissions.TAXONOMY_WRITE + "')")
    @Operation(summary = "Activer / désactiver un type d'impôt")
    public ResponseEntity<Void> toggleTaxType(@PathVariable Long id, @RequestParam boolean active,
                                              HttpServletRequest http) {
        referenceService.toggleTaxType(id, active, http);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/tax-regimes")
    @PreAuthorize("hasAuthority('" + Permissions.TAXONOMY_READ + "')")
    @Operation(summary = "Lister les régimes fiscaux")
    public ResponseEntity<List<TaxRegimeDto>> regimes() {
        return ResponseEntity.ok(referenceService.listRegimes());
    }

    @PostMapping("/tax-regimes")
    @PreAuthorize("hasAuthority('" + Permissions.TAXONOMY_WRITE + "')")
    @Operation(summary = "Créer un régime fiscal")
    public ResponseEntity<TaxRegimeDto> createRegime(@RequestBody TaxRegimeDto request, HttpServletRequest http) {
        return ResponseEntity.ok(referenceService.createRegime(request, http));
    }

    @GetMapping("/tax-centers")
    @PreAuthorize("hasAuthority('" + Permissions.TAXONOMY_READ + "')")
    @Operation(summary = "Lister les centres fiscaux")
    public ResponseEntity<List<TaxCenterDto>> centers() {
        return ResponseEntity.ok(referenceService.listCenters());
    }

    @PostMapping("/tax-centers")
    @PreAuthorize("hasAuthority('" + Permissions.TAXONOMY_WRITE + "')")
    @Operation(summary = "Créer un centre fiscal")
    public ResponseEntity<TaxCenterDto> createCenter(@RequestBody TaxCenterDto request, HttpServletRequest http) {
        return ResponseEntity.ok(referenceService.createCenter(request, http));
    }
}
