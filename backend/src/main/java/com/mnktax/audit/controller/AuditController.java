package com.mnktax.audit.controller;

import com.mnktax.audit.entity.AuditLog;
import com.mnktax.audit.repository.AuditLogRepository;
import com.mnktax.auth.security.Permissions;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/audit-logs")
@Tag(name = "Audit", description = "Journalisation des opérations sensibles (lecture réservée)")
public class AuditController {

    private final AuditLogRepository auditLogRepository;

    public AuditController(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('" + Permissions.AUDIT_READ + "')")
    @Operation(summary = "Rechercher dans les logs d'audit")
    public ResponseEntity<Page<AuditLog>> search(
            @RequestParam(required = false) String username,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String entityType,
            @RequestParam(required = false) String entityId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to,
            @PageableDefault(size = 50) Pageable pageable) {
        return ResponseEntity.ok(auditLogRepository.search(
                blankToNull(username), blankToNull(action), blankToNull(entityType),
                blankToNull(entityId), from, to, pageable));
    }

    @GetMapping("/stats")
    @PreAuthorize("hasAuthority('" + Permissions.AUDIT_READ + "')")
    @Operation(summary = "Répartition des actions journalisées")
    public ResponseEntity<List<Map<String, Object>>> stats() {
        List<Map<String, Object>> stats = auditLogRepository.countByAction().stream()
                .map(row -> Map.<String, Object>of("action", row[0], "count", row[1]))
                .toList();
        return ResponseEntity.ok(stats);
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }
}
