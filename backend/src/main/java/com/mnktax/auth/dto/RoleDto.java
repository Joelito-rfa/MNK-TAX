package com.mnktax.auth.dto;

import java.util.List;

public record RoleDto(
        Long id,
        String code,
        String name,
        String description,
        boolean system,
        List<String> permissions
) {
}
