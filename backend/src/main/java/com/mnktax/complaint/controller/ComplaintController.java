package com.mnktax.complaint.controller;

import com.mnktax.auth.security.Permissions;
import com.mnktax.complaint.dto.ComplaintDtos;
import com.mnktax.complaint.dto.ComplaintDtos.ComplaintDetailDto;
import com.mnktax.complaint.dto.ComplaintDtos.ComplaintDto;
import com.mnktax.complaint.dto.ComplaintDtos.ComplaintResponseDto;
import com.mnktax.complaint.dto.ComplaintDtos.ComplaintStatsDto;
import com.mnktax.complaint.entity.ComplaintStatus;
import com.mnktax.complaint.service.ComplaintService;
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

@RestController
@RequestMapping("/api/complaints")
@Tag(name = "Réclamations", description = "Réclamations des contribuables")
public class ComplaintController {

    private final ComplaintService complaintService;

    public ComplaintController(ComplaintService complaintService) {
        this.complaintService = complaintService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('" + Permissions.COMPLAINT_READ + "')")
    @Operation(summary = "Lister / filtrer les réclamations")
    public ResponseEntity<Page<ComplaintDto>> list(
            @RequestParam(required = false) ComplaintStatus status,
            @RequestParam(required = false) Long taxpayerId,
            @RequestParam(required = false) String contextType,
            @RequestParam(required = false) String q,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(complaintService.search(status, taxpayerId, contextType, q, pageable));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('" + Permissions.COMPLAINT_READ + "')")
    @Operation(summary = "Détail d'une réclamation")
    public ResponseEntity<ComplaintDetailDto> get(@PathVariable Long id) {
        return ResponseEntity.ok(complaintService.get(id));
    }

    @GetMapping("/stats")
    @PreAuthorize("hasAuthority('" + Permissions.COMPLAINT_READ + "')")
    @Operation(summary = "Statistiques des réclamations")
    public ResponseEntity<ComplaintStatsDto> stats() {
        return ResponseEntity.ok(complaintService.stats());
    }

    @PostMapping
    @PreAuthorize("hasAuthority('" + Permissions.COMPLAINT_WRITE + "')")
    @Operation(summary = "Créer une réclamation")
    public ResponseEntity<ComplaintDto> create(@Valid @RequestBody ComplaintDtos.CreateComplaintRequest req,
                                               HttpServletRequest http) {
        return ResponseEntity.ok(complaintService.create(req, http));
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasAuthority('" + Permissions.COMPLAINT_WRITE + "')")
    @Operation(summary = "Mettre à jour une réclamation")
    public ResponseEntity<ComplaintDto> update(@PathVariable Long id,
                                               @RequestBody ComplaintDtos.UpdateComplaintRequest req,
                                               HttpServletRequest http) {
        return ResponseEntity.ok(complaintService.update(id, req, http));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('" + Permissions.COMPLAINT_WRITE + "')")
    @Operation(summary = "Supprimer une réclamation ouverte")
    public ResponseEntity<Void> delete(@PathVariable Long id, HttpServletRequest http) {
        complaintService.delete(id, http);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/responses")
    @PreAuthorize("hasAuthority('" + Permissions.COMPLAINT_WRITE + "')")
    @Operation(summary = "Ajouter une réponse à une réclamation")
    public ResponseEntity<ComplaintResponseDto> addResponse(
            @PathVariable Long id,
            @Valid @RequestBody ComplaintDtos.AddResponseRequest req,
            HttpServletRequest http) {
        return ResponseEntity.ok(complaintService.addResponse(id, req, http));
    }
}
