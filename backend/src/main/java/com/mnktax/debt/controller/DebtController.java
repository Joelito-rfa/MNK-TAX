package com.mnktax.debt.controller;

import com.mnktax.auth.security.Permissions;
import com.mnktax.debt.dto.DebtDtos.DebtHistoryDto;
import com.mnktax.debt.dto.DebtDtos.DebtStatsDto;
import com.mnktax.debt.dto.DebtDtos.MarkOverdueResult;
import com.mnktax.debt.dto.DebtDtos.TaxDebtDto;
import com.mnktax.debt.entity.DebtCollectionPriority;
import com.mnktax.debt.entity.DebtOrigin;
import com.mnktax.debt.entity.DebtStatus;
import com.mnktax.debt.service.DebtService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
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

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/debts")
@Tag(name = "Créances fiscales", description = "Créances, soldes, impayés et retard")
public class DebtController {

    private final DebtService debtService;

    public DebtController(DebtService debtService) {
        this.debtService = debtService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('" + Permissions.DEBT_READ + "')")
    @Operation(summary = "Lister / filtrer les créances")
    public ResponseEntity<Page<TaxDebtDto>> list(@RequestParam(required = false) DebtStatus status,
                                                 @RequestParam(required = false) String taxTypeCode,
                                                 @RequestParam(required = false) String period,
                                                 @RequestParam(required = false) Long taxpayerId,
                                                 @RequestParam(required = false) DebtOrigin origin,
                                                 @RequestParam(required = false) DebtCollectionPriority priority,
                                                 @RequestParam(required = false) String center,
                                                 @RequestParam(required = false) String q,
                                                 @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(debtService.search(status, taxTypeCode, period, taxpayerId,
                origin, priority, center, false, q, pageable));
    }

    @GetMapping("/overdue")
    @PreAuthorize("hasAuthority('" + Permissions.DEBT_READ + "')")
    @Operation(summary = "Créances en retard (OVERDUE / en recouvrement / échues non payées)")
    public ResponseEntity<Page<TaxDebtDto>> overdue(@RequestParam(required = false) String q,
                                                    @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(debtService.search(null, null, null, null, null, null, null, true, q, pageable));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('" + Permissions.DEBT_READ + "')")
    @Operation(summary = "Détail d'une créance")
    public ResponseEntity<TaxDebtDto> get(@PathVariable Long id) {
        return ResponseEntity.ok(debtService.get(id));
    }

    @GetMapping("/{id}/history")
    @PreAuthorize("hasAuthority('" + Permissions.DEBT_READ + "')")
    @Operation(summary = "Historique d'événements d'une créance")
    public ResponseEntity<List<DebtHistoryDto>> history(@PathVariable Long id) {
        return ResponseEntity.ok(debtService.getHistory(id));
    }

    @GetMapping("/stats")
    @PreAuthorize("hasAuthority('" + Permissions.DEBT_READ + "')")
    @Operation(summary = "Statistiques détaillées des créances")
    public ResponseEntity<DebtStatsDto> stats() {
        return ResponseEntity.ok(debtService.stats());
    }

    @PostMapping("/mark-overdue")
    @PreAuthorize("hasAuthority('" + Permissions.DEBT_WRITE + "')")
    @Operation(summary = "Déclencher la détection manuelle des impayés",
            description = "Passe les créances échues en OVERDUE et applique pénalités/intérêts configurés.")
    public ResponseEntity<MarkOverdueResult> markOverdue(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate asOf) {
        return ResponseEntity.ok(debtService.markOverdue(asOf == null ? LocalDate.now() : asOf));
    }

    @PatchMapping("/{id}/adjustment")
    @PreAuthorize("hasAuthority('" + Permissions.DEBT_WRITE + "')")
    @Operation(summary = "Ajouter un ajustement à une créance")
    public ResponseEntity<Void> adjustment(@PathVariable Long id, @RequestBody AdjustmentRequest request,
                                           HttpServletRequest http) {
        debtService.addAdjustment(id, request.label(), request.amount(), http);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/in-collection")
    @PreAuthorize("hasAuthority('" + Permissions.COLLECTION_WRITE + "')")
    @Operation(summary = "Passer une créance en recouvrement forcé")
    public ResponseEntity<Void> inCollection(@PathVariable Long id) {
        debtService.setInCollection(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/cancel")
    @PreAuthorize("hasAuthority('" + Permissions.DEBT_WRITE + "')")
    @Operation(summary = "Annuler une créance (sans paiement enregistré)")
    public ResponseEntity<Void> cancel(@PathVariable Long id) {
        debtService.cancel(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/suspend")
    @PreAuthorize("hasAuthority('" + Permissions.DEBT_WRITE + "')")
    @Operation(summary = "Suspendre une créance (litige, procédure en cours)")
    public ResponseEntity<Void> suspend(@PathVariable Long id, @RequestBody(required = false) SuspendRequest request) {
        debtService.suspend(id, request != null ? request.reason() : null);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/resume")
    @PreAuthorize("hasAuthority('" + Permissions.DEBT_WRITE + "')")
    @Operation(summary = "Réactiver une créance suspendue")
    public ResponseEntity<Void> resume(@PathVariable Long id) {
        debtService.resume(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/close")
    @PreAuthorize("hasAuthority('" + Permissions.DEBT_WRITE + "')")
    @Operation(summary = "Clôturer une créance (irrécouvrable, régularisée, autre motif)")
    public ResponseEntity<Void> close(@PathVariable Long id, @RequestBody(required = false) CloseRequest request) {
        debtService.close(id, request != null ? request.reason() : null);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/priority")
    @PreAuthorize("hasAuthority('" + Permissions.DEBT_WRITE + "')")
    @Operation(summary = "Modifier la priorité de recouvrement")
    public ResponseEntity<Void> updatePriority(@PathVariable Long id,
                                               @RequestBody PriorityRequest request) {
        debtService.updatePriority(id, request.priority());
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/observations")
    @PreAuthorize("hasAuthority('" + Permissions.DEBT_WRITE + "')")
    @Operation(summary = "Mettre à jour les observations")
    public ResponseEntity<Void> updateObservations(@PathVariable Long id,
                                                   @RequestBody ObservationsRequest request) {
        debtService.updateObservations(id, request.observations());
        return ResponseEntity.noContent().build();
    }

    public record AdjustmentRequest(String label, BigDecimal amount) {
    }

    public record SuspendRequest(String reason) {
    }

    public record CloseRequest(String reason) {
    }

    public record PriorityRequest(DebtCollectionPriority priority) {
    }

    public record ObservationsRequest(String observations) {
    }
}
