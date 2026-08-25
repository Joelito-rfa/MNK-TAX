package com.mnktax.message.controller;

import com.mnktax.auth.security.Permissions;
import com.mnktax.message.dto.MessageDtos.AttachmentDto;
import com.mnktax.message.dto.MessageDtos.MessageDto;
import com.mnktax.message.dto.MessageDtos.MessageFilterRequest;
import com.mnktax.message.dto.MessageDtos.MessageStatsDto;
import com.mnktax.message.dto.MessageDtos.SendMessageRequest;
import com.mnktax.message.service.MessageService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/messages")
@Tag(name = "Messages", description = "Messagerie fiscale contextuelle")
public class MessageController {

    private final MessageService messageService;

    public MessageController(MessageService messageService) {
        this.messageService = messageService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('" + Permissions.MESSAGE_READ + "')")
    @Operation(summary = "Mes messages reçus (avec filtres)")
    public ResponseEntity<Page<MessageDto>> myMessages(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String readStatus,
            @RequestParam(required = false) String processingStatus,
            @RequestParam(required = false) String priority,
            @RequestParam(required = false) String contextType,
            @RequestParam(required = false) Long taxpayerId,
            @PageableDefault(size = 20) Pageable pageable) {
        MessageFilterRequest filter = new MessageFilterRequest(search, readStatus, processingStatus,
                priority != null ? com.mnktax.message.entity.MessagePriority.valueOf(priority) : null,
                contextType != null ? com.mnktax.message.entity.MessageContextType.valueOf(contextType) : null,
                taxpayerId);
        return ResponseEntity.ok(messageService.myMessages(filter, pageable));
    }

    @GetMapping("/sent")
    @PreAuthorize("hasAuthority('" + Permissions.MESSAGE_READ + "')")
    @Operation(summary = "Mes messages envoyés")
    public ResponseEntity<Page<MessageDto>> mySentMessages(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String processingStatus,
            @RequestParam(required = false) String priority,
            @RequestParam(required = false) String contextType,
            @PageableDefault(size = 20) Pageable pageable) {
        MessageFilterRequest filter = new MessageFilterRequest(search, null, processingStatus,
                priority != null ? com.mnktax.message.entity.MessagePriority.valueOf(priority) : null,
                contextType != null ? com.mnktax.message.entity.MessageContextType.valueOf(contextType) : null,
                null);
        return ResponseEntity.ok(messageService.mySentMessages(filter, pageable));
    }

    @GetMapping("/archived")
    @PreAuthorize("hasAuthority('" + Permissions.MESSAGE_READ + "')")
    @Operation(summary = "Messages archivés")
    public ResponseEntity<Page<MessageDto>> archivedMessages(@PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(messageService.archivedMessages(pageable));
    }

    @GetMapping("/stats")
    @PreAuthorize("hasAuthority('" + Permissions.MESSAGE_READ + "')")
    @Operation(summary = "Statistiques des messages")
    public ResponseEntity<MessageStatsDto> stats() {
        return ResponseEntity.ok(messageService.stats());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('" + Permissions.MESSAGE_READ + "')")
    @Operation(summary = "Détail d'un message")
    public ResponseEntity<MessageDto> getMessage(@PathVariable Long id) {
        return ResponseEntity.ok(messageService.getMessage(id));
    }

    @GetMapping("/{id}/thread")
    @PreAuthorize("hasAuthority('" + Permissions.MESSAGE_READ + "')")
    @Operation(summary = "Conversation (thread) complète")
    public ResponseEntity<List<MessageDto>> getThread(@PathVariable Long id) {
        return ResponseEntity.ok(messageService.getThread(id));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('" + Permissions.MESSAGE_WRITE + "')")
    @Operation(summary = "Envoyer un message")
    public ResponseEntity<MessageDto> send(@Valid @RequestBody SendMessageRequest request,
                                           HttpServletRequest httpRequest) {
        return ResponseEntity.ok(messageService.send(request, httpRequest));
    }

    @PostMapping("/{id}/read")
    @PreAuthorize("hasAuthority('" + Permissions.MESSAGE_READ + "')")
    @Operation(summary = "Marquer un message comme lu")
    public ResponseEntity<Void> markRead(@PathVariable Long id, HttpServletRequest httpRequest) {
        messageService.markRead(id, httpRequest);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/thread-read")
    @PreAuthorize("hasAuthority('" + Permissions.MESSAGE_READ + "')")
    @Operation(summary = "Marquer tout un thread comme lu")
    public ResponseEntity<Void> markThreadRead(@PathVariable Long id, HttpServletRequest httpRequest) {
        messageService.markThreadRead(id, httpRequest);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/read-all")
    @PreAuthorize("hasAuthority('" + Permissions.MESSAGE_READ + "')")
    @Operation(summary = "Marquer tous mes messages comme lus")
    public ResponseEntity<Void> markAllRead(HttpServletRequest httpRequest) {
        messageService.markAllRead(httpRequest);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/archive")
    @PreAuthorize("hasAuthority('" + Permissions.MESSAGE_WRITE + "')")
    @Operation(summary = "Archiver un message")
    public ResponseEntity<Void> archive(@PathVariable Long id, HttpServletRequest httpRequest) {
        messageService.archive(id, httpRequest);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/unarchive")
    @PreAuthorize("hasAuthority('" + Permissions.MESSAGE_WRITE + "')")
    @Operation(summary = "Désarchiver un message")
    public ResponseEntity<Void> unarchive(@PathVariable Long id, HttpServletRequest httpRequest) {
        messageService.unarchive(id, httpRequest);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/close")
    @PreAuthorize("hasAuthority('" + Permissions.MESSAGE_WRITE + "')")
    @Operation(summary = "Fermer une conversation")
    public ResponseEntity<Void> close(@PathVariable Long id, HttpServletRequest httpRequest) {
        messageService.close(id, httpRequest);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/reopen")
    @PreAuthorize("hasAuthority('" + Permissions.MESSAGE_WRITE + "')")
    @Operation(summary = "Rouvrir une conversation")
    public ResponseEntity<Void> reopen(@PathVariable Long id, HttpServletRequest httpRequest) {
        messageService.reopen(id, httpRequest);
        return ResponseEntity.noContent().build();
    }

    @PostMapping(value = "/{id}/attachments", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAuthority('" + Permissions.MESSAGE_WRITE + "')")
    @Operation(summary = "Joindre un fichier à un message")
    public ResponseEntity<AttachmentDto> uploadAttachment(
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file,
            HttpServletRequest httpRequest) {
        return ResponseEntity.ok(messageService.uploadAttachment(id, file, httpRequest));
    }

    @GetMapping("/attachments/{attachmentId}")
    @PreAuthorize("hasAuthority('" + Permissions.MESSAGE_READ + "')")
    @Operation(summary = "Télécharger une pièce jointe")
    public ResponseEntity<Resource> downloadAttachment(@PathVariable Long attachmentId) {
        return messageService.downloadAttachment(attachmentId);
    }

    @GetMapping("/unread-count")
    @PreAuthorize("hasAuthority('" + Permissions.MESSAGE_READ + "')")
    @Operation(summary = "Nombre de messages non lus")
    public ResponseEntity<Map<String, Long>> unreadCount() {
        return ResponseEntity.ok(Map.of("count", messageService.stats().unreadCount()));
    }
}
