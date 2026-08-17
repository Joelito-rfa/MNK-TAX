package com.mnktax.document.dto;

import com.mnktax.document.entity.Document;

import java.time.Instant;

public final class DocumentDtos {

    private DocumentDtos() {
    }

    public record DocumentDto(Long id, Long taxpayerId, String taxpayerNif, String taxpayerName,
                              String title, String documentType, String mimeType, long size,
                              String uploadedBy, Instant createdAt) {
        public static DocumentDto from(Document d) {
            return new DocumentDto(d.getId(), d.getTaxpayer().getId(), d.getTaxpayer().getNif(),
                    d.getTaxpayer().getName(), d.getTitle(), d.getDocumentType(), d.getMimeType(),
                    d.getSize(), d.getUploadedBy(), d.getCreatedAt());
        }
    }
}
