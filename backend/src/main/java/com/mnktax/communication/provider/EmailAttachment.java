package com.mnktax.communication.provider;

/** Pièce jointe sécurisée pour un email (jamais exposée directement via URL). */
public record EmailAttachment(String fileName, String mimeType, byte[] content) {
}
