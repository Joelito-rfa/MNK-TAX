package com.mnktax.auth.service;

import com.mnktax.audit.service.AuditService;
import com.mnktax.auth.dto.ChangePasswordRequest;
import com.mnktax.auth.dto.CreateUserRequest;
import com.mnktax.auth.dto.UserDto;
import com.mnktax.auth.entity.Role;
import com.mnktax.auth.entity.User;
import com.mnktax.auth.repository.RoleRepository;
import com.mnktax.auth.repository.UserRepository;
import com.mnktax.common.exception.BusinessException;
import com.mnktax.common.exception.ResourceNotFoundException;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.HashSet;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditService auditService;

    public UserService(UserRepository userRepository, RoleRepository roleRepository,
                       PasswordEncoder passwordEncoder, AuditService auditService) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public Page<UserDto> search(String query, Pageable pageable) {
        Page<User> users;
        if (query == null || query.isBlank()) {
            users = userRepository.findAll(pageable);
        } else {
            users = userRepository.findAll(pageable); // recherche simple sur toutes les pages
        }
        return users.map(UserDto::from);
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

    private void resolveRoles(User user, java.util.Set<String> roleCodes) {
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
