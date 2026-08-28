package com.mnktax.auth.service;

import com.mnktax.audit.service.AuditService;
import com.mnktax.auth.dto.LoginRequest;
import com.mnktax.auth.dto.LoginResponse;
import com.mnktax.auth.dto.RefreshRequest;
import com.mnktax.auth.dto.RegisterRequest;
import com.mnktax.auth.dto.RegistrationRequestDto;
import com.mnktax.auth.dto.UserDto;
import com.mnktax.auth.entity.RefreshToken;
import com.mnktax.auth.entity.RegistrationRequest;
import com.mnktax.auth.entity.User;
import com.mnktax.auth.repository.RefreshTokenRepository;
import com.mnktax.auth.repository.RegistrationRequestRepository;
import com.mnktax.auth.repository.RoleRepository;
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

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.Instant;
import java.util.HashSet;
import java.util.Map;
import java.util.UUID;

@Service
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final RegistrationRequestRepository registrationRequestRepository;
    private final RoleRepository roleRepository;
    private final AuditService auditService;
    private final PasswordEncoder passwordEncoder;

    public AuthService(AuthenticationManager authenticationManager, JwtService jwtService,
                       UserRepository userRepository, RefreshTokenRepository refreshTokenRepository,
                       RegistrationRequestRepository registrationRequestRepository,
                       RoleRepository roleRepository,
                       AuditService auditService, PasswordEncoder passwordEncoder) {
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.registrationRequestRepository = registrationRequestRepository;
        this.roleRepository = roleRepository;
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

        userRepository.updateLastLogin(user.getId(), Instant.now());
        String accessToken = jwtService.generateAccessToken(principal, Map.of("userId", user.getId()));
        String refreshToken = issueRefreshToken(user, principal);

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
        String newRefreshToken = UUID.randomUUID().toString().replace("-", "");

        stored.setRevoked(true);
        refreshTokenRepository.save(stored);
        refreshTokenRepository.save(RefreshToken.builder()
                .user(user)
                .token(newRefreshToken)
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
    public void register(RegisterRequest request, HttpServletRequest httpRequest) {
        if (registrationRequestRepository.existsByEmailAndStatus(request.email(), "PENDING")) {
            throw new BusinessException("DUPLICATE", "Une demande d'accès est déjà en cours pour cet email.");
        }
        if (userRepository.existsByEmail(request.email())) {
            throw new BusinessException("DUPLICATE", "Un compte existe déjà avec cet email.");
        }

        RegistrationRequest registration = RegistrationRequest.builder()
                .name(request.name())
                .email(request.email())
                .organization(request.organization())
                .role(request.role())
                .message(request.message())
                .status("PENDING")
                .createdAt(Instant.now())
                .build();

        registrationRequestRepository.save(registration);
        auditService.record("REGISTER_REQUEST", "USER", request.email(), null, request, httpRequest);
    }

    @Transactional(readOnly = true)
    public Page<RegistrationRequestDto> listRegistrationRequests(String status, Pageable pageable) {
        String s = (status == null || status.isBlank()) ? null : status.trim().toUpperCase();
        Page<com.mnktax.auth.entity.RegistrationRequest> page;
        if (s != null) {
            page = registrationRequestRepository.findByStatus(s, pageable);
        } else {
            page = registrationRequestRepository.findAll(pageable);
        }
        return page.map(RegistrationRequestDto::from);
    }

    @Transactional
    public RegistrationRequestDto approveRegistrationRequest(Long id, String adminUsername, HttpServletRequest httpRequest) {
        com.mnktax.auth.entity.RegistrationRequest request = registrationRequestRepository.findById(id)
                .orElseThrow(() -> new BusinessException("NOT_FOUND", "Demande d'inscription introuvable."));
        if (!"PENDING".equals(request.getStatus())) {
            throw new BusinessException("INVALID_STATE", "Cette demande a déjà été traitée.");
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new BusinessException("DUPLICATE", "Un compte existe déjà avec cet email.");
        }

        request.setStatus("APPROVED");
        request.setReviewedBy(adminUsername);
        request.setReviewedAt(Instant.now());
        registrationRequestRepository.save(request);

        User user = User.builder()
                .username(request.getEmail().split("@")[0])
                .email(request.getEmail())
                .password(passwordEncoder.encode("Temp@" + UUID.randomUUID().toString().substring(0, 8)))
                .firstName(request.getName())
                .enabled(true)
                .mustChangePassword(true)
                .mfaEnabled(false)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .roles(new HashSet<>())
                .build();

        roleRepository.findByCode("TAXPAYER").ifPresent(user.getRoles()::add);
        userRepository.save(user);

        auditService.record("APPROVE_REGISTRATION", "REGISTRATION_REQUEST", String.valueOf(id),
                null, request, httpRequest);

        return RegistrationRequestDto.from(request);
    }

    @Transactional
    public RegistrationRequestDto rejectRegistrationRequest(Long id, String adminUsername, HttpServletRequest httpRequest) {
        com.mnktax.auth.entity.RegistrationRequest request = registrationRequestRepository.findById(id)
                .orElseThrow(() -> new BusinessException("NOT_FOUND", "Demande d'inscription introuvable."));
        if (!"PENDING".equals(request.getStatus())) {
            throw new BusinessException("INVALID_STATE", "Cette demande a déjà été traitée.");
        }

        request.setStatus("REJECTED");
        request.setReviewedBy(adminUsername);
        request.setReviewedAt(Instant.now());
        registrationRequestRepository.save(request);

        auditService.record("REJECT_REGISTRATION", "REGISTRATION_REQUEST", String.valueOf(id),
                null, request, httpRequest);

        return RegistrationRequestDto.from(request);
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

        refreshTokenRepository.revokeAllForUser(user.getId());
        auditService.record("PASSWORD_CHANGE", "USER", String.valueOf(user.getId()), null, user.getUsername(), httpRequest);
    }

    private String issueRefreshToken(User user, CustomUserDetails principal) {
        String raw = UUID.randomUUID().toString().replace("-", "");
        refreshTokenRepository.save(RefreshToken.builder()
                .user(user)
                .token(raw)
                .expiresAt(Instant.now().plusSeconds(jwtService.getRefreshTtlSeconds()))
                .createdAt(Instant.now())
                .build());
        return raw;
    }

    private long jwtAccessTtl(CustomUserDetails principal) {
        return jwtService.getAccessTtlSeconds();
    }
}
