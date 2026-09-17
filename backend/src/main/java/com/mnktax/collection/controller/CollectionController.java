package com.mnktax.collection.controller;

import com.mnktax.auth.security.Permissions;
import com.mnktax.collection.dto.CollectionDtos.CollectionActionDto;
import com.mnktax.collection.dto.CollectionDtos.CollectionDebtRowDto;
import com.mnktax.collection.dto.CollectionDtos.CollectionDetailDto;
import com.mnktax.collection.dto.CollectionDtos.CollectionEventDto;
import com.mnktax.collection.dto.CollectionDtos.CollectionHistoryDto;
import com.mnktax.collection.dto.CollectionDtos.CollectionNoticeDto;
import com.mnktax.collection.dto.CollectionDtos.CollectionStatsDto;
import com.mnktax.collection.dto.CollectionDtos.CreateActionRequest;
import com.mnktax.collection.dto.CollectionDtos.CreateDisputeRequest;
import com.mnktax.collection.dto.CollectionDtos.CreateNoticeRequest;
import com.mnktax.collection.dto.CollectionDtos.DisputeDto;
import com.mnktax.collection.dto.CollectionDtos.OverdueSummaryDto;
import com.mnktax.collection.dto.CollectionDtos.RegisterPaymentRequest;
import com.mnktax.collection.dto.CollectionDtos.ResolveDisputeRequest;
import com.mnktax.collection.entity.CollectionActionType;
import com.mnktax.collection.service.CollectionDocumentService;
import com.mnktax.collection.service.CollectionService;
import com.mnktax.debt.entity.DebtCollectionPriority;
import com.mnktax.debt.entity.DebtOrigin;
import com.mnktax.debt.entity.DebtStatus;
import com.mnktax.payment.dto.PaymentDtos.PaymentDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
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

@RestController
@RequestMapping("/api/collection")
@Tag(name = "Recouvrement", description = "Actions de recouvrement, suivi des créances et mises en demeure")
public class CollectionController {

    private final CollectionService collectionService;
    private final CollectionDocumentService documentService;

    public CollectionController(CollectionService collectionService,
                                CollectionDocumentService documentService) {
        this.collectionService = collectionService;
        this.documentService = documentService;
    }

    // ── Collection debts table ───────────────────────────────

    @GetMapping("/debts")
    @PreAuthorize("hasAuthority('" + Permissions.COLLECTION_READ + "')")
    @Operation(summary = "Tableau des créances en recouvrement avec filtres",
            description = """
                    Filtres d'onglets : overdue (solde>0 et échéance dépassée), \
                    inCollection (statut recouvrement ou mise en demeure émise), \
                    hasReminder (relance amiable enregistrée). Les montants et retards \
                    proviennent toujours du backend.
                    """)
    public ResponseEntity<Page<CollectionDebtRowDto>> collectionDebts(
            @RequestParam(required = false) DebtStatus status,
            @RequestParam(required = false) String taxTypeCode,
            @RequestParam(required = false) String period,
            @RequestParam(required = false) DebtOrigin origin,
            @RequestParam(required = false) DebtCollectionPriority priority,
            @RequestParam(defaultValue = "false") boolean overdue,
            @RequestParam(defaultValue = "false") boolean inCollection,
            @RequestParam(defaultValue = "false") boolean hasReminder,
            @RequestParam(required = false) BigDecimal balanceMin,
            @RequestParam(required = false) BigDecimal balanceMax,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dueFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dueTo,
            @RequestParam(required = false) String q,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(collectionService.getCollectionDebts(
                status, taxTypeCode, period, origin, priority, overdue, inCollection, hasReminder,
                balanceMin, balanceMax, dueFrom, dueTo, q, pageable));
    }

    // ── Périodes ─────────────────────────────────────────────

    @GetMapping("/periods")
    @PreAuthorize("hasAuthority('" + Permissions.COLLECTION_READ + "')")
    @Operation(summary = "Périodes disponibles pour le filtre")
    public ResponseEntity<List<String>> periods() {
        return ResponseEntity.ok(collectionService.periods());
    }

