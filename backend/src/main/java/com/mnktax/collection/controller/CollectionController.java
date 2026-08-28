package com.mnktax.collection.controller;

import com.mnktax.auth.security.Permissions;
import com.mnktax.collection.dto.CollectionDtos.CollectionActionDto;
import com.mnktax.collection.dto.CollectionDtos.CollectionDebtRowDto;
import com.mnktax.collection.dto.CollectionDtos.CollectionDetailDto;
import com.mnktax.collection.dto.CollectionDtos.CollectionHistoryDto;
import com.mnktax.collection.dto.CollectionDtos.CollectionNoticeDto;
import com.mnktax.collection.dto.CollectionDtos.CollectionStatsDto;
import com.mnktax.collection.dto.CollectionDtos.CreateActionRequest;
import com.mnktax.collection.dto.CollectionDtos.CreateNoticeRequest;
import com.mnktax.collection.dto.CollectionDtos.RegisterPaymentRequest;
import com.mnktax.collection.entity.CollectionActionType;
import com.mnktax.collection.service.CollectionService;
import com.mnktax.payment.dto.PaymentDtos.PaymentDto;
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
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/collection")
@Tag(name = "Recouvrement", description = "Actions de recouvrement, suivi des créances et mises en demeure")
public class CollectionController {

    private final CollectionService collectionService;

    public CollectionController(CollectionService collectionService) {
        this.collectionService = collectionService;
    }

    // ── Collection debts table ───────────────────────────────

    @GetMapping("/debts")
    @PreAuthorize("hasAuthority('" + Permissions.COLLECTION_READ + "')")
    @Operation(summary = "Tableau des créances en recouvrement avec filtres")
    public ResponseEntity<Page<CollectionDebtRowDto>> collectionDebts(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String taxTypeCode,
            @RequestParam(required = false) String period,
            @RequestParam(required = false) String q,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(collectionService.getCollectionDebts(status, taxTypeCode, period, q, pageable));
    }

    // ── Detail ──────────────────────────────────────────────

    @GetMapping("/detail/{id}")
    @PreAuthorize("hasAuthority('" + Permissions.COLLECTION_READ + "')")
    @Operation(summary = "Détail d'une créance avec infos contribuable et historique")
    public ResponseEntity<CollectionDetailDto> detail(@PathVariable Long id) {
        return ResponseEntity.ok(collectionService.detail(id));
    }

    // ── Statistics ───────────────────────────────────────────

    @GetMapping("/stats")
    @PreAuthorize("hasAuthority('" + Permissions.COLLECTION_READ + "')")
    @Operation(summary = "Statistiques de recouvrement")
    public ResponseEntity<CollectionStatsDto> stats(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String taxTypeCode,
            @RequestParam(required = false) String period,
            @RequestParam(required = false) String q) {
        return ResponseEntity.ok(collectionService.stats(status, taxTypeCode, period, q));
    }

    // ── Actions ──────────────────────────────────────────────

    @GetMapping("/actions")
    @PreAuthorize("hasAuthority('" + Permissions.COLLECTION_READ + "')")
    @Operation(summary = "Lister les actions de recouvrement")
    public ResponseEntity<Page<CollectionActionDto>> actions(
            @RequestParam(required = false) Long debtId,
            @RequestParam(required = false) Long taxpayerId,
            @RequestParam(required = false) CollectionActionType type,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(collectionService.search(debtId, taxpayerId, type, pageable));
    }

    @PostMapping("/actions")
    @PreAuthorize("hasAuthority('" + Permissions.COLLECTION_WRITE + "')")
    @Operation(summary = "Créer une action de recouvrement")
    public ResponseEntity<CollectionActionDto> createAction(@Valid @RequestBody CreateActionRequest request,
                                                            HttpServletRequest http) {
        return ResponseEntity.ok(collectionService.createAction(request, http));
    }

    // ── Notices ──────────────────────────────────────────────

    @PostMapping("/notices")
    @PreAuthorize("hasAuthority('" + Permissions.COLLECTION_WRITE + "')")
    @Operation(summary = "Créer une mise en demeure")
    public ResponseEntity<CollectionNoticeDto> createNotice(@Valid @RequestBody CreateNoticeRequest request,
                                                            HttpServletRequest http) {
        return ResponseEntity.ok(collectionService.createNotice(request, http));
    }

    // ── History ──────────────────────────────────────────────

    @GetMapping("/history/{debtId}")
    @PreAuthorize("hasAuthority('" + Permissions.COLLECTION_READ + "')")
    @Operation(summary = "Historique complet de recouvrement d'une créance")
    public ResponseEntity<CollectionHistoryDto> history(@PathVariable Long debtId) {
        return ResponseEntity.ok(collectionService.history(debtId));
    }

    // ── Payment from collection module ───────────────────────

    @PostMapping("/payment")
    @PreAuthorize("hasAuthority('" + Permissions.COLLECTION_WRITE + "')")
    @Operation(summary = "Enregistrer un paiement depuis le module recouvrement")
    public ResponseEntity<PaymentDto> registerPayment(@Valid @RequestBody RegisterPaymentRequest request,
                                                       HttpServletRequest http) {
        return ResponseEntity.ok(collectionService.registerPayment(request, http));
    }
}
