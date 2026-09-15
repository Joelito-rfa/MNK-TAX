package com.mnktax.communication.provider;

/**
 * Abstraction du canal SMS — le fournisseur (Twilio aujourd'hui, un autre
 * opérateur local demain) est remplaçable sans modifier l'application.
 */
public interface SmsProvider {

    boolean isConfigured();

    String providerName();

    /** Envoi réel d'un SMS vers un numéro normalisé E.164 (+261…). */
    ProviderResult send(String toNormalized, String text);
}
