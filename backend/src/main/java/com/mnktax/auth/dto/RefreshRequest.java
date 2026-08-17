package com.mnktax.auth.dto;

import jakarta.validation.constraints.NotBlank;

public record RefreshRequest(
        @NotBlank(message = "Le refresh token est requis.")
        String refreshToken
) {
}
