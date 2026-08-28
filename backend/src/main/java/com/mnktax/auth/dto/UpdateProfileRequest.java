package com.mnktax.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;

public record UpdateProfileRequest(
        @Email(message = "Email invalide.")
        @Size(max = 120)
        String email,

        @Size(max = 80)
        String firstName,

        @Size(max = 80)
        String lastName,

        @Size(max = 30)
        String phone
) {
}
