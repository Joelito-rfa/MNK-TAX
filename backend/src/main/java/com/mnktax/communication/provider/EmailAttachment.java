package com.mnktax.communication.provider;

/**
 * Pièce jointe sécurisée pour un email (jamais exposée directement via URL).
 *
 * <p>Un {@code contentId} non vide transforme la pièce jointe en ressource
 * embarquée (inline), utilisable dans le HTML via {@code cid:<contentId>}.
 * Cela permet notamment d'afficher le logo MNK-TAX sans dépendre d'une URL
 * publique ni du réseau du destinataire.</p>
 */
public record EmailAttachment(String fileName, String mimeType, byte[] content, String contentId) {

    /** Pièce jointe classique (non embarquée). */
    public EmailAttachment(String fileName, String mimeType, byte[] content) {
        this(fileName, mimeType, content, null);
    }

    public boolean inline() {
        return contentId != null && !contentId.isBlank();
    }
}
