package com.mnktax.communication.controller;

import com.mnktax.auth.security.Permissions;
import com.mnktax.communication.dto.CommunicationDtos.CampaignAudiencePreview;
import com.mnktax.communication.dto.CommunicationDtos.CampaignDto;
import com.mnktax.communication.dto.CommunicationDtos.CampaignRequest;
import com.mnktax.communication.dto.CommunicationDtos.CommunicationStatsDto;
import com.mnktax.communication.dto.CommunicationDtos.ComposePreview;
import com.mnktax.communication.dto.CommunicationDtos.ComposeRequest;
import com.mnktax.communication.dto.CommunicationDtos.ComposeResult;
import com.mnktax.communication.dto.CommunicationDtos.DeliveryDto;
import com.mnktax.communication.dto.CommunicationDtos.EventRuleDto;
import com.mnktax.communication.dto.CommunicationDtos.ProvidersStatusDto;
import com.mnktax.communication.dto.CommunicationDtos.SaveTemplateRequest;
import com.mnktax.communication.dto.CommunicationDtos.SentMessageDto;
import com.mnktax.communication.dto.CommunicationDtos.TemplateDto;
import com.mnktax.communication.dto.CommunicationDtos.TemplateRenderRequest;
import com.mnktax.communication.dto.CommunicationDtos.TemplateRenderResult;
import com.mnktax.communication.dto.CommunicationDtos.TestSendRequest;
import com.mnktax.communication.dto.CommunicationDtos.TestSendResult;
import com.mnktax.communication.dto.CommunicationDtos.UpdateEventRuleRequest;
import com.mnktax.communication.service.CommunicationService;
import com.mnktax.message.dto.MessageDtos.MessageDto;
import com.mnktax.message.service.MessageService;
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

import java.util.List;
import java.util.Map;

/**
 * API du centre de communication multicanal.
 * Les contribuable ne voient que leurs propres messages ( MESSAGE_READ) ;
 * les vues AGENT (suivi des envois, campagnes, modèles, fournisseurs)
 * exigent MESSAGE_MANAGE.
 */
@RestController
@RequestMapping("/api/communication")
@Tag(name = "Communication Center", description = "Centre de communication fiscale multicanal")
public class CommunicationController {

    private final CommunicationService communicationService;
    private final MessageService messageService;

    public CommunicationController(CommunicationService communicationService,
                                   MessageService messageService) {
        this.communicationService = communicationService;
        this.messageService = messageService;
    }

    // ─── Composeur ──────────────────────────────────────────────

    @PostMapping("/preview")
    @PreAuthorize("hasAuthority('" + Permissions.MESSAGE_WRITE + "')")
    @Operation(summary = "Résumé avant envoi (destinataires, canaux, avertissements)")
    public ResponseEntity<ComposePreview> preview(@Valid @RequestBody ComposeRequest request) {
        return ResponseEntity.ok(communicationService.preview(request));
    }

    @PostMapping("/send")
    @PreAuthorize("hasAuthority('" + Permissions.MESSAGE_WRITE + "')")
    @Operation(summary = "Composer et envoyer (ou programmer) un message multicanal")
    public ResponseEntity<ComposeResult> send(@Valid @RequestBody ComposeRequest request,
                                              HttpServletRequest http) {
        return ResponseEntity.ok(communicationService.compose(request, http));
    }

    // ─── Suivi des envois (AGENT) ───────────────────────────────

    @GetMapping("/sent")
    @PreAuthorize("hasAuthority('" + Permissions.MESSAGE_MANAGE + "')")
    @Operation(summary = "Messages envoyés du centre de communication (suivi des statuts)")
    public ResponseEntity<Page<SentMessageDto>> sent(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(communicationService.sentMessages(status, search, pageable));
    }

    @GetMapping("/messages/{id}/deliveries")
    @PreAuthorize("hasAuthority('" + Permissions.MESSAGE_MANAGE + "')")
    @Operation(summary = "Livraisons par canal d'un message (statuts réels)")
    public ResponseEntity<List<DeliveryDto>> deliveries(@PathVariable Long id) {
        return ResponseEntity.ok(communicationService.deliveriesOf(id));
    }

