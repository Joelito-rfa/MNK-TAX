package com.mnktax.communication.provider;

/**
 * Résultat brut d'un envoi vers un fournisseur externe (email / SMS).
 * Aucune ambiguïté : soit le fournisseur a confirmé la transmission,
 * soit l'envoi est un échec avec la raison.
 */
public record ProviderResult(
        boolean success,
        String providerMessageId,
        String error,
        /** true si l'erreur est temporaire → retry automatique autorisé. */
        boolean retryable
) {
    public static ProviderResult ok(String providerMessageId) {
        return new ProviderResult(true, providerMessageId, null, false);
    }

    public static ProviderResult failure(String error, boolean retryable) {
        return new ProviderResult(false, null, error, retryable);
    }
}
