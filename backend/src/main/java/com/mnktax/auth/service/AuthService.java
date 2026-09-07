package com.mnktax.auth.service;

import com.mnktax.audit.service.AuditService;
import com.mnktax.auth.dto.LoginRequest;
import com.mnktax.auth.dto.LoginResponse;
import com.mnktax.auth.dto.RefreshRequest;
import com.mnktax.auth.dto.UserDto;
import com.mnktax.auth.entity.RefreshToken;
import com.mnktax.auth.entity.User;
import com.mnktax.auth.repository.RefreshTokenRepository;
import com.mnktax.auth.repository.UserRepository;
import com.mnktax.auth.security.CustomUserDetails;
import com.mnktax.auth.security.JwtService;
import com.mnktax.common.exception.BusinessException;
import com.mnktax.common.exception.ResourceNotFoundException;
import com.mnktax.common.util.SecurityUtils;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final AuditService auditService;
    private final PasswordEncoder passwordEncoder;

    public AuthService(AuthenticationManager authenticationManager, JwtService jwtService,
                       UserRepository userRepository, RefreshTokenRepository refreshTokenRepository,
                       AuditService auditService, PasswordEncoder passwordEncoder) {
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.auditService = auditService;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public LoginResponse login(LoginRequest request, HttpServletRequest httpRequest) {
        var authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.username(), request.password()));
        CustomUserDetails principal = (CustomUserDetails) authentication.getPrincipal();
        User user = userRepository.findByUsername(principal.getUsername())
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur", principal.getUsername()));

        String clientIp = clientIp(httpRequest);
        String userAgent = truncate(httpRequest.getHeader("User-Agent"), 255);

        userRepository.updateLastLogin(user.getId(), Instant.now(), clientIp, userAgent);
        String accessToken = jwtService.generateAccessToken(principal, Map.of("userId", user.getId()));
        String refreshToken = issueRefreshToken(user, principal, clientIp, userAgent);

        auditService.record("LOGIN", "USER", String.valueOf(user.getId()), null, user.getUsername(), httpRequest);

        return new LoginResponse(accessToken, refreshToken, "Bearer",
                jwtAccessTtl(principal), UserDto.from(user));
    }

    @Transactional
    public LoginResponse refresh(RefreshRequest request, HttpServletRequest httpRequest) {
        RefreshToken stored = refreshTokenRepository.findByToken(request.refreshToken())
                .orElseThrow(() -> new BusinessException("TOKEN_INVALID", "Refresh token invalide."));
        if (stored.isRevoked() || stored.getExpiresAt().isBefore(Instant.now())) {
            throw new BusinessException("TOKEN_EXPIRED", "Session expirée. Veuillez vous reconnecter.");
        }
        User user = stored.getUser();
        CustomUserDetails principal = CustomUserDetails.from(user);
        String accessToken = jwtService.generateAccessToken(principal, Map.of("userId", user.getId()));

        String clientIp = clientIp(httpRequest);
        String userAgent = truncate(httpRequest.getHeader("User-Agent"), 255);

        String newRefreshToken = UUID.randomUUID().toString().replace("-", "");

        stored.setRevoked(true);
        refreshTokenRepository.save(stored);
        refreshTokenRepository.save(RefreshToken.builder()
                .user(user)
                .token(newRefreshToken)
                .userAgent(userAgent)
                .ipAddress(clientIp)
                .expiresAt(Instant.now().plusSeconds(jwtService.getRefreshTtlSeconds()))
                .createdAt(Instant.now())
                .build());

        auditService.record("TOKEN_REFRESH", "USER", String.valueOf(user.getId()), null, user.getUsername(), httpRequest);

        return new LoginResponse(accessToken, newRefreshToken, "Bearer", jwtService.getAccessTtlSeconds(), UserDto.from(user));
    }

    @Transactional
    public void logout(String username, HttpServletRequest httpRequest) {
        userRepository.findByUsername(username).ifPresent(user -> {
            refreshTokenRepository.revokeAllForUser(user.getId());
            auditService.record("LOGOUT", "USER", String.valueOf(user.getId()), user.getUsername(), null, httpRequest);
        });
    }

    @Transactional
    public void changePassword(String currentPassword, String newPassword, HttpServletRequest httpRequest) {
        String username = SecurityUtils.currentUsername();
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur", username));

        if (!passwordEncoder.matches(currentPassword, user.getPassword())) {
            throw new BusinessException("INVALID_PASSWORD", "Le mot de passe actuel est incorrect.");
        }
        if (newPassword == null || newPassword.length() < 8) {
            throw new BusinessException("WEAK_PASSWORD", "Le nouveau mot de passe doit contenir au moins 8 caractères.");
        }
        if (currentPassword.equals(newPassword)) {
            throw new BusinessException("SAME_PASSWORD", "Le nouveau mot de passe doit être différent de l'actuel.");
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        user.setMustChangePassword(false);
        user.setUpdatedAt(Instant.now());
        userRepository.save(user);
        userRepository.flush();

        refreshTokenRepository.revokeAllForUser(user.getId());
        auditService.record("PASSWORD_CHANGE", "USER", String.valueOf(user.getId()), null, user.getUsername(), httpRequest);
    }

    private String issueRefreshToken(User user, CustomUserDetails principal, String ip, String userAgent) {
        String raw = UUID.randomUUID().toString().replace("-", "");
        refreshTokenRepository.save(RefreshToken.builder()
                .user(user)
                .token(raw)
                .ipAddress(ip)
                .userAgent(userAgent)
                .expiresAt(Instant.now().plusSeconds(jwtService.getRefreshTtlSeconds()))
                .createdAt(Instant.now())
                .build());
        return raw;
    }

    private long jwtAccessTtl(CustomUserDetails principal) {
        return jwtService.getAccessTtlSeconds();
    }

    private static String clientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return Optional.ofNullable(request.getRemoteAddr()).orElse("unknown");
    }

    private static String truncate(String value, int max) {
        if (value == null) return null;
        return value.length() <= max ? value : value.substring(0, max);
    }
}
