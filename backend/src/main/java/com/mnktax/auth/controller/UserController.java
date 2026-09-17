package com.mnktax.auth.controller;

import com.mnktax.auth.dto.ChangePasswordRequest;
import com.mnktax.auth.dto.CreateUserRequest;
import com.mnktax.auth.dto.UserDto;
import com.mnktax.auth.security.Permissions;
import com.mnktax.auth.service.UserService;
import com.mnktax.common.util.SecurityUtils;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

@RestController
@RequestMapping("/api/users")
@Tag(name = "Utilisateurs", description = "Gestion des comptes utilisateurs (administration)")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('" + Permissions.USER_READ + "')")
    @Operation(summary = "Lister les utilisateurs")
    public ResponseEntity<Page<UserDto>> list(@RequestParam(required = false) String q,
                                              @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(userService.search(q, pageable));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('" + Permissions.USER_READ + "')")
    @Operation(summary = "Détail d'un utilisateur")
    public ResponseEntity<UserDto> get(@PathVariable Long id) {
        return ResponseEntity.ok(userService.get(id));
    }

    @GetMapping("/{id}/avatar")
    @PreAuthorize("hasAuthority('" + Permissions.USER_READ + "')")
    @Operation(summary = "Avatar d'un utilisateur", description = "Retourne l'image de profil d'un utilisateur (404 si aucun avatar).")
    public ResponseEntity<byte[]> avatar(@PathVariable Long id) throws IOException {
        Path file = userService.avatarFile(id).orElse(null);
        if (file == null) {
            return ResponseEntity.notFound().build();
        }
        String contentType = Files.probeContentType(file);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType != null ? contentType : "image/png"))
                .body(Files.readAllBytes(file));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('" + Permissions.USER_WRITE + "')")
    @Operation(summary = "Créer un utilisateur")
    public ResponseEntity<UserDto> create(@Valid @RequestBody CreateUserRequest request,
                                          HttpServletRequest httpRequest) {
        return ResponseEntity.ok(userService.create(request, httpRequest));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('" + Permissions.USER_WRITE + "')")
    @Operation(summary = "Mettre à jour un utilisateur")
    public ResponseEntity<UserDto> update(@PathVariable Long id, @Valid @RequestBody CreateUserRequest request,
                                          HttpServletRequest httpRequest) {
        return ResponseEntity.ok(userService.update(id, request, httpRequest));
    }

    @PatchMapping("/{id}/enabled")
    @PreAuthorize("hasAuthority('" + Permissions.USER_WRITE + "')")
    @Operation(summary = "Activer / désactiver un utilisateur")
    public ResponseEntity<Void> setEnabled(@PathVariable Long id, @RequestParam boolean enabled,
                                           HttpServletRequest httpRequest) {
        userService.setEnabled(id, enabled, httpRequest);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('" + Permissions.USER_WRITE + "')")
    @Operation(summary = "Supprimer un utilisateur")
    public ResponseEntity<Void> delete(@PathVariable Long id, HttpServletRequest httpRequest) {
        userService.delete(id, httpRequest);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/reset-password")
    @PreAuthorize("hasAuthority('" + Permissions.USER_RESET_PASSWORD + "')")
    @Operation(summary = "Réinitialiser le mot de passe d'un utilisateur",
            description = "Génère un mot de passe temporaire et impose son changement à la prochaine connexion.")
    public ResponseEntity<ResetPasswordResponse> resetPassword(@PathVariable Long id,
                                                               HttpServletRequest httpRequest) {
        String temporaryPassword = userService.resetPassword(id, httpRequest);
        return ResponseEntity.ok(new ResetPasswordResponse(temporaryPassword));
    }

    public record ResetPasswordResponse(String temporaryPassword) {
    }

    @PostMapping("/change-password")
    @Operation(summary = "Changer son propre mot de passe")
    public ResponseEntity<Void> changePassword(@Valid @RequestBody ChangePasswordRequest request,
                                               HttpServletRequest httpRequest) {
        userService.changePassword(SecurityUtils.currentUserId(), request, httpRequest);
        return ResponseEntity.noContent().build();
    }
}
