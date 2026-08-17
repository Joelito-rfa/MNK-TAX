package com.mnktax.auth.controller;

import com.mnktax.auth.dto.LoginRequest;
import com.mnktax.auth.dto.LoginResponse;
import com.mnktax.auth.dto.RefreshRequest;
import com.mnktax.auth.dto.UserDto;
import com.mnktax.auth.service.AuthService;
import com.mnktax.auth.service.UserService;
import com.mnktax.common.util.SecurityUtils;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

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
