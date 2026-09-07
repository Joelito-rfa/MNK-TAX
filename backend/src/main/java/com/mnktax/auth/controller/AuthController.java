package com.mnktax.auth.controller;

import com.mnktax.auth.dto.LoginRequest;
import com.mnktax.auth.dto.LoginResponse;
import com.mnktax.auth.dto.RefreshRequest;
import com.mnktax.auth.dto.RegisterRequest;
import com.mnktax.auth.dto.RegistrationRequestDto;
import com.mnktax.auth.dto.SecurityEventDto;
import com.mnktax.auth.dto.SessionDto;
import com.mnktax.auth.dto.UpdateProfileRequest;
import com.mnktax.auth.dto.UserDto;
import com.mnktax.auth.service.AuthService;
import com.mnktax.auth.service.RegistrationService;
import com.mnktax.auth.service.UserService;
import com.mnktax.common.util.SecurityUtils;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@Tag(name = "Authentification", description = "Connexion, refresh et déconnexion")
public class AuthController {

    private final AuthService authService;
    private final RegistrationService registrationService;
    private final UserService userService;

    public AuthController(AuthService authService, RegistrationService registrationService, UserService userService) {
        this.authService = authService;
        this.registrationService = registrationService;
        this.userService = userService;
    }

    @PostMapping("/login")
    @SecurityRequirements
    @Operation(summary = "Connexion", description = "Retourne un JWT d'accès et un refresh token.")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request,
                                               HttpServletRequest httpRequest) {
        return ResponseEntity.ok(authService.login(request, httpRequest));
    }

    /* ── Inscription publique ──────────────────────────── */

    @PostMapping("/register")
    @SecurityRequirements
    @Operation(summary = "Demander un accès", description = "Soumet une demande d'inscription.")
    public ResponseEntity<RegistrationRequestDto> register(@Valid @RequestBody RegisterRequest request,
                                                           HttpServletRequest httpRequest) {
        return ResponseEntity.ok(registrationService.register(request, httpRequest));
    }

    /* ── Admin: gestion des demandes ───────────────────── */

    @GetMapping("/admin/registrations")
    @Operation(summary = "Rechercher les demandes d'inscription")
    public ResponseEntity<Page<RegistrationRequestDto>> listRegistrations(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String q,
            Pageable pageable) {
        return ResponseEntity.ok(registrationService.search(status, type, q, pageable));
    }

    @GetMapping("/admin/registrations/stats")
    @Operation(summary = "Statistiques des demandes d'inscription")
    public ResponseEntity<Map<String, Long>> registrationStats() {
        return ResponseEntity.ok(registrationService.stats());
    }

    @GetMapping("/admin/registrations/{id}")
    @Operation(summary = "Détail d'une demande d'inscription")
    public ResponseEntity<RegistrationRequestDto> getRegistration(@PathVariable Long id) {
        return ResponseEntity.ok(registrationService.getById(id));
    }

    @PostMapping("/admin/registrations/{id}/assign")
    @Operation(summary = "Prendre en charge une demande")
    public ResponseEntity<RegistrationRequestDto> assignRegistration(
            @PathVariable Long id, HttpServletRequest httpRequest) {
        return ResponseEntity.ok(registrationService.assign(id, SecurityUtils.currentUsername(), httpRequest));
    }

    @PostMapping("/admin/registrations/{id}/approve")
    @Operation(summary = "Approuver une demande", description = "Approuve et crée le compte utilisateur.")
    public ResponseEntity<RegistrationRequestDto> approveRegistration(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> body,
            HttpServletRequest httpRequest) {
        String roleCode = body != null ? body.get("roleCode") : null;
        return ResponseEntity.ok(registrationService.approve(id, SecurityUtils.currentUsername(), roleCode, httpRequest));
    }

    @PostMapping("/admin/registrations/{id}/reject")
    @Operation(summary = "Rejeter une demande", description = "Rejette avec motif obligatoire.")
    public ResponseEntity<RegistrationRequestDto> rejectRegistration(
            @PathVariable Long id,
            @RequestBody Map<String, String> body,
            HttpServletRequest httpRequest) {
        String reason = body.get("reason");
        return ResponseEntity.ok(registrationService.reject(id, SecurityUtils.currentUsername(), reason, httpRequest));
    }

    /* ── Auth classique ────────────────────────────────── */

    @PostMapping("/refresh")
    @SecurityRequirements
    @Operation(summary = "Rafraîchir le token")
    public ResponseEntity<LoginResponse> refresh(@Valid @RequestBody RefreshRequest request,
                                                 HttpServletRequest httpRequest) {
        return ResponseEntity.ok(authService.refresh(request, httpRequest));
    }

    @PostMapping("/logout")
    @Operation(summary = "Déconnexion")
    public ResponseEntity<Void> logout(HttpServletRequest httpRequest) {
        authService.logout(SecurityUtils.currentUsername(), httpRequest);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/me")
    @Operation(summary = "Utilisateur courant")
    public ResponseEntity<UserDto> me() {
        return ResponseEntity.ok(userService.get(SecurityUtils.currentUserId()));
    }

    @PutMapping("/me")
    @Operation(summary = "Mettre à jour son profil")
    public ResponseEntity<UserDto> updateMe(@Valid @RequestBody UpdateProfileRequest request,
                                            HttpServletRequest httpRequest) {
        return ResponseEntity.ok(userService.updateProfile(SecurityUtils.currentUserId(), request, httpRequest));
    }

    @PostMapping(value = "/me/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Téléverser son avatar")
    public ResponseEntity<UserDto> uploadAvatar(@RequestParam("file") MultipartFile file,
                                                HttpServletRequest httpRequest) {
        return ResponseEntity.ok(userService.uploadAvatar(SecurityUtils.currentUserId(), file, httpRequest));
    }

    @GetMapping("/me/avatar")
    @Operation(summary = "Avatar de l'utilisateur courant")
    public ResponseEntity<byte[]> avatar() throws IOException {
        Path file = userService.avatarFile(SecurityUtils.currentUserId()).orElse(null);
        if (file == null) {
            return ResponseEntity.notFound().build();
        }
        String contentType = Files.probeContentType(file);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType != null ? contentType : "image/png"))
                .body(Files.readAllBytes(file));
    }

    @DeleteMapping("/me/avatar")
    @Operation(summary = "Supprimer son avatar")
    public ResponseEntity<UserDto> deleteAvatar(HttpServletRequest httpRequest) {
        return ResponseEntity.ok(userService.deleteAvatar(SecurityUtils.currentUserId(), httpRequest));
    }

    @PostMapping("/change-password")
    @Operation(summary = "Changer le mot de passe")
    public ResponseEntity<Void> changePassword(@RequestBody Map<String, String> body,
                                               HttpServletRequest httpRequest) {
        String currentPassword = body.get("currentPassword");
        String newPassword = body.get("newPassword");
        authService.changePassword(currentPassword, newPassword, httpRequest);
        return ResponseEntity.noContent().build();
    }

    /* ── Sessions ──────────────────────────────────────── */

    @GetMapping("/me/sessions")
    @Operation(summary = "Sessions actives de l'utilisateur courant")
    public ResponseEntity<List<SessionDto>> mySessions(
            @RequestParam(name = "token", required = false) String currentToken) {
        return ResponseEntity.ok(userService.getActiveSessions(SecurityUtils.currentUserId(), currentToken));
    }

    @PostMapping("/me/sessions/{id}/revoke")
    @Operation(summary = "Révoquer une session")
    public ResponseEntity<Void> revokeSession(@PathVariable Long id) {
        userService.revokeSession(SecurityUtils.currentUserId(), id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/me/sessions/revoke-all")
    @Operation(summary = "Révoquer toutes les autres sessions")
    public ResponseEntity<Void> revokeAllSessions(
            @RequestParam(name = "token", required = false) String currentToken) {
        userService.revokeAllOtherSessions(SecurityUtils.currentUserId(), currentToken);
        return ResponseEntity.noContent().build();
    }

    /* ── Sécurité ──────────────────────────────────────── */

    @GetMapping("/me/security-history")
    @Operation(summary = "Historique de sécurité de l'utilisateur courant")
    public ResponseEntity<List<SecurityEventDto>> mySecurityHistory(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(userService.getSecurityHistory(
                SecurityUtils.currentUserId(), PageRequest.of(page, size)));
    }
}
