package com.mnktax.tax.controller;

import com.mnktax.auth.security.Permissions;
import com.mnktax.tax.dto.DeadlineDtos.DeadlineDto;
import com.mnktax.tax.dto.DeadlineDtos.DeadlineRequest;
import com.mnktax.tax.service.DeadlineService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/deadlines")
@Tag(name = "Échéances", description = "Calendrier des échéances fiscales (configurable)")
public class DeadlineController {

    private final DeadlineService deadlineService;

    public DeadlineController(DeadlineService deadlineService) {
        this.deadlineService = deadlineService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('" + Permissions.TAXONOMY_READ + "')")
    @Operation(summary = "Lister les échéances")
    public ResponseEntity<List<DeadlineDto>> list() {
        return ResponseEntity.ok(deadlineService.list());
    }

    @PostMapping
    @PreAuthorize("hasAuthority('" + Permissions.TAXONOMY_WRITE + "')")
    @Operation(summary = "Créer une échéance (date configurable, jamais codée en dur)")
    public ResponseEntity<DeadlineDto> create(@Valid @RequestBody DeadlineRequest request, HttpServletRequest http) {
        return ResponseEntity.ok(deadlineService.create(request, http));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('" + Permissions.TAXONOMY_WRITE + "')")
    @Operation(summary = "Modifier une échéance")
    public ResponseEntity<DeadlineDto> update(@PathVariable Long id,
                                              @Valid @RequestBody DeadlineRequest request,
                                              HttpServletRequest http) {
        return ResponseEntity.ok(deadlineService.update(id, request, http));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('" + Permissions.TAXONOMY_WRITE + "')")
    @Operation(summary = "Supprimer une échéance")
    public ResponseEntity<Void> delete(@PathVariable Long id, HttpServletRequest http) {
        deadlineService.delete(id, http);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/upcoming")
    @PreAuthorize("hasAuthority('" + Permissions.TAXONOMY_READ + "')")
    @Operation(summary = "Prochaines échéances")
    public ResponseEntity<List<DeadlineDto>> upcoming(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) Integer days,
            @RequestParam(defaultValue = "10") int limit) {
        LocalDate startDate = from != null ? from : LocalDate.now();
        int max = (days != null && days > 0) ? days : limit;
        return ResponseEntity.ok(deadlineService.upcoming(startDate, max));
    }
}
