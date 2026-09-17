package com.mnktax.auth.service;

import com.mnktax.audit.entity.AuditLog;
import com.mnktax.audit.repository.AuditLogRepository;
import com.mnktax.audit.service.AuditService;
import com.mnktax.auth.dto.ChangePasswordRequest;
import com.mnktax.auth.dto.CreateUserRequest;
import com.mnktax.auth.dto.SecurityEventDto;
import com.mnktax.auth.dto.SessionDto;
import com.mnktax.auth.dto.UpdateProfileRequest;
import com.mnktax.auth.dto.UserDto;
import com.mnktax.auth.entity.Role;
import com.mnktax.auth.entity.User;
import com.mnktax.auth.repository.RefreshTokenRepository;
import com.mnktax.auth.repository.RoleRepository;
import com.mnktax.auth.repository.UserRepository;
import com.mnktax.common.exception.BusinessException;
import com.mnktax.common.exception.ResourceNotFoundException;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditService auditService;
    private final RefreshTokenRepository refreshTokenRepository;
    private final AuditLogRepository auditLogRepository;

    private static final long MAX_AVATAR_BYTES = 2 * 1024 * 1024;
    private static final Set<String> ALLOWED_AVATAR_TYPES = Set.of(
            "image/png", "image/jpeg", "image/webp", "image/gif");

    @Value("${mnk-tax.avatar.storage-dir:./data/avatars}")
    private String avatarStorageDir;

    public UserService(UserRepository userRepository, RoleRepository roleRepository,
                       PasswordEncoder passwordEncoder, AuditService auditService,
                       RefreshTokenRepository refreshTokenRepository,
                       AuditLogRepository auditLogRepository) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
        this.auditService = auditService;
        this.refreshTokenRepository = refreshTokenRepository;
        this.auditLogRepository = auditLogRepository;
    }

    @Transactional(readOnly = true)
    public Page<UserDto> search(String query, Pageable pageable) {
        String q = (query == null || query.isBlank()) ? null : query.trim();
        return userRepository.search(q, pageable).map(UserDto::from);
    }

    @Transactional(readOnly = true)
    public UserDto get(Long id) {
        return UserDto.from(userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur", id)));
    }

    @Transactional
    public UserDto create(CreateUserRequest request, HttpServletRequest httpRequest) {
        if (userRepository.existsByUsername(request.username())) {
            throw new BusinessException("DUPLICATE", "Le nom d'utilisateur existe déjà.");
        }
        if (userRepository.existsByEmail(request.email())) {
            throw new BusinessException("DUPLICATE", "L'email existe déjà.");
        }
        User user = User.builder()
                .username(request.username())
                .email(request.email())
                .password(passwordEncoder.encode(request.password()))
                .firstName(request.firstName())
                .lastName(request.lastName())
                .phone(request.phone())
                .enabled(true)
                .mustChangePassword(false)
                .mfaEnabled(false)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .roles(new HashSet<>())
                .build();
        resolveRoles(user, request.roleCodes());
        User saved = userRepository.save(user);
        auditService.record("CREATE", "USER", String.valueOf(saved.getId()), null,
                UserDto.from(saved), httpRequest);
        return UserDto.from(saved);
    }

    @Transactional
    public UserDto update(Long id, CreateUserRequest request, HttpServletRequest httpRequest) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur", id));
        UserDto old = UserDto.from(user);
        user.setEmail(request.email());
        user.setFirstName(request.firstName());
        user.setLastName(request.lastName());
        user.setPhone(request.phone());
        user.setUpdatedAt(Instant.now());
        if (request.roleCodes() != null) {
            user.getRoles().clear();
            resolveRoles(user, request.roleCodes());
        }
        User saved = userRepository.save(user);
        auditService.record("UPDATE", "USER", String.valueOf(id), old, UserDto.from(saved), httpRequest);
        return UserDto.from(saved);
    }

    @Transactional
    public void setEnabled(Long id, boolean enabled, HttpServletRequest httpRequest) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur", id));
        boolean old = user.isEnabled();
        user.setEnabled(enabled);
        user.setUpdatedAt(Instant.now());
        userRepository.save(user);
        auditService.record(enabled ? "ENABLE" : "DISABLE", "USER", String.valueOf(id), old, enabled, httpRequest);
    }

    @Transactional
    public void delete(Long id, HttpServletRequest httpRequest) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur", id));
        if (user.getRoles().stream().anyMatch(Role::isSystem) || user.getUsername().equals("admin")) {
            throw new BusinessException("FORBIDDEN", "Cet utilisateur système ne peut pas être supprimé.");
        }
        UserDto old = UserDto.from(user);
        deleteAvatarFile(user.getAvatarPath());
        userRepository.delete(user);
        auditService.record("DELETE", "USER", String.valueOf(id), old, null, httpRequest);
    }

    @Transactional
    public UserDto uploadAvatar(Long userId, MultipartFile file, HttpServletRequest httpRequest) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException("EMPTY_FILE", "Le fichier est vide.");
        }
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_AVATAR_TYPES.contains(contentType.toLowerCase())) {
            throw new BusinessException("INVALID_AVATAR", "Format non supporté. Utilisez PNG, JPEG, WEBP ou GIF.");
        }
        if (file.getSize() > MAX_AVATAR_BYTES) {
            throw new BusinessException("AVATAR_TOO_LARGE", "L'image ne doit pas dépasser 2 Mo.");
        }
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur", userId));
        try {
            Path dir = Path.of(avatarStorageDir).toAbsolutePath();
            Files.createDirectories(dir);
            String extension = extensionOf(contentType);
            String filename = "avatar_" + user.getId() + "_" + UUID.randomUUID().toString().substring(0, 8) + extension;
            Path target = dir.resolve(filename);
            file.transferTo(target);

            deleteAvatarFile(user.getAvatarPath());
            user.setAvatarPath(target.toString());
            user.setUpdatedAt(Instant.now());
            User saved = userRepository.save(user);
            auditService.record("UPDATE", "AVATAR", String.valueOf(userId), null, filename, httpRequest);
            return UserDto.from(saved);
        } catch (IOException ex) {
            throw new BusinessException("UPLOAD_ERROR", "Erreur de sauvegarde de l'avatar : " + ex.getMessage());
        }
    }

    @Transactional
    public UserDto deleteAvatar(Long userId, HttpServletRequest httpRequest) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur", userId));
        deleteAvatarFile(user.getAvatarPath());
        user.setAvatarPath(null);
        user.setUpdatedAt(Instant.now());
        User saved = userRepository.save(user);
        auditService.record("DELETE", "AVATAR", String.valueOf(userId), null, null, httpRequest);
        return UserDto.from(saved);
    }

    private void deleteAvatarFile(String path) {
        if (path == null || path.isBlank()) {
            return;
        }
        try {
            Files.deleteIfExists(Path.of(path));
        } catch (IOException ignored) {
        }
    }

    private String extensionOf(String contentType) {
        return switch (contentType.toLowerCase()) {
            case "image/png" -> ".png";
            case "image/jpeg" -> ".jpg";
            case "image/webp" -> ".webp";
            case "image/gif" -> ".gif";
            default -> "";
        };
    }

    @Transactional(readOnly = true)
    public Optional<Path> avatarFile(Long userId) {
        return userRepository.findById(userId)
                .map(User::getAvatarPath)
                .filter(path -> path != null && !path.isBlank())
                .map(Path::of)
                .filter(Files::exists);
    }

    @Transactional
    public UserDto updateProfile(Long userId, UpdateProfileRequest request, HttpServletRequest httpRequest) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur", userId));
        UserDto old = UserDto.from(user);
        if (request.email() != null && !request.email().isBlank() && !request.email().equalsIgnoreCase(user.getEmail())) {
            if (userRepository.existsByEmail(request.email())) {
                throw new BusinessException("DUPLICATE", "L'email existe déjà.");
            }
            user.setEmail(request.email());
        }
        if (request.firstName() != null) {
            user.setFirstName(blankToNull(request.firstName()));
        }
        if (request.lastName() != null) {
            user.setLastName(blankToNull(request.lastName()));
        }
        if (request.phone() != null) {
            user.setPhone(blankToNull(request.phone()));
        }
        if (request.jobTitle() != null) {
            user.setJobTitle(blankToNull(request.jobTitle()));
        }
        if (request.taxCenter() != null) {
            user.setTaxCenter(blankToNull(request.taxCenter()));
        }
        user.setUpdatedAt(Instant.now());
        User saved = userRepository.save(user);
        auditService.record("UPDATE", "PROFILE", String.valueOf(userId), old, UserDto.from(saved), httpRequest);
        return UserDto.from(saved);
    }

    @Transactional
    public void changePassword(Long userId, ChangePasswordRequest request, HttpServletRequest httpRequest) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur", userId));
        if (!passwordEncoder.matches(request.currentPassword(), user.getPassword())) {
            throw new BusinessException("BAD_CREDENTIALS", "L'ancien mot de passe est incorrect.");
        }
        user.setPassword(passwordEncoder.encode(request.newPassword()));
        user.setMustChangePassword(false);
        user.setUpdatedAt(Instant.now());
        userRepository.save(user);
        auditService.record("PASSWORD_CHANGE", "USER", String.valueOf(userId), null, null, httpRequest);
    }

    @Transactional
    public String resetPassword(Long id, HttpServletRequest httpRequest) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur", id));
        String temporaryPassword = generateTemporaryPassword();
        user.setPassword(passwordEncoder.encode(temporaryPassword));
        user.setMustChangePassword(true);
        user.setUpdatedAt(Instant.now());
        userRepository.save(user);
        auditService.record("PASSWORD_RESET", "USER", String.valueOf(id), null, null, httpRequest);
        return temporaryPassword;
    }

    private static String generateTemporaryPassword() {
        return "Mnk-" + UUID.randomUUID().toString().replace("-", "").substring(0, 10) + "!";
    }

    /* ── Sessions ─────────────────────────────────────── */

    @Transactional(readOnly = true)
    public List<SessionDto> getActiveSessions(Long userId, String currentRefreshToken) {
        var tokens = refreshTokenRepository.findByUserIdAndRevokedFalseOrderByCreatedAtDesc(userId);
        Long resolvedCurrentTokenId = (currentRefreshToken != null)
                ? tokens.stream()
                    .filter(t -> t.getToken().equals(currentRefreshToken))
                    .map(t -> t.getId())
                    .findFirst()
                    .orElse(null)
                : null;
        return tokens.stream()
                .map(t -> SessionDto.from(t, resolvedCurrentTokenId))
                .toList();
    }

    @Transactional
    public void revokeSession(Long userId, Long sessionId) {
        refreshTokenRepository.revokeByIdAndUserId(sessionId, userId);
    }

    @Transactional
    public void revokeAllOtherSessions(Long userId, String currentRefreshToken) {
        if (currentRefreshToken == null) {
            refreshTokenRepository.revokeAllForUser(userId);
            return;
        }
        var tokens = refreshTokenRepository.findByUserIdAndRevokedFalseOrderByCreatedAtDesc(userId);
        Long currentTokenId = tokens.stream()
                .filter(t -> t.getToken().equals(currentRefreshToken))
                .map(t -> t.getId())
                .findFirst()
                .orElse(null);
        if (currentTokenId != null) {
            refreshTokenRepository.revokeAllExceptCurrent(userId, currentTokenId);
        } else {
            refreshTokenRepository.revokeAllForUser(userId);
        }
    }

    /* ── Security History ─────────────────────────────── */

    @Transactional(readOnly = true)
    public List<SecurityEventDto> getSecurityHistory(Long userId, Pageable pageable) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur", userId));
        List<AuditLog> logs = auditLogRepository.findByUsernameOrderByCreatedAtDesc(
                user.getUsername(), pageable);
        return logs.stream().map(SecurityEventDto::from).toList();
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private void resolveRoles(User user, Set<String> roleCodes) {
        if (roleCodes == null || roleCodes.isEmpty()) {
            throw new BusinessException("VALIDATION_ERROR", "Au moins un rôle est requis.");
        }
        for (String code : roleCodes) {
            Role role = roleRepository.findByCode(code)
                    .orElseThrow(() -> new BusinessException("VALIDATION_ERROR", "Rôle inconnu : " + code));
            user.getRoles().add(role);
        }
    }
}
