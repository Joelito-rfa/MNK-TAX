package com.mnktax.document.controller;

import com.mnktax.auth.security.Permissions;
import com.mnktax.document.dto.DocumentDtos.DocumentDto;
import com.mnktax.document.entity.Document;
import com.mnktax.document.service.DocumentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

@RestController
@RequestMapping("/api/documents")
@Tag(name = "Documents", description = "Pièces jointes d'un dossier contribuable")
public class DocumentController {

    private final DocumentService documentService;

    public DocumentController(DocumentService documentService) {
        this.documentService = documentService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('" + Permissions.TAXPAYER_READ + "')")
    @Operation(summary = "Lister les documents d'un contribuable")
    public ResponseEntity<List<DocumentDto>> list(@RequestParam Long taxpayerId) {
        return ResponseEntity.ok(documentService.listByTaxpayer(taxpayerId));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('" + Permissions.TAXPAYER_WRITE + "')")
    @Operation(summary = "Téléverser un document")
    public ResponseEntity<DocumentDto> upload(@RequestParam Long taxpayerId,
                                              @RequestParam String title,
                                              @RequestParam(required = false) String documentType,
                                              @RequestParam MultipartFile file,
                                              HttpServletRequest http) {
        return ResponseEntity.ok(documentService.upload(taxpayerId, title, documentType, file, http));
    }

    @GetMapping("/{id}/content")
    @PreAuthorize("hasAuthority('" + Permissions.TAXPAYER_READ + "')")
    @Operation(summary = "Télécharger le contenu d'un document")
    public ResponseEntity<byte[]> content(@PathVariable Long id) throws Exception {
        Path path = documentService.download(id);
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(Files.readAllBytes(path));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('" + Permissions.TAXPAYER_DELETE + "')")
    @Operation(summary = "Supprimer un document")
    public ResponseEntity<Void> delete(@PathVariable Long id, HttpServletRequest http) {
        documentService.delete(id, http);
        return ResponseEntity.noContent().build();
    }
}
