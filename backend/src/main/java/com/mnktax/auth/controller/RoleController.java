package com.mnktax.auth.controller;

import com.mnktax.auth.dto.RoleDto;
import com.mnktax.auth.security.Permissions;
import com.mnktax.auth.service.RoleService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/roles")
@Tag(name = "Rôles", description = "Gestion des rôles et permissions")
public class RoleController {

    private final RoleService roleService;

    public RoleController(RoleService roleService) {
        this.roleService = roleService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('" + Permissions.ROLE_READ + "')")
    @Operation(summary = "Lister les rôles")
    public ResponseEntity<List<RoleDto>> list() {
        return ResponseEntity.ok(roleService.findAll());
    }

    @PutMapping("/{id}/permissions")
    @PreAuthorize("hasAuthority('" + Permissions.ROLE_WRITE + "')")
    @Operation(summary = "Mettre à jour les permissions d'un rôle non système")
    public ResponseEntity<RoleDto> updatePermissions(@PathVariable Long id,
                                                     @RequestBody List<String> permissionCodes,
                                                     HttpServletRequest httpRequest) {
        return ResponseEntity.ok(roleService.updatePermissions(id, permissionCodes, httpRequest));
    }
}
