package com.mnktax.auth.service;

import com.mnktax.audit.service.AuditService;
import com.mnktax.auth.dto.RoleDto;
import com.mnktax.auth.entity.Permission;
import com.mnktax.auth.entity.Role;
import com.mnktax.auth.repository.PermissionRepository;
import com.mnktax.auth.repository.RoleRepository;
import com.mnktax.common.exception.BusinessException;
import com.mnktax.common.exception.ResourceNotFoundException;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;

@Service
public class RoleService {

    private final RoleRepository roleRepository;
    private final PermissionRepository permissionRepository;
    private final AuditService auditService;

    public RoleService(RoleRepository roleRepository, PermissionRepository permissionRepository,
                       AuditService auditService) {
        this.roleRepository = roleRepository;
        this.permissionRepository = permissionRepository;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public List<RoleDto> findAll() {
        return roleRepository.findAll().stream()
                .sorted((a, b) -> a.getCode().compareTo(b.getCode()))
                .map(this::toDto)
                .toList();
    }

    @Transactional
    public RoleDto updatePermissions(Long roleId, List<String> permissionCodes, HttpServletRequest request) {
        Role role = roleRepository.findById(roleId)
                .orElseThrow(() -> new ResourceNotFoundException("Rôle", roleId));
        if (role.isSystem()) {
            throw new BusinessException("FORBIDDEN", "Les rôles système ne peuvent pas être modifiés.");
        }
        List<String> old = role.getPermissions().stream().map(p -> p.getCode()).sorted().toList();
        role.getPermissions().clear();
        if (permissionCodes != null) {
            for (String code : permissionCodes) {
                Permission perm = permissionRepository.findByCode(code)
                        .orElseThrow(() -> new BusinessException("VALIDATION_ERROR", "Permission inconnue : " + code));
                role.getPermissions().add(perm);
            }
        }
        auditService.record("RULE_CHANGE", "ROLE", String.valueOf(roleId), old, permissionCodes, request);
        Role saved = roleRepository.save(role);
        return toDto(saved);
    }

    @Transactional
    public RoleDto create(String code, String name, String description, List<String> permissionCodes,
                          HttpServletRequest request) {
        if (code == null || code.isBlank()) {
            throw new BusinessException("VALIDATION_ERROR", "Le code du rôle est requis.");
        }
        String normalizedCode = code.trim().toUpperCase().replaceAll("[^A-Z0-9_]", "_");
        if (roleRepository.findByCode(normalizedCode).isPresent()) {
            throw new BusinessException("DUPLICATE", "Un rôle avec ce code existe déjà.");
        }
        Role role = Role.builder()
                .code(normalizedCode)
                .name(name != null && !name.isBlank() ? name.trim() : normalizedCode)
                .description(description)
                .system(false)
                .permissions(new HashSet<>())
                .build();
        if (permissionCodes != null) {
            for (String permCode : permissionCodes) {
                Permission perm = permissionRepository.findByCode(permCode)
                        .orElseThrow(() -> new BusinessException("VALIDATION_ERROR", "Permission inconnue : " + permCode));
                role.getPermissions().add(perm);
            }
        }
        Role saved = roleRepository.save(role);
        auditService.record("CREATE", "ROLE", String.valueOf(saved.getId()), null, normalizedCode, request);
        return toDto(saved);
    }

    @Transactional
    public void delete(Long roleId, HttpServletRequest request) {
        Role role = roleRepository.findById(roleId)
                .orElseThrow(() -> new ResourceNotFoundException("Rôle", roleId));
        if (role.isSystem()) {
            throw new BusinessException("FORBIDDEN", "Les rôles système ne peuvent pas être supprimés.");
        }
        auditService.record("DELETE", "ROLE", String.valueOf(roleId), role.getCode(), null, request);
        roleRepository.delete(role);
    }

    private RoleDto toDto(Role role) {
        return new RoleDto(role.getId(), role.getCode(), role.getName(), role.getDescription(), role.isSystem(),
                role.getPermissions().stream().map(p -> p.getCode()).sorted().toList());
    }
}
