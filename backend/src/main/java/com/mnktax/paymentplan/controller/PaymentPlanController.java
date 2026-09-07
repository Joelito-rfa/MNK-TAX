package com.mnktax.paymentplan.controller;

import com.mnktax.auth.security.Permissions;
import com.mnktax.paymentplan.dto.PaymentPlanDtos.CancelPlanRequest;
import com.mnktax.paymentplan.dto.PaymentPlanDtos.CreatePlanRequest;
import com.mnktax.paymentplan.dto.PaymentPlanDtos.PlanDto;
import com.mnktax.paymentplan.entity.PaymentPlanStatus;
import com.mnktax.paymentplan.service.PaymentPlanService;
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
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/collection/plans")
@Tag(name = "Échéanciers", description = "Plans de paiement / échéanciers du recouvrement amiable")
public class PaymentPlanController {

    private final PaymentPlanService planService;

    public PaymentPlanController(PaymentPlanService planService) {
        this.planService = planService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('" + Permissions.COLLECTION_READ + "')")
    @Operation(summary = "Lister les échéanciers (paginé, filtrable)")
    public ResponseEntity<Page<PlanDto>> list(
            @RequestParam(required = false) PaymentPlanStatus status,
            @RequestParam(required = false) Long debtId,
            @RequestParam(required = false) String q,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(planService.list(status, debtId, q, pageable));
    }

    @GetMapping("/stats")
    @PreAuthorize("hasAuthority('" + Permissions.COLLECTION_READ + "')")
    @Operation(summary = "Synthèse des échéanciers (comptes réels par statut, tranches en retard)")
    public ResponseEntity<com.mnktax.paymentplan.dto.PaymentPlanDtos.PlanStatsDto> stats() {
        return ResponseEntity.ok(planService.stats());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('" + Permissions.COLLECTION_READ + "')")
    @Operation(summary = "Détail d'un échéancier avec ses tranches")
    public ResponseEntity<PlanDto> get(@PathVariable Long id) {
        return ResponseEntity.ok(planService.get(id));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('" + Permissions.COLLECTION_WRITE + "')")
    @Operation(summary = "Créer un échéancier sur une créance",
            description = "Les tranches sont soldées exclusivement par les paiements réels enregistrés sur la créance.")
    public ResponseEntity<PlanDto> create(@Valid @RequestBody CreatePlanRequest request,
                                          HttpServletRequest http) {
        return ResponseEntity.ok(planService.create(request, http));
    }

    @PatchMapping("/{id}/cancel")
    @PreAuthorize("hasAuthority('" + Permissions.COLLECTION_WRITE + "')")
    @Operation(summary = "Annuler un échéancier en cours")
    public ResponseEntity<PlanDto> cancel(@PathVariable Long id,
                                          @RequestBody(required = false) CancelPlanRequest request,
                                          HttpServletRequest http) {
        return ResponseEntity.ok(planService.cancel(id, request, http));
    }
}
