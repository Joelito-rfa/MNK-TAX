package com.mnktax.message.controller;

import com.mnktax.auth.security.Permissions;
import com.mnktax.message.dto.MessageDtos.MessageDto;
import com.mnktax.message.dto.MessageDtos.SendMessageRequest;
import com.mnktax.message.service.MessageService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/messages")
@Tag(name = "Messages", description = "Messagerie interne entre utilisateurs")
public class MessageController {

    private final MessageService messageService;

    public MessageController(MessageService messageService) {
        this.messageService = messageService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('" + Permissions.MESSAGE_READ + "')")
    @Operation(summary = "Mes messages reçus")
    public ResponseEntity<Page<MessageDto>> myMessages(@PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(messageService.myMessages(pageable));
    }

    @GetMapping("/unread-count")
    @PreAuthorize("hasAuthority('" + Permissions.MESSAGE_READ + "')")
    @Operation(summary = "Nombre de messages non lus")
    public ResponseEntity<Map<String, Long>> unreadCount() {
        return ResponseEntity.ok(Map.of("count", messageService.unreadCount()));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('" + Permissions.MESSAGE_WRITE + "')")
    @Operation(summary = "Envoyer un message")
    public ResponseEntity<MessageDto> send(@Valid @RequestBody SendMessageRequest request) {
        return ResponseEntity.ok(messageService.send(request));
    }

    @PostMapping("/{id}/read")
    @PreAuthorize("hasAuthority('" + Permissions.MESSAGE_READ + "')")
    @Operation(summary = "Marquer un message comme lu")
    public ResponseEntity<Void> markRead(@PathVariable Long id) {
        messageService.markRead(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/read-all")
    @PreAuthorize("hasAuthority('" + Permissions.MESSAGE_READ + "')")
    @Operation(summary = "Marquer tous mes messages comme lus")
    public ResponseEntity<Void> markAllRead() {
        messageService.markAllRead();
        return ResponseEntity.noContent().build();
    }
}
