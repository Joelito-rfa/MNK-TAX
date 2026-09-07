package com.mnktax.ai.controller;

import com.mnktax.ai.dto.AiDtos.ChatRequest;
import com.mnktax.ai.dto.AiDtos.ChatResponse;
import com.mnktax.ai.service.AiService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/ai")
@Tag(name = "M-TAX AI", description = "Discussion avec l'assistant intelligent M-TAX AI")
public class AiController {

    private final AiService aiService;

    public AiController(AiService aiService) {
        this.aiService = aiService;
    }

    @PostMapping("/chat")
    @Operation(summary = "Envoyer un message à M-TAX AI et obtenir une réponse")
    public ResponseEntity<ChatResponse> chat(@Valid @RequestBody ChatRequest request) {
        String reply = aiService.chat(request.message(), request.history());
        return ResponseEntity.ok(new ChatResponse(reply));
    }
}
