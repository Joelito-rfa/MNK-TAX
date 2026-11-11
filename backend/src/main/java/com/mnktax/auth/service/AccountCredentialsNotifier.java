package com.mnktax.auth.service;

import com.mnktax.auth.entity.User;
import com.mnktax.common.exception.BusinessException;
import com.mnktax.communication.config.CommunicationProperties;
import com.mnktax.communication.provider.EmailProvider;
import com.mnktax.communication.provider.ProviderResult;
import com.mnktax.communication.service.EmailTemplateRenderer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * Transmet un mot de passe temporaire par email.
 *
 * La livraison est volontairement stricte : si aucun fournisseur email réel
 * n'est configuré (ou si seul le fournisseur de démonstration, qui ne fait que
 * journaliser, est actif), l'envoi est refusé au lieu de prétendre avoir
 * communiqué un secret que l'utilisateur ne recevrait pas.
 *
 * {@link #sendTemporaryPasswordIfPossible(User, String)} permet à la
 * réinitialisation administrateur de retomber sur une remise manuelle lorsque
 * l'email n'est pas disponible, sans jamais simuler un envoi.
 */
@Service
public class AccountCredentialsNotifier {

    private static final Logger log = LoggerFactory.getLogger(AccountCredentialsNotifier.class);

    private final EmailProvider emailProvider;
    private final EmailTemplateRenderer emailRenderer;
    private final CommunicationProperties properties;

    public AccountCredentialsNotifier(EmailProvider emailProvider,
                                      EmailTemplateRenderer emailRenderer,
                                      CommunicationProperties properties) {
        this.emailProvider = emailProvider;
        this.emailRenderer = emailRenderer;
        this.properties = properties;
    }

    /**
     * Envoie le mot de passe temporaire par email, ou échoue explicitement.
     *
     * @throws BusinessException si l'adresse manque ou si aucun fournisseur réel n'est configuré
     */
    public void sendTemporaryPassword(User user, String temporaryPassword) {
        if (user.getEmail() == null || user.getEmail().isBlank()) {
            throw new BusinessException("EMAIL_MISSING",
                    "Aucune adresse email n'est renseignée pour ce compte : impossible d'envoyer le mot de passe temporaire.");
        }
        if (!isProviderReady()) {
            throw new BusinessException("EMAIL_NOT_CONFIGURED",
                    "Aucun fournisseur email réel n'est configuré : le mot de passe temporaire ne peut pas être envoyé. "
                            + "Configurez un fournisseur email (MAIL_HOST ou MAILERSEND_API_TOKEN) puis réessayez.");
        }
        deliver(user, temporaryPassword);
    }

    /**
     * Envoie le mot de passe temporaire si un fournisseur réel est disponible.
     *
     * @return {@code true} si l'email a été remis au fournisseur, {@code false}
     *         lorsqu'aucune adresse ou aucun SMTP réel n'est configuré (l'appelant
     *         doit alors remettre le secret par un autre canal)
     */
    public boolean sendTemporaryPasswordIfPossible(User user, String temporaryPassword) {
        if (!isEmailAvailable(user)) {
            log.warn("Aucun envoi email possible pour le compte {} (adresse ou fournisseur manquant) : "
                    + "remise manuelle du mot de passe temporaire.", user.getUsername());
            return false;
        }
        deliver(user, temporaryPassword);
        return true;
    }

    private boolean isEmailAvailable(User user) {
        return user.getEmail() != null && !user.getEmail().isBlank() && isProviderReady();
    }

    /** Un fournisseur réel (SMTP), jamais le mode démonstration qui ne journalise que. */
    private boolean isProviderReady() {
        return emailProvider.isConfigured() && !emailProvider.providerName().startsWith("DEMO");
    }

    private void deliver(User user, String temporaryPassword) {
        String subject = "MNK-TAX — Votre mot de passe temporaire";
        String textBody = "Bonjour " + displayName(user) + ",\n\n"
                + "Un administrateur a réinitialisé le mot de passe de votre compte MNK-TAX.\n\n"
                + "Identifiant : " + user.getUsername() + "\n"
                + "Mot de passe temporaire : " + temporaryPassword + "\n\n"
                + "Ce mot de passe est personnel et à usage unique : vous devrez le changer "
                + "dès votre prochaine connexion. Si vous n'êtes pas à l'origine de cette demande, "
                + "contactez immédiatement l'administration fiscale.\n\n"
                + "— MNK-TAX, Administration fiscale";
        String htmlBody = emailRenderer.render(
                "Votre mot de passe temporaire",
                textBody,
                "Se connecter",
                loginUrl(),
                "Identifiant : " + user.getUsername());

        ProviderResult result = emailProvider.send(
                user.getEmail(), subject, htmlBody, textBody, emailRenderer.inlineAssets());
        if (!result.success()) {
            log.warn("Échec de l'envoi du mot de passe temporaire à {} (compte {}) : {}",
                    user.getEmail(), user.getUsername(), result.error());
            throw new BusinessException("EMAIL_SEND_FAILED",
                    "Le mot de passe temporaire n'a pas pu être envoyé par email. Réessayez ou contactez l'administrateur.");
        }
        log.info("Mot de passe temporaire envoyé par email à {} (compte {})",
                user.getEmail(), user.getUsername());
    }

    private String loginUrl() {
        String baseUrl = properties.getMail().getBaseUrl();
        if (baseUrl == null || baseUrl.isBlank()) {
            return null;
        }
        return baseUrl.endsWith("/") ? baseUrl + "login" : baseUrl + "/login";
    }

    private static String displayName(User user) {
        String first = user.getFirstName() == null ? "" : user.getFirstName().trim();
        String last = user.getLastName() == null ? "" : user.getLastName().trim();
        String full = (first + " " + last).trim();
        return full.isEmpty() ? user.getUsername() : full;
    }
}
