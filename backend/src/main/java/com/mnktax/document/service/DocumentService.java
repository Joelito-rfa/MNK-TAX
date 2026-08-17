package com.mnktax.document.service;

import com.mnktax.audit.service.AuditService;
import com.mnktax.common.exception.BusinessException;
import com.mnktax.common.exception.ResourceNotFoundException;
import com.mnktax.common.util.SecurityUtils;
import com.mnktax.document.dto.DocumentDtos.DocumentDto;
import com.mnktax.document.entity.Document;
import com.mnktax.document.repository.DocumentRepository;
import com.mnktax.taxpayer.entity.Taxpayer;
import com.mnktax.taxpayer.repository.TaxpayerRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class DocumentService {

    private final DocumentRepository documentRepository;
    private final TaxpayerRepository taxpayerRepository;
    private final AuditService auditService;

    @Value("${mnk-tax.document.storage-dir:./data/documents}")
    private String storageDir;

    public DocumentService(DocumentRepository documentRepository, TaxpayerRepository taxpayerRepository,
                           AuditService auditService) {
        this.documentRepository = documentRepository;
        this.taxpayerRepository = taxpayerRepository;
        this.auditService = auditService;
    }

    @Transactional
    public DocumentDto upload(Long taxpayerId, String title, String documentType, MultipartFile file,
                              HttpServletRequest http) {
        Taxpayer taxpayer = taxpayerRepository.findById(taxpayerId)
                .orElseThrow(() -> new ResourceNotFoundException("Contribuable", taxpayerId));
        if (file.isEmpty()) {
            throw new BusinessException("EMPTY_FILE", "Le fichier est vide.");
        }
        try {
            Path dir = Path.of(storageDir, taxpayer.getNif()).toAbsolutePath();
            Files.createDirectories(dir);
            String filename = UUID.randomUUID().toString() + "-" + sanitize(file.getOriginalFilename());
            Path target = dir.resolve(filename);
            file.transferTo(target);

            Document document = Document.builder()
                    .taxpayer(taxpayer)
                    .title(title)
                    .documentType(documentType)
                    .filePath(target.toString())
                    .mimeType(file.getContentType())
                    .size(file.getSize())
                    .uploadedBy(SecurityUtils.currentUsername())
                    .createdAt(Instant.now())
                    .build();
            Document saved = documentRepository.save(document);
            auditService.record("CREATE", "DOCUMENT", String.valueOf(saved.getId()), null, title, http);
            return DocumentDto.from(saved);
        } catch (IOException ex) {
            throw new BusinessException("UPLOAD_ERROR", "Erreur de sauvegarde du fichier : " + ex.getMessage());
        }
    }

    @Transactional(readOnly = true)
    public List<DocumentDto> listByTaxpayer(Long taxpayerId) {
        return documentRepository.findByTaxpayerIdOrderByIdDesc(taxpayerId).stream()
                .map(DocumentDto::from)
                .toList();
    }

    public Path download(Long id) {
        Document document = documentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Document", id));
        return Path.of(document.getFilePath());
    }

    @Transactional
    public void delete(Long id, HttpServletRequest http) {
        Document document = documentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Document", id));
        try {
            Files.deleteIfExists(Path.of(document.getFilePath()));
        } catch (IOException ignored) {
        }
        documentRepository.delete(document);
        auditService.record("DELETE", "DOCUMENT", String.valueOf(id), null, null, http);
    }

    private String sanitize(String name) {
        if (name == null) {
            return "file";
        }
        return name.replaceAll("[^a-zA-Z0-9._-]", "_");
    }
}
