package com.mnktax.taxpayer.controller;

import com.mnktax.auth.security.Permissions;
import com.mnktax.taxpayer.dto.TaxpayerDtos.CreateTaxpayerRequest;
import com.mnktax.taxpayer.dto.TaxpayerDtos.TaxpayerDetailDto;
import com.mnktax.taxpayer.dto.TaxpayerDtos.TaxpayerStatsDto;
import com.mnktax.taxpayer.dto.TaxpayerDtos.TaxpayerSummaryDto;
import com.mnktax.taxpayer.dto.TaxpayerDtos.UpdateTaxpayerRequest;
import com.mnktax.taxpayer.entity.TaxpayerStatus;
import com.mnktax.taxpayer.entity.TaxpayerType;
import com.mnktax.taxpayer.service.TaxpayerService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/taxpayers")
@Tag(name = "Contribuables", description = "Gestion des contribuables et recherche NIF")
public class TaxpayerController {

    private final TaxpayerService taxpayerService;

    public TaxpayerController(TaxpayerService taxpayerService) {
        this.taxpayerService = taxpayerService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('" + Permissions.TAXPAYER_READ + "')")
    @Operation(summary = "Rechercher des contribuables (nom, NIF, activité, centre, statut)")
    public ResponseEntity<Page<TaxpayerSummaryDto>> search(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) TaxpayerType type,
            @RequestParam(required = false) TaxpayerStatus status,
            @RequestParam(required = false) Long taxCenterId,
            @RequestParam(required = false) Long taxRegimeId,
            @RequestParam(required = false) String activityCode,
            @RequestParam(required = false) String taxTypeCode,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(taxpayerService.search(q, type, status, taxCenterId, taxRegimeId,
                activityCode, taxTypeCode, pageable));
    }

    @GetMapping("/stats")
    @PreAuthorize("hasAuthority('" + Permissions.TAXPAYER_READ + "')")
    @Operation(summary = "Statistiques du registre des contribuables")
    public ResponseEntity<TaxpayerStatsDto> stats() {
        return ResponseEntity.ok(taxpayerService.stats());
    }

    @GetMapping("/{id:\\d+}")
    @PreAuthorize("hasAuthority('" + Permissions.TAXPAYER_READ + "')")
    @Operation(summary = "Dossier complet d'un contribuable")
    public ResponseEntity<TaxpayerDetailDto> get(@PathVariable Long id) {
        return ResponseEntity.ok(taxpayerService.get(id));
    }

    @GetMapping("/nif/{nif}")
    @PreAuthorize("hasAuthority('" + Permissions.TAXPAYER_READ + "')")
    @Operation(summary = "Recherche rapide par NIF", description = "Retourne le dossier du contribuable dont le NIF est exactement à 10 chiffres.")
    public ResponseEntity<TaxpayerDetailDto> getByNif(@PathVariable String nif) {
        return ResponseEntity.ok(taxpayerService.getByNif(nif));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('" + Permissions.TAXPAYER_WRITE + "')")
    @Operation(summary = "Créer un contribuable")
    public ResponseEntity<TaxpayerDetailDto> create(@Valid @RequestBody CreateTaxpayerRequest request,
                                                    HttpServletRequest http) {
        return ResponseEntity.ok(taxpayerService.create(request, http));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('" + Permissions.TAXPAYER_WRITE + "')")
    @Operation(summary = "Mettre à jour un contribuable")
    public ResponseEntity<TaxpayerDetailDto> update(@PathVariable Long id,
                                                    @Valid @RequestBody UpdateTaxpayerRequest request,
                                                    HttpServletRequest http) {
        return ResponseEntity.ok(taxpayerService.update(id, request, http));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAuthority('" + Permissions.TAXPAYER_WRITE + "')")
    @Operation(summary = "Changer le statut d'un contribuable")
    public ResponseEntity<Void> changeStatus(@PathVariable Long id, @RequestParam TaxpayerStatus status,
                                             HttpServletRequest http) {
        taxpayerService.changeStatus(id, status, http);
        return ResponseEntity.noContent().build();
    }
}
