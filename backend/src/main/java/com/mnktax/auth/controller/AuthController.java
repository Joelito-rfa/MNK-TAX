package com.mnktax.auth.controller;

import com.mnktax.auth.dto.LoginRequest;
import com.mnktax.auth.dto.LoginResponse;
import com.mnktax.auth.dto.RefreshRequest;
import com.mnktax.auth.dto.RegisterRequest;
import com.mnktax.auth.dto.RegistrationRequestDto;
import com.mnktax.auth.dto.UpdateProfileRequest;
import com.mnktax.auth.dto.UserDto;
import com.mnktax.auth.service.AuthService;
import com.mnktax.auth.service.UserService;
import com.mnktax.common.util.SecurityUtils;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
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
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@Tag(name = "Authentification", description = "Connexion, refresh et déconnexion")
public class AuthController {

    private final AuthService authService;
    private final UserService userService;

    public AuthController(AuthService authService, UserService userService) {
        this.authService = authService;
        this.userService = userService;
    }

    @PostMapping("/login")
    @SecurityRequirements
    @Operation(summary = "Connexion", description = "Retourne un JWT d'accès et un refresh token.")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request,
                                               HttpServletRequest httpRequest) {
        return ResponseEntity.ok(authService.login(request, httpRequest));
    }

    @PostMapping("/register")
    @SecurityRequirements
    @Operation(summary = "Demander un accès", description = "Soumet une demande d'inscription pour obtenir un accès au système.")
    public ResponseEntity<Void> register(@Valid @RequestBody RegisterRequest request,
                                         HttpServletRequest httpRequest) {
        authService.register(request, httpRequest);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/admin/registrations")
    @Operation(summary = "Lister les demandes d'inscription", description = "Retourne la liste des demandes d'inscription avec filtrage par statut.")
    public ResponseEntity<Page<RegistrationRequestDto>> listRegistrations(
            @RequestParam(required = false) String status, Pageable pageable) {
        return ResponseEntity.ok(authService.listRegistrationRequests(status, pageable));
    }

    @PostMapping("/admin/registrations/{id}/approve")
    @Operation(summary = "Approuver une demande", description = "Approuve une demande d'inscription et crée le compte utilisateur.")
    public ResponseEntity<RegistrationRequestDto> approveRegistration(
            @PathVariable Long id, HttpServletRequest httpRequest) {
        return ResponseEntity.ok(authService.approveRegistrationRequest(id, SecurityUtils.currentUsername(), httpRequest));
    }

    @PostMapping("/admin/registrations/{id}/reject")
    @Operation(summary = "Rejeter une demande", description = "Rejette une demande d'inscription.")
    public ResponseEntity<RegistrationRequestDto> rejectRegistration(
            @PathVariable Long id, HttpServletRequest httpRequest) {
        return ResponseEntity.ok(authService.rejectRegistrationRequest(id, SecurityUtils.currentUsername(), httpRequest));
    }

    @PostMapping("/refresh")
    @SecurityRequirements
    @Operation(summary = "Rafraîchir le token", description = "Échange un refresh token contre un nouveau couple de tokens.")
    public ResponseEntity<LoginResponse> refresh(@Valid @RequestBody RefreshRequest request,
                                                 HttpServletRequest httpRequest) {
        return ResponseEntity.ok(authService.refresh(request, httpRequest));
    }

    @PostMapping("/logout")
    @Operation(summary = "Déconnexion", description = "Révoque les refresh tokens de l'utilisateur courant.")
    public ResponseEntity<Void> logout(HttpServletRequest httpRequest) {
        authService.logout(SecurityUtils.currentUsername(), httpRequest);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/me")
    @Operation(summary = "Utilisateur courant", description = "Retourne le profil de l'utilisateur authentifié.")
    public ResponseEntity<UserDto> me() {
        return ResponseEntity.ok(userService.get(SecurityUtils.currentUserId()));
    }

    @PutMapping("/me")
    @Operation(summary = "Mettre à jour son profil", description = "Modifie les informations personnelles de l'utilisateur courant.")
    public ResponseEntity<UserDto> updateMe(@Valid @RequestBody UpdateProfileRequest request,
                                            HttpServletRequest httpRequest) {
        return ResponseEntity.ok(userService.updateProfile(SecurityUtils.currentUserId(), request, httpRequest));
    }

    @PostMapping(value = "/me/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Téléverser son avatar", description = "Définit la photo de profil de l'utilisateur courant (PNG, JPEG, WEBP, GIF, 2 Mo max).")
    public ResponseEntity<UserDto> uploadAvatar(@RequestParam("file") MultipartFile file,
                                                HttpServletRequest httpRequest) {
        return ResponseEntity.ok(userService.uploadAvatar(SecurityUtils.currentUserId(), file, httpRequest));
    }

    @GetMapping("/me/avatar")
    @Operation(summary = "Avatar de l'utilisateur courant", description = "Retourne l'image de profil de l'utilisateur authentifié.")
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
    @Operation(summary = "Supprimer son avatar", description = "Retire la photo de profil de l'utilisateur courant.")
    public ResponseEntity<UserDto> deleteAvatar(HttpServletRequest httpRequest) {
        return ResponseEntity.ok(userService.deleteAvatar(SecurityUtils.currentUserId(), httpRequest));
    }

    @PostMapping("/change-password")
    @Operation(summary = "Changer le mot de passe", description = "Change le mot de passe de l'utilisateur courant. Révoque tous les refresh tokens.")
    public ResponseEntity<Void> changePassword(@RequestBody Map<String, String> body,
                                               HttpServletRequest httpRequest) {
        String currentPassword = body.get("currentPassword");
        String newPassword = body.get("newPassword");
        authService.changePassword(currentPassword, newPassword, httpRequest);
        return ResponseEntity.noContent().build();
    }
}
