package com.mnktax.declaration.controller;

import com.mnktax.auth.security.Permissions;
import com.mnktax.declaration.dto.DeclarationDtos.*;
import com.mnktax.declaration.entity.DeclarationStatus;
import com.mnktax.declaration.service.DeclarationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/declarations")
@Tag(name = "Déclarations", description = "Cycle de vie des déclarations fiscales")
public class DeclarationController {

    private final DeclarationService declarationService;

    public DeclarationController(DeclarationService declarationService) {
        this.declarationService = declarationService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('" + Permissions.DECLARATION_READ + "')")
    @Operation(summary = "Lister / filtrer les déclarations")
    public ResponseEntity<Page<DeclarationDto>> list(
            @RequestParam(required = false) DeclarationStatus status,
            @RequestParam(required = false) String taxTypeCode,
            @RequestParam(required = false) String period,
            @RequestParam(required = false) Long taxpayerId,
            @RequestParam(required = false) String exercice,
            @RequestParam(required = false) Boolean rectificative,
            @RequestParam(required = false) String q,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(declarationService.search(status, taxTypeCode, period,
                taxpayerId, exercice, rectificative, q, pageable));
    }

    @GetMapping("/statistics")
    @PreAuthorize("hasAuthority('" + Permissions.DECLARATION_READ + "')")
    @Operation(summary = "Statistiques des déclarations")
    public ResponseEntity<StatisticsDto> statistics(
            @RequestParam(required = false) String period) {
        return ResponseEntity.ok(declarationService.statistics(period));
    }

    @GetMapping("/calendar")
    @PreAuthorize("hasAuthority('" + Permissions.DECLARATION_READ + "')")
    @Operation(summary = "Calendrier fiscal")
    public ResponseEntity<List<CalendarEntryDto>> calendar(
            @RequestParam(defaultValue = "2026") int year) {
        return ResponseEntity.ok(declarationService.calendar(year));
    }

    @GetMapping("/{id:\\d+}")
    @PreAuthorize("hasAuthority('" + Permissions.DECLARATION_READ + "')")
    @Operation(summary = "Détail d'une déclaration")
    public ResponseEntity<DeclarationDto> get(@PathVariable Long id) {
        return ResponseEntity.ok(declarationService.get(id));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('" + Permissions.DECLARATION_WRITE + "')")
    @Operation(summary = "Créer une déclaration (brouillon)")
    public ResponseEntity<DeclarationDto> create(@Valid @RequestBody CreateDeclarationRequest request,
                                                 HttpServletRequest http) {
        return ResponseEntity.ok(declarationService.create(request, http));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('" + Permissions.DECLARATION_WRITE + "')")
    @Operation(summary = "Modifier une déclaration (brouillon uniquement)")
    public ResponseEntity<DeclarationDto> update(@PathVariable Long id,
                                                 @Valid @RequestBody UpdateDeclarationRequest request,
                                                 HttpServletRequest http) {
        return ResponseEntity.ok(declarationService.update(id, request, http));
    }

    @PutMapping("/{id}/submit")
    @PreAuthorize("hasAuthority('" + Permissions.DECLARATION_WRITE + "')")
    @Operation(summary = "Soumettre une déclaration")
    public ResponseEntity<DeclarationDto> submit(@PathVariable Long id, HttpServletRequest http) {
        return ResponseEntity.ok(declarationService.submit(id, http));
    }

    @PutMapping("/{id}/review")
    @PreAuthorize("hasAuthority('" + Permissions.DECLARATION_VALIDATE + "')")
    @Operation(summary = "Passer en contrôle")
    public ResponseEntity<DeclarationDto> review(@PathVariable Long id, HttpServletRequest http) {
        return ResponseEntity.ok(declarationService.startReview(id, http));
    }

    @PutMapping("/{id}/validate")
    @PreAuthorize("hasAuthority('" + Permissions.DECLARATION_VALIDATE + "')")
    @Operation(summary = "Valider une déclaration")
    public ResponseEntity<DeclarationDto> validate(@PathVariable Long id,
                                                   @RequestBody(required = false) ValidateRequest request,
                                                   HttpServletRequest http) {
        return ResponseEntity.ok(declarationService.validate(id, request, http));
    }

    @PutMapping("/{id}/reject")
    @PreAuthorize("hasAuthority('" + Permissions.DECLARATION_VALIDATE + "')")
    @Operation(summary = "Rejeter une déclaration")
    public ResponseEntity<DeclarationDto> reject(@PathVariable Long id,
                                                 @Valid @RequestBody RejectRequest request,
                                                 HttpServletRequest http) {
        return ResponseEntity.ok(declarationService.reject(id, request, http));
    }

    @PutMapping("/{id}/correction")
    @PreAuthorize("hasAuthority('" + Permissions.DECLARATION_WRITE + "')")
    @Operation(summary = "Demander une correction")
    public ResponseEntity<DeclarationDto> requestCorrection(@PathVariable Long id,
                                                            @Valid @RequestBody CorrectionRequest request,
                                                            HttpServletRequest http) {
        return ResponseEntity.ok(declarationService.requestCorrection(id, request, http));
    }

    @PutMapping("/{id}/correct")
    @PreAuthorize("hasAuthority('" + Permissions.DECLARATION_WRITE + "')")
    @Operation(summary = "Appliquer une correction")
    public ResponseEntity<DeclarationDto> correct(@PathVariable Long id,
                                                  @Valid @RequestBody UpdateDeclarationRequest request,
                                                  HttpServletRequest http) {
        return ResponseEntity.ok(declarationService.correct(id, request, http));
    }

    @PostMapping("/{id}/rectificative")
    @PreAuthorize("hasAuthority('" + Permissions.DECLARATION_WRITE + "')")
    @Operation(summary = "Créer une déclaration rectificative")
    public ResponseEntity<DeclarationDto> createRectificative(@PathVariable Long id,
                                                              @Valid @RequestBody RectificativeRequest request,
                                                              HttpServletRequest http) {
        return ResponseEntity.ok(declarationService.createRectificative(id, request, http));
    }

    @PutMapping("/{id}/cancel")
    @PreAuthorize("hasAuthority('" + Permissions.DECLARATION_WRITE + "')")
    @Operation(summary = "Annuler une déclaration")
    public ResponseEntity<DeclarationDto> cancel(@PathVariable Long id, HttpServletRequest http) {
        return ResponseEntity.ok(declarationService.cancel(id, http));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('" + Permissions.DECLARATION_WRITE + "')")
    @Operation(summary = "Supprimer une déclaration (brouillon uniquement)")
    public ResponseEntity<Void> delete(@PathVariable Long id, HttpServletRequest http) {
        declarationService.delete(id, http);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/history")
    @PreAuthorize("hasAuthority('" + Permissions.DECLARATION_READ + "')")
    @Operation(summary = "Historique d'une déclaration")
    public ResponseEntity<List<HistoryDto>> history(@PathVariable Long id) {
        return ResponseEntity.ok(declarationService.history(id));
    }
}
