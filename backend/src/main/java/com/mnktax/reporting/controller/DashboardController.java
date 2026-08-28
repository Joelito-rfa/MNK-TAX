package com.mnktax.reporting.controller;

import com.mnktax.auth.security.Permissions;
import com.mnktax.reporting.dto.ReportDtos.DashboardSummary;
import com.mnktax.reporting.service.DashboardService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard")
@Tag(name = "Dashboard", description = "Statistiques et indicateurs clés")
public class DashboardController {

    private final DashboardService dashboardService;

    public DashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @GetMapping("/summary")
    @PreAuthorize("hasAuthority('" + Permissions.REPORT_READ + "')")
    @Operation(summary = "Indicateurs clés du dashboard (filtrable par période)")
    public ResponseEntity<DashboardSummary> summary(
            @RequestParam(required = false, defaultValue = "12") int months) {
        return ResponseEntity.ok(dashboardService.summary(months));
    }
}
