package com.mnktax.administration.controller;

import com.mnktax.administration.entity.SystemParameter;
import com.mnktax.administration.service.SystemParameterService;
import com.mnktax.auth.security.Permissions;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/parameters")
@Tag(name = "Paramètres système", description = "Configuration de l'application (réservé aux administrateurs)")
public class SystemParameterController {

    private final SystemParameterService parameterService;

    public SystemParameterController(SystemParameterService parameterService) {
        this.parameterService = parameterService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('" + Permissions.PARAMETER_READ + "')")
    @Operation(summary = "Lister les paramètres")
    public ResponseEntity<List<SystemParameter>> list() {
        return ResponseEntity.ok(parameterService.findAll());
    }

    @PutMapping
    @PreAuthorize("hasAuthority('" + Permissions.PARAMETER_WRITE + "')")
    @Operation(summary = "Créer ou mettre à jour un paramètre")
    public ResponseEntity<SystemParameter> upsert(@RequestBody ParameterRequest request,
                                                  HttpServletRequest http) {
        return ResponseEntity.ok(parameterService.upsert(request.key(), request.value(),
                request.description(), request.category(), http));
    }

    public record ParameterRequest(@NotBlank String key, @NotBlank String value, String description, String category) {
    }
}
