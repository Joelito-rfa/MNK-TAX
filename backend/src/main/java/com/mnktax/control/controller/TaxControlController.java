package com.mnktax.control.controller;

import com.mnktax.auth.security.Permissions;
import com.mnktax.control.dto.ControlDtos;
import com.mnktax.control.dto.ControlDtos.ControlDetailDto;
import com.mnktax.control.dto.ControlDtos.TaxControlDto;
import com.mnktax.control.entity.ControlStatus;
import com.mnktax.control.service.TaxControlService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;

@RestController
@RequestMapping("/api/tax-controls")
@Tag(name = "Contrôle fiscal", description = "Contrôles fiscaux, redressements, observations")
public class TaxControlController {

    private final TaxControlService controlService;

    public TaxControlController(TaxControlService controlService) {
        this.controlService = controlService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('" + Permissions.CONTROL_READ + "')")
    @Operation(summary = "Lister / filtrer les contrôles fiscaux")
    public ResponseEntity<Page<TaxControlDto>> list(
            @RequestParam(required = false) ControlStatus status,
            @RequestParam(required = false) Long taxpayerId,
            @RequestParam(required = false) Long agentId,
            @RequestParam(required = false) String q,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(controlService.search(status, taxpayerId, agentId, q, pageable));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('" + Permissions.CONTROL_READ + "')")
    @Operation(summary = "Détail d'un contrôle fiscal")
    public ResponseEntity<ControlDetailDto> get(@PathVariable Long id) {
        return ResponseEntity.ok(controlService.get(id));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('" + Permissions.CONTROL_WRITE + "')")
    @Operation(summary = "Créer un contrôle fiscal")
    public ResponseEntity<TaxControlDto> create(@Valid @RequestBody ControlDtos.CreateControlRequest req,
                                                HttpServletRequest http) {
        return ResponseEntity.ok(controlService.create(req, http));
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasAuthority('" + Permissions.CONTROL_WRITE + "')")
    @Operation(summary = "Mettre à jour un contrôle fiscal")
    public ResponseEntity<TaxControlDto> update(@PathVariable Long id,
                                                @RequestBody ControlDtos.UpdateControlRequest req,
                                                HttpServletRequest http) {
        return ResponseEntity.ok(controlService.update(id, req, http));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('" + Permissions.CONTROL_WRITE + "')")
    @Operation(summary = "Supprimer un contrôle fiscal ouvert")
    public ResponseEntity<Void> delete(@PathVariable Long id, HttpServletRequest http) {
        controlService.delete(id, http);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/close")
    @PreAuthorize("hasAuthority('" + Permissions.CONTROL_WRITE + "')")
    @Operation(summary = "Clôturer un contrôle avec redressement")
    public ResponseEntity<TaxControlDto> closeWithRedressement(
            @PathVariable Long id,
            @RequestParam BigDecimal redressement,
            @RequestParam(required = false) Long debtId,
            HttpServletRequest http) {
        return ResponseEntity.ok(controlService.closeWithRedressement(id, redressement, debtId, http));
    }
}
