package com.mnktax.communication.provider;

/**
 * Abstraction du canal email — remplaçable sans toucher au reste du module
 * (SMTP aujourd'hui, SendGrid/SES/… demain).
 */
public interface EmailProvider {

    /** true si un service email réel est configuré (SMTP ou API). */
    boolean isConfigured();

    String providerName();

    /**
     * Envoi réel d'un email. Retourne toujours le résultat du fournisseur ;
     * ne jette pas — les erreurs sont portées par ProviderResult.
     */
    ProviderResult send(String to, String subject, String htmlBody, String textBody,
                        java.util.List<com.mnktax.communication.provider.EmailAttachment> attachments);
}
