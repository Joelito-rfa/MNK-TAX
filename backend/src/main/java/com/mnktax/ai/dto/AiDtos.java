package com.mnktax.ai.dto;

import jakarta.validation.constraints.NotBlank;

import java.util.List;

public final class AiDtos {

    private AiDtos() {
    }

    public record ChatMessage(String role, String content) {
    }

    public record ChatRequest(
            @NotBlank(message = "Le message est requis.") String message,
            List<ChatMessage> history
    ) {
    }

    public record ChatResponse(String reply) {
    }

    public record ErrorResponse(String error) {
    }
}
