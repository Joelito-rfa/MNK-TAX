package com.mnktax.auth.dto;

import com.mnktax.auth.entity.Permission;
import com.mnktax.auth.entity.Role;
import com.mnktax.auth.entity.User;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;

public record UserDto(
        Long id,
        String username,
        String email,
        String firstName,
        String lastName,
        String phone,
        String jobTitle,
        String taxCenter,
        boolean hasAvatar,
        boolean enabled,
        boolean mfaEnabled,
        Instant lastLoginAt,
        String lastLoginIp,
        String lastLoginUserAgent,
        Instant createdAt,
        List<String> roles,
        List<String> permissions
) {

    public static UserDto from(User user) {
        List<String> roles = user.getRoles().stream()
                .map(Role::getCode)
                .sorted()
                .toList();
        List<String> permissions = user.getRoles().stream()
                .flatMap(r -> r.getPermissions().stream())
                .map(Permission::getCode)
                .distinct()
                .sorted()
                .toList();
        return new UserDto(user.getId(), user.getUsername(), user.getEmail(), user.getFirstName(),
                user.getLastName(), user.getPhone(), user.getJobTitle(), user.getTaxCenter(),
                user.getAvatarPath() != null && !user.getAvatarPath().isBlank(),
                user.isEnabled(), user.isMfaEnabled(),
                user.getLastLoginAt(), user.getLastLoginIp(), user.getLastLoginUserAgent(),
                user.getCreatedAt(), roles, permissions);
    }
}