    @PostMapping("/messages/{id}/retry")
    @PreAuthorize("hasAuthority('" + Permissions.MESSAGE_MANAGE + "')")
    @Operation(summary = "Relancer un envoi échoué définitivement")
    public ResponseEntity<Void> retry(@PathVariable Long id, HttpServletRequest http) {
        communicationService.retryMessage(id, http);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/messages/{id}/cancel")
    @PreAuthorize("hasAuthority('" + Permissions.MESSAGE_MANAGE + "')")
    @Operation(summary = "Annuler un message programmé avant traitement")
    public ResponseEntity<Void> cancel(@PathVariable Long id, HttpServletRequest http) {
        communicationService.cancelScheduled(id, http);
        return ResponseEntity.noContent().build();
    }

    // ─── Statistiques ───────────────────────────────────────────

    @GetMapping("/stats")
    @PreAuthorize("hasAuthority('" + Permissions.MESSAGE_MANAGE + "')")
    @Operation(summary = "Statistiques du centre de communication")
    public ResponseEntity<CommunicationStatsDto> stats() {
        return ResponseEntity.ok(communicationService.stats());
    }

    @GetMapping("/providers")
    @PreAuthorize("hasAuthority('" + Permissions.MESSAGE_MANAGE + "')")
    @Operation(summary = "Statut des fournisseurs (aucun secret exposé)")
    public ResponseEntity<ProvidersStatusDto> providers() {
        return ResponseEntity.ok(communicationService.providersStatus());
    }

    @PostMapping("/test")
    @PreAuthorize("hasAuthority('" + Permissions.MESSAGE_MANAGE + "')")
    @Operation(summary = "Envoi test réel vers la destination explicitement configurée")
    public ResponseEntity<TestSendResult> testSend(@Valid @RequestBody TestSendRequest request,
                                                   HttpServletRequest http) {
        return ResponseEntity.ok(communicationService.testSend(request, http));
    }

    // ─── Modèles ────────────────────────────────────────────────

    @GetMapping("/templates")
    @PreAuthorize("hasAuthority('" + Permissions.MESSAGE_MANAGE + "')")
    @Operation(summary = "Liste des modèles de messages")
    public ResponseEntity<List<TemplateDto>> templates() {
        return ResponseEntity.ok(communicationService.templates());
    }

    @PostMapping("/templates")
    @PreAuthorize("hasAuthority('" + Permissions.MESSAGE_MANAGE + "')")
    @Operation(summary = "Créer ou modifier un modèle")
    public ResponseEntity<TemplateDto> saveTemplate(@Valid @RequestBody SaveTemplateRequest request,
                                                    HttpServletRequest http) {
        return ResponseEntity.ok(communicationService.saveTemplate(request, http));
    }

    @PostMapping("/templates/render")
    @PreAuthorize("hasAuthority('" + Permissions.MESSAGE_WRITE + "')")
    @Operation(summary = "Prévisualiser un modèle avec variables dans une langue donnée")
    public ResponseEntity<TemplateRenderResult> renderTemplate(
            @Valid @RequestBody TemplateRenderRequest request) {
        return ResponseEntity.ok(communicationService.renderTemplate(request));
    }

    // ─── Campagnes ──────────────────────────────────────────────

    @GetMapping("/campaigns/preview")
    @PreAuthorize("hasAuthority('" + Permissions.MESSAGE_MANAGE + "')")
    @Operation(summary = "Taille d'audience d'une campagne avant création")
    public ResponseEntity<CampaignAudiencePreview> campaignPreview(
            @RequestParam String audience,
            @RequestParam(required = false) String taxTypeCode) {
        return ResponseEntity.ok(communicationService.campaignAudiencePreview(audience, taxTypeCode));
    }

    @PostMapping("/campaigns")
    @PreAuthorize("hasAuthority('" + Permissions.MESSAGE_MANAGE + "')")
    @Operation(summary = "Créer une campagne / diffusion")
    public ResponseEntity<CampaignDto> createCampaign(@Valid @RequestBody CampaignRequest request,
                                                      HttpServletRequest http) {
        return ResponseEntity.ok(communicationService.createCampaign(request, http));
    }

    @GetMapping("/campaigns")
    @PreAuthorize("hasAuthority('" + Permissions.MESSAGE_MANAGE + "')")
    @Operation(summary = "Liste des campagnes")
    public ResponseEntity<Page<CampaignDto>> campaigns(@PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(communicationService.campaigns(pageable));
    }

    // ─── Règles automatiques ────────────────────────────────────

    @GetMapping("/event-rules")
    @PreAuthorize("hasAuthority('" + Permissions.MESSAGE_MANAGE + "')")
    @Operation(summary = "Règles d'automatisation (relances fiscales)")
    public ResponseEntity<List<EventRuleDto>> eventRules() {
        return ResponseEntity.ok(communicationService.eventRules());
    }

    @PostMapping("/event-rules/{id}")
    @PreAuthorize("hasAuthority('" + Permissions.MESSAGE_MANAGE + "')")
    @Operation(summary = "Modifier une règle d'automatisation")
    public ResponseEntity<EventRuleDto> updateEventRule(@PathVariable Long id,
                                                        @Valid @RequestBody UpdateEventRuleRequest request,
                                                        HttpServletRequest http) {
        return ResponseEntity.ok(communicationService.updateEventRule(id, request, http));
    }

    // ─── Contribution côté contribuable (lecture / réponse) ─────

    @GetMapping("/my-messages")
    @PreAuthorize("hasAuthority('" + Permissions.MESSAGE_READ + "')")
    @Operation(summary = "Mes messages (contribuable — ses propres messages uniquement)")
    public ResponseEntity<Page<MessageDto>> myMessages(@PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(messageService.myMessages(null, pageable));
    }

    @PostMapping("/my-messages/{id}/read")
    @PreAuthorize("hasAuthority('" + Permissions.MESSAGE_READ + "')")
    @Operation(summary = "Marquer comme lu (accusé de lecture tracé)")
    public ResponseEntity<Void> markRead(@PathVariable Long id, HttpServletRequest http) {
        messageService.markRead(id, http);
        return ResponseEntity.noContent().build();
    }
}
