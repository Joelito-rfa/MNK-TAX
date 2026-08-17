package com.mnktax.auth.service;

import com.mnktax.audit.service.AuditService;
import com.mnktax.auth.dto.RoleDto;
import com.mnktax.auth.entity.Role;
import com.mnktax.auth.repository.RoleRepository;
import com.mnktax.common.exception.BusinessException;
import com.mnktax.common.exception.ResourceNotFoundException;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class RoleService {

    private final RoleRepository roleRepository;
    private final AuditService auditService;

    public RoleService(RoleRepository roleRepository, AuditService auditService) {
        this.roleRepository = roleRepository;
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
        auditService.record("RULE_CHANGE", "ROLE", String.valueOf(roleId), old, permissionCodes, request);
        Role saved = roleRepository.save(role);
        return toDto(saved);
    }

    private RoleDto toDto(Role role) {
        return new RoleDto(role.getId(), role.getCode(), role.getName(), role.getDescription(), role.isSystem(),
                role.getPermissions().stream().map(p -> p.getCode()).sorted().toList());
    }
}
