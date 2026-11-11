package com.mnktax.communication.provider;

import com.mnktax.communication.config.CommunicationProperties;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.mail.MailAuthenticationException;
import org.springframework.mail.MailParseException;
import org.springframework.mail.MailPreparationException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Envoi email réel via SMTP (spring-boot-starter-mail).
 * Les credentials proviennent exclusivement des variables d'environnement
 * (ou de .env.local en développement) :
 * MAIL_HOST, MAIL_PORT, MAIL_USERNAME, MAIL_PASSWORD, MAIL_FROM_ADDRESS, MAIL_FROM_NAME.
 *
 * Si aucun SMTP n'est configuré, isConfigured() == false et tout envoi
 * remonte en échec explicite — jamais de faux "email envoyé".
 */
@Component
@ConditionalOnProperty(prefix = "mnk-tax.communication.mail", name = "provider",
        havingValue = "smtp", matchIfMissing = true)
public class SmtpEmailProvider implements EmailProvider {

    private static final Logger log = LoggerFactory.getLogger(SmtpEmailProvider.class);

    private final JavaMailSender mailSender;
    private final CommunicationProperties properties;

    public SmtpEmailProvider(@Qualifier("communicationMailSender") JavaMailSender mailSender,
                             CommunicationProperties properties) {
        this.mailSender = mailSender;
        this.properties = properties;
        CommunicationProperties.Mail mail = properties.getMail();
        if (properties.isMailHostConfigured()) {
            log.info("Canal email réel configuré : SMTP {}:{} (expéditeur : {})",
                    mail.getHost(), mail.getPort(), mail.getFromAddress());
        } else if (properties.isDemoProviderEnabled()) {
            log.warn("Aucun SMTP configuré (MAIL_HOST absent) : mode démonstration actif, "
                    + "aucun email réel ne sera envoyé.");
        } else {
            log.warn("Aucun SMTP configuré (MAIL_HOST absent) : les envois email échoueront explicitement.");
        }
    }

    @Override
    public boolean isConfigured() {
        return properties.isMailHostConfigured() || properties.isDemoProviderEnabled();
    }

    /** Démo active uniquement lorsqu'aucun SMTP réel n'est fourni. */
    private boolean demoActive() {
        return properties.isDemoProviderEnabled() && !properties.isMailHostConfigured();
    }

    @Override
    public String providerName() {
        return demoActive() ? "DEMO (log uniquement)" : "SMTP";
    }

    @Override
    public ProviderResult send(String to, String subject, String htmlBody, String textBody,
                               List<EmailAttachment> attachments) {
        if (demoActive()) {
            log.info("[DEMO] Email simulé vers {} (sujet : {}) — aucun envoi réel", to, subject);
            return ProviderResult.ok("demo-email");
        }
        if (!isConfigured()) {
            return ProviderResult.failure("Service email non configuré (MAIL_HOST absent).", false);
        }
        try {
            MimeMessage message = mailSender.createMimeMessage();
            boolean hasAttachments = attachments != null && !attachments.isEmpty();
            // Deux corps distincts (texte + HTML) exigent un message multipart :
            // sinon MimeMessageHelper n'en conserve qu'un seul.
            boolean bothBodies = htmlBody != null && textBody != null;
            MimeMessageHelper helper = new MimeMessageHelper(message, hasAttachments || bothBodies, "UTF-8");
            helper.setFrom(properties.getMail().getFromAddress(), properties.getMail().getFromName());
            helper.setTo(to);
            helper.setSubject(subject == null ? "" : subject);
            if (bothBodies) {
                // multipart/alternative : version texte pour les clients simples, HTML sinon.
                helper.setText(textBody, htmlBody);
            } else if (htmlBody != null) {
                helper.setText(htmlBody, true);
            } else {
                helper.setText(textBody == null ? "" : textBody, false);
            }
            if (hasAttachments) {
                for (EmailAttachment attachment : attachments) {
                    ByteArrayResource resource = new ByteArrayResource(attachment.content());
                    if (attachment.inline()) {
                        // Ressource embarquée (logo) référencée par cid:<contentId>.
                        helper.addInline(attachment.contentId(), resource, attachment.mimeType());
                    } else {
                        helper.addAttachment(attachment.fileName(), resource, attachment.mimeType());
                    }
                }
            }
            mailSender.send(message);
            log.info("Email envoyé à {} (sujet : {})", to, subject);
            return ProviderResult.ok(null);
        } catch (MailAuthenticationException ex) {
            // Identifiants refusés : inutile de réessayer automatiquement.
            log.warn("Authentification SMTP refusée pour {} : {}", to, ex.getMessage());
            return ProviderResult.failure("Authentification SMTP refusée : " + ex.getMessage(), false);
        } catch (MailParseException | MailPreparationException ex) {
            log.warn("Email invalide vers {} : {}", to, ex.getMessage());
            return ProviderResult.failure("Email invalide : " + ex.getMessage(), false);
        } catch (MessagingException ex) {
            log.warn("Échec de construction de l'email vers {} : {}", to, ex.getMessage());
            return ProviderResult.failure("Email invalide : " + ex.getMessage(), false);
        } catch (org.springframework.mail.MailException ex) {
            log.warn("Échec d'envoi email vers {} : {}", to, ex.getMessage());
            // Échec réseau/SMTP → temporaire dans la plupart des cas → retry autorisé.
            return ProviderResult.failure("Échec SMTP : " + ex.getMessage(), true);
        } catch (Exception ex) {
            log.warn("Erreur inattendue d'envoi email vers {}", to, ex);
            return ProviderResult.failure("Erreur email : " + ex.getMessage(), true);
        }
    }
}
