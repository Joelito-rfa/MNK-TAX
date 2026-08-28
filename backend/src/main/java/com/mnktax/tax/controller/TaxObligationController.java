package com.mnktax.tax.controller;

import com.mnktax.auth.security.Permissions;
import com.mnktax.tax.dto.ObligationDtos.CreateObligationRequest;
import com.mnktax.tax.dto.ObligationDtos.ObligationDto;
import com.mnktax.tax.dto.ObligationDtos.UpdateObligationRequest;
import com.mnktax.tax.service.TaxObligationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/obligations")
@Tag(name = "Obligations fiscales", description = "Obligations fiscales des contribuables")
public class TaxObligationController {

    private final TaxObligationService obligationService;

    public TaxObligationController(TaxObligationService obligationService) {
        this.obligationService = obligationService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('" + Permissions.TAXPAYER_READ + "')")
    @Operation(summary = "Lister les obligations d'un contribuable")
    public ResponseEntity<List<ObligationDto>> listByTaxpayer(@RequestParam Long taxpayerId) {
        return ResponseEntity.ok(obligationService.listByTaxpayer(taxpayerId));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('" + Permissions.TAXPAYER_WRITE + "')")
    @Operation(summary = "Créer une obligation fiscale")
    public ResponseEntity<ObligationDto> create(@Valid @RequestBody CreateObligationRequest request,
                                                HttpServletRequest http) {
        return ResponseEntity.ok(obligationService.create(request, http));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('" + Permissions.TAXPAYER_WRITE + "')")
    @Operation(summary = "Mettre à jour une obligation fiscale")
    public ResponseEntity<ObligationDto> update(@PathVariable Long id,
                                                @Valid @RequestBody UpdateObligationRequest request,
                                                HttpServletRequest http) {
        return ResponseEntity.ok(obligationService.update(id, request, http));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('" + Permissions.TAXPAYER_DELETE + "')")
    @Operation(summary = "Supprimer une obligation fiscale")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        obligationService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/generate")
    @PreAuthorize("hasAuthority('" + Permissions.TAXPAYER_WRITE + "')")
    @Operation(summary = "Auto-générer les obligations depuis le régime du contribuable")
    public ResponseEntity<List<ObligationDto>> generateFromRegime(
            @RequestParam Long taxpayerId,
            @RequestParam Long regimeId,
            HttpServletRequest http) {
        return ResponseEntity.ok(obligationService.generateFromRegime(taxpayerId, regimeId, http));
    }
}
