package com.mnktax.tax.controller;

import com.mnktax.auth.security.Permissions;
import com.mnktax.tax.dto.RuleDtos.CreateRuleRequest;
import com.mnktax.tax.dto.RuleDtos.TaxRuleDto;
import com.mnktax.tax.dto.RuleDtos.TaxRuleVersionDto;
import com.mnktax.tax.service.TaxRuleService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
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

import java.util.List;

@RestController
@RequestMapping("/api/tax-rules")
@Tag(name = "Règles fiscales", description = "Moteur de règles fiscales et versioning")
public class TaxRuleController {

    private final TaxRuleService taxRuleService;

    public TaxRuleController(TaxRuleService taxRuleService) {
        this.taxRuleService = taxRuleService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('" + Permissions.RULE_READ + "')")
    @Operation(summary = "Lister les règles fiscales (filtre optionnel par impôt)")
    public ResponseEntity<List<TaxRuleDto>> list(@RequestParam(required = false) String taxTypeCode) {
        return ResponseEntity.ok(taxRuleService.findAll(taxTypeCode));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('" + Permissions.RULE_READ + "')")
    @Operation(summary = "Détail d'une règle fiscale")
    public ResponseEntity<TaxRuleDto> get(@PathVariable Long id) {
        return ResponseEntity.ok(taxRuleService.get(id));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('" + Permissions.RULE_WRITE + "')")
    @Operation(summary = "Créer une règle fiscale (version 1)")
    public ResponseEntity<TaxRuleDto> create(@Valid @RequestBody CreateRuleRequest request) {
        return ResponseEntity.ok(taxRuleService.create(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('" + Permissions.RULE_WRITE + "')")
    @Operation(summary = "Mettre à jour une règle fiscale (archive l'ancienne version)")
    public ResponseEntity<TaxRuleDto> update(@PathVariable Long id,
                                             @Valid @RequestBody CreateRuleRequest request,
                                             @RequestParam(required = false, defaultValue = "Mise à jour de la règle.")
                                             String reason) {
        return ResponseEntity.ok(taxRuleService.update(id, request, reason));
    }

    @PatchMapping("/{id}/active")
    @PreAuthorize("hasAuthority('" + Permissions.RULE_WRITE + "')")
    @Operation(summary = "Activer / désactiver une règle fiscale")
    public ResponseEntity<Void> setActive(@PathVariable Long id, @RequestParam boolean active,
                                          @RequestParam(required = false, defaultValue = "Changement de statut.")
                                          String reason) {
        taxRuleService.setActive(id, active, reason);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/versions/recent")
    @PreAuthorize("hasAuthority('" + Permissions.RULE_READ + "')")
    @Operation(summary = "Dernières modifications de règles (toutes règles confondues)")
    public ResponseEntity<List<TaxRuleVersionDto>> recentVersions(
            @RequestParam(required = false, defaultValue = "50") int limit) {
        return ResponseEntity.ok(taxRuleService.recentVersions(limit));
    }

    @GetMapping("/{id}/versions")
    @PreAuthorize("hasAuthority('" + Permissions.RULE_READ + "')")
    @Operation(summary = "Historique des versions d'une règle fiscale")
    public ResponseEntity<List<TaxRuleVersionDto>> versions(@PathVariable Long id) {
        return ResponseEntity.ok(taxRuleService.versions(id));
    }
}