    // ── Synthèse « En retard » ───────────────────────────────

    @GetMapping("/overdue-summary")
    @PreAuthorize("hasAuthority('" + Permissions.COLLECTION_READ + "')")
    @Operation(summary = "Synthèse des créances en retard (nombre, montant, retard moyen, plus ancienne)")
    public ResponseEntity<OverdueSummaryDto> overdueSummary(
            @RequestParam(required = false) String taxTypeCode,
            @RequestParam(required = false) String period,
            @RequestParam(required = false) String q) {
        return ResponseEntity.ok(collectionService.overdueSummary(taxTypeCode, period, q));
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
    @Operation(summary = "Statistiques de recouvrement (KPI réels issus des données)")
    public ResponseEntity<CollectionStatsDto> stats() {
        return ResponseEntity.ok(collectionService.stats());
    }

    // ── Actions ──────────────────────────────────────────────

    @GetMapping("/actions")
    @PreAuthorize("hasAuthority('" + Permissions.COLLECTION_READ + "')")
    @Operation(summary = "Lister les actions de recouvrement")
    public ResponseEntity<Page<CollectionActionDto>> actions(
            @RequestParam(required = false) Long debtId,
            @RequestParam(required = false) Long taxpayerId,
            @RequestParam(required = false) CollectionActionType type,
            @RequestParam(required = false) String q,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(collectionService.searchActions(debtId, taxpayerId, type, q, pageable));
    }

    @PostMapping("/actions")
    @PreAuthorize("hasAuthority('" + Permissions.COLLECTION_WRITE + "')")
    @Operation(summary = "Créer une action de recouvrement",
            description = """
                    Une relance amiable (type REMINDER) exige une créance avec un solde \
                    à recouvrer : elle trace un événement REMINDER_CREATED dans le journal \
                    et ne change jamais la phase du dossier. Seule la mise en demeure, \
                    acte formel explicite, fait passer la créance en recouvrement.
                    """)
    public ResponseEntity<CollectionActionDto> createAction(@Valid @RequestBody CreateActionRequest request,
                                                            HttpServletRequest http) {
        return ResponseEntity.ok(collectionService.createAction(request, http));
    }

    // ── Notices (mises en demeure / relances écrites) ────────

    @GetMapping("/notices")
    @PreAuthorize("hasAuthority('" + Permissions.COLLECTION_READ + "')")
    @Operation(summary = "Lister les mises en demeure et courriers émis")
    public ResponseEntity<Page<CollectionNoticeDto>> notices(
            @RequestParam(required = false) Long debtId,
            @RequestParam(required = false) String noticeType,
            @RequestParam(required = false) String q,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(collectionService.searchNotices(debtId, noticeType, q, pageable));
    }

    @PostMapping("/notices")
    @PreAuthorize("hasAuthority('" + Permissions.COLLECTION_WRITE + "')")
    @Operation(summary = "Créer une mise en demeure",
            description = "Un acte formel (MISE_EN_DEMEURE…) fait passer la créance dans la phase recouvrement, via une action explicite de l'agent — aucun délai légal automatique.")
    public ResponseEntity<CollectionNoticeDto> createNotice(@Valid @RequestBody CreateNoticeRequest request,
                                                            HttpServletRequest http) {
        return ResponseEntity.ok(collectionService.createNotice(request, http));
    }

    // ── Historique d'une créance ─────────────────────────────

    @GetMapping("/history/{debtId}")
    @PreAuthorize("hasAuthority('" + Permissions.COLLECTION_READ + "')")
    @Operation(summary = "Historique complet de recouvrement d'une créance")
    public ResponseEntity<CollectionHistoryDto> history(@PathVariable Long debtId) {
        return ResponseEntity.ok(collectionService.history(debtId));
    }

    // ── Journal global (append-only) ─────────────────────────

    @GetMapping("/events")
    @PreAuthorize("hasAuthority('" + Permissions.COLLECTION_READ + "')")
    @Operation(summary = "Journal des événements de recouvrement (append-only, paginé)")
    public ResponseEntity<Page<CollectionEventDto>> events(
            @RequestParam(required = false) Long debtId,
            @RequestParam(required = false) String eventType,
            @RequestParam(required = false) String q,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(collectionService.searchEvents(debtId, eventType, q, pageable));
    }

    // ── Documents (PDF) ──────────────────────────────────────

    @GetMapping("/documents/mise-en-demeure/{debtId}")
    @PreAuthorize("hasAuthority('" + Permissions.COLLECTION_READ + "')")
    @Operation(summary = "Générer la mise en demeure PDF d'une créance",
            description = "Document professionnel basé uniquement sur les données enregistrées — aucun délai ni mention juridique inventé.")
    public ResponseEntity<byte[]> miseEnDemeurePdf(@PathVariable Long debtId) {
        byte[] content = documentService.miseEnDemeure(debtId);
        return ResponseEntity.ok()
                .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=mise-en-demeure-" + debtId + ".pdf")
                .contentType(org.springframework.http.MediaType.APPLICATION_PDF)
                .body(content);
    }

    @GetMapping("/documents/relance/{debtId}")
    @PreAuthorize("hasAuthority('" + Permissions.COLLECTION_READ + "')")
    @Operation(summary = "Générer la lettre de relance PDF d'une créance")
    public ResponseEntity<byte[]> relancePdf(@PathVariable Long debtId) {
        byte[] content = documentService.relance(debtId);
        return ResponseEntity.ok()
                .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=relance-" + debtId + ".pdf")
                .contentType(org.springframework.http.MediaType.APPLICATION_PDF)
                .body(content);
    }

    @GetMapping("/documents/etat-restes")
    @PreAuthorize("hasAuthority('" + Permissions.COLLECTION_READ + "')")
    @Operation(summary = "Générer l'état des restes à recouvrer PDF",
            description = "Respecte les filtres courants (onglet en retard, impôt, période, recherche).")
    public ResponseEntity<byte[]> etatRestesPdf(
            @Parameter(description = "Uniquement les créances en retard") @RequestParam(defaultValue = "false") boolean overdue,
            @RequestParam(required = false) String taxTypeCode,
            @RequestParam(required = false) String period,
            @RequestParam(required = false) String q) {
        byte[] content = documentService.etatDesRestes(overdue, taxTypeCode, period, q);
        return ResponseEntity.ok()
                .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=etat-restes-a-recouvrer.pdf")
                .contentType(org.springframework.http.MediaType.APPLICATION_PDF)
                .body(content);
    }

    // ── Litiges (contentieux) ────────────────────────────────

    @PostMapping("/disputes")
    @PreAuthorize("hasAuthority('" + Permissions.COLLECTION_WRITE + "')")
    @Operation(summary = "Déclarer une créance en litige",
            description = "Le dossier passe en CONTENTIEUX par une action explicite et autorisée de l'agent.")
    public ResponseEntity<DisputeDto> createDispute(@Valid @RequestBody CreateDisputeRequest request,
                                                     HttpServletRequest http) {
        return ResponseEntity.ok(collectionService.createDispute(request, http));
    }

    @GetMapping("/disputes/{id}")
    @PreAuthorize("hasAuthority('" + Permissions.COLLECTION_READ + "')")
    @Operation(summary = "Détail d'un litige")
    public ResponseEntity<DisputeDto> dispute(@PathVariable Long id) {
        return ResponseEntity.ok(collectionService.disputeOf(id));
    }

    @PatchMapping("/disputes/{id}/decision")
    @PreAuthorize("hasAuthority('" + Permissions.COLLECTION_WRITE + "')")
    @Operation(summary = "Rendre une décision sur un litige",
            description = "REJECTED / WITHDRAWN replacent la créance en recouvrement ; SUSTAINED requiert une régularisation explicite (annulation/réduction/clôture) — aucune règle n'est automatique.")
    public ResponseEntity<DisputeDto> resolveDispute(@PathVariable Long id,
                                                     @Valid @RequestBody ResolveDisputeRequest request,
                                                     HttpServletRequest http) {
        return ResponseEntity.ok(collectionService.resolveDispute(id, request, http));
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
