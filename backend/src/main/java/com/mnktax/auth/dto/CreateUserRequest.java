package com.mnktax.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.Set;

public record CreateUserRequest(
        @NotBlank(message = "Le nom d'utilisateur est requis.")
        @Size(min = 3, max = 50)
        String username,

        @NotBlank(message = "L'email est requis.")
        @Email(message = "Email invalide.")
        String email,

        @NotBlank(message = "Le mot de passe est requis.")
        @Size(min = 8, max = 100)
        String password,

        @Size(max = 80)
        String firstName,

        @Size(max = 80)
        String lastName,

        @Size(max = 30)
        String phone,

        Set<String> roleCodes
) {
}
