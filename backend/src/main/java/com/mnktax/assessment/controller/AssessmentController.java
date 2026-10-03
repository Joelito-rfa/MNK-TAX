package com.mnktax.assessment.controller;

import com.mnktax.assessment.dto.AssessmentDtos.AdjustRequest;
import com.mnktax.assessment.dto.AssessmentDtos.AssessmentDto;
import com.mnktax.assessment.dto.AssessmentDtos.HistoryDto;
import com.mnktax.assessment.dto.AssessmentDtos.ManualRequest;
import com.mnktax.assessment.dto.AssessmentDtos.SimulateRequest;
import com.mnktax.assessment.dto.AssessmentDtos.SimulationDto;
import com.mnktax.assessment.dto.AssessmentDtos.StatsDto;
import com.mnktax.assessment.repository.AssessmentRepository;
import com.mnktax.assessment.service.AssessmentPdfService;
import com.mnktax.assessment.service.AssessmentService;
import com.mnktax.auth.security.Permissions;
import com.mnktax.common.exception.ResourceNotFoundException;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
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

@RestController
@RequestMapping("/api/assessments")
@Tag(name = "Impositions", description = "Cycle de vie complet des impositions")
public class AssessmentController {

    private final AssessmentService assessmentService;
    private final AssessmentRepository assessmentRepository;
    private final AssessmentPdfService pdfService;

    public AssessmentController(AssessmentService assessmentService,
                                AssessmentRepository assessmentRepository,
                                AssessmentPdfService pdfService) {
        this.assessmentService = assessmentService;
        this.assessmentRepository = assessmentRepository;
        this.pdfService = pdfService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('" + Permissions.ASSESSMENT_READ + "')")
    @Operation(summary = "Lister / filtrer les impositions")
    public ResponseEntity<Page<AssessmentDto>> list(@RequestParam(required = false) Long taxpayerId,
                                                    @RequestParam(required = false) String taxTypeCode,
                                                    @RequestParam(required = false) String period,
                                                    @RequestParam(required = false) String status,
                                                    @RequestParam(required = false) String origin,
                                                    @RequestParam(required = false) String ruleCode,
                                                    @RequestParam(required = false) String q,
                                                    @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(assessmentService.search(taxpayerId, taxTypeCode, period,
                status, origin, ruleCode, q, pageable));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('" + Permissions.ASSESSMENT_READ + "')")
    @Operation(summary = "Détail d'une imposition")
    public ResponseEntity<AssessmentDto> get(@PathVariable Long id) {
        return ResponseEntity.ok(assessmentService.get(id));
    }

    @GetMapping("/{id}/history")
    @PreAuthorize("hasAuthority('" + Permissions.ASSESSMENT_READ + "')")
    @Operation(summary = "Historique d'une imposition")
    public ResponseEntity<List<HistoryDto>> history(@PathVariable Long id) {
        return ResponseEntity.ok(assessmentService.history(id));
    }

    @GetMapping("/stats")
    @PreAuthorize("hasAuthority('" + Permissions.ASSESSMENT_READ + "')")
    @Operation(summary = "Statistiques globales des impositions")
    public ResponseEntity<StatsDto> stats() {
        return ResponseEntity.ok(assessmentService.stats());
    }

    @PostMapping("/simulate")
    @PreAuthorize("hasAuthority('" + Permissions.ASSESSMENT_READ + "')")
    @Operation(summary = "Simuler un calcul sans persistance")
    public ResponseEntity<SimulationDto> simulate(@RequestBody SimulateRequest req) {
        return ResponseEntity.ok(assessmentService.simulate(req));
    }

    @PostMapping("/office")
    @PreAuthorize("hasAuthority('" + Permissions.ASSESSMENT_WRITE + "')")
    @Operation(summary = "Taxation d'office (manuelle, sans déclaration)")
    public ResponseEntity<AssessmentDto> createManual(@RequestBody ManualRequest req,
                                                      HttpServletRequest http) {
        return ResponseEntity.ok(assessmentService.createManual(req, http));
    }

    @PostMapping("/{id}/adjust")
    @PreAuthorize("hasAuthority('" + Permissions.ASSESSMENT_WRITE + "')")
    @Operation(summary = "Ajuster crédit / ajustement (resynchronise la créance)")
    public ResponseEntity<AssessmentDto> adjust(@PathVariable Long id,
                                                @RequestBody AdjustRequest req,
                                                HttpServletRequest http) {
        return ResponseEntity.ok(assessmentService.adjust(id, req, http));
    }

    @PostMapping("/{id}/notify")
    @PreAuthorize("hasAuthority('" + Permissions.ASSESSMENT_WRITE + "')")
    @Operation(summary = "Notifier l'avis d'imposition")
    public ResponseEntity<AssessmentDto> notify(@PathVariable Long id, HttpServletRequest http) {
        return ResponseEntity.ok(assessmentService.notify(id, http));
    }

    @PostMapping("/{id}/cancel")
    @PreAuthorize("hasAuthority('" + Permissions.ASSESSMENT_WRITE + "')")
    @Operation(summary = "Annuler une imposition (annule la créance si impayée)")
    public ResponseEntity<AssessmentDto> cancel(@PathVariable Long id,
                                                @RequestBody(required = false) Map<String, String> body,
                                                HttpServletRequest http) {
        String reason = body != null ? body.get("reason") : null;
        return ResponseEntity.ok(assessmentService.cancel(id, reason, http));
    }

    @GetMapping("/{id}/avis.pdf")
    @PreAuthorize("hasAuthority('" + Permissions.ASSESSMENT_READ + "')")
    @Operation(summary = "Télécharger l'avis d'imposition (PDF)")
    public ResponseEntity<byte[]> avis(@PathVariable Long id) {
        var a = assessmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Imposition", id));
        byte[] pdf = pdfService.generate(a);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"avis-" + a.getReference() + ".pdf\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdf);
    }
}
