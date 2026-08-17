package com.mnktax.assessment.controller;

import com.mnktax.assessment.dto.AssessmentDtos.AssessmentDto;
import com.mnktax.assessment.service.AssessmentService;
import com.mnktax.auth.security.Permissions;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/assessments")
@Tag(name = "Impositions", description = "Impositions générées après validation des déclarations")
public class AssessmentController {

    private final AssessmentService assessmentService;

    public AssessmentController(AssessmentService assessmentService) {
        this.assessmentService = assessmentService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('" + Permissions.ASSESSMENT_READ + "')")
    @Operation(summary = "Lister / filtrer les impositions")
    public ResponseEntity<Page<AssessmentDto>> list(@RequestParam(required = false) Long taxpayerId,
                                                    @RequestParam(required = false) String taxTypeCode,
                                                    @RequestParam(required = false) String period,
                                                    @RequestParam(required = false) String q,
                                                    @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(assessmentService.search(taxpayerId, taxTypeCode, period, q, pageable));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('" + Permissions.ASSESSMENT_READ + "')")
    @Operation(summary = "Détail d'une imposition")
    public ResponseEntity<AssessmentDto> get(@PathVariable Long id) {
        return ResponseEntity.ok(assessmentService.get(id));
    }
}
