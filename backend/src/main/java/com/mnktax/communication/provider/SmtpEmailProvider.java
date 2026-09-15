package com.mnktax.communication.provider;

import com.mnktax.communication.config.CommunicationProperties;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Envoi email réel via SMTP (spring-boot-starter-mail).
 * Les credentials proviennent exclusivement des variables d'environnement :
 * MAIL_HOST, MAIL_PORT, MAIL_USERNAME, MAIL_PASSWORD, MAIL_FROM_ADDRESS, MAIL_FROM_NAME.
 *
 * Si aucun SMTP n'est configuré, isConfigured() == false et tout envoi
 * remonte en échec explicite — jamais de faux "email envoyé".
 */
@Component
public class SmtpEmailProvider implements EmailProvider {

    private static final Logger log = LoggerFactory.getLogger(SmtpEmailProvider.class);

    private final JavaMailSender mailSender;
    private final CommunicationProperties properties;

    public SmtpEmailProvider(@Qualifier("communicationMailSender") JavaMailSender mailSender,
                             CommunicationProperties properties) {
        this.mailSender = mailSender;
        this.properties = properties;
    }

    @Override
    public boolean isConfigured() {
        return properties.isMailHostConfigured();
    }

    @Override
    public String providerName() {
        return "SMTP";
    }

    @Override
    public ProviderResult send(String to, String subject, String htmlBody, String textBody,
                               List<EmailAttachment> attachments) {
        if (!isConfigured()) {
            return ProviderResult.failure("Service email non configuré (MAIL_HOST absent).", false);
        }
        try {
            MimeMessage message = mailSender.createMimeMessage();
            boolean multipart = attachments != null && !attachments.isEmpty();
            MimeMessageHelper helper = new MimeMessageHelper(message, multipart, "UTF-8");
            helper.setFrom(properties.getMail().getFromAddress(), properties.getMail().getFromName());
            helper.setTo(to);
            helper.setSubject(subject == null ? "" : subject);
            helper.setText(textBody == null ? htmlBody : textBody, htmlBody != null);
            if (multipart) {
                for (EmailAttachment attachment : attachments) {
                    helper.addAttachment(attachment.fileName(),
                            new ByteArrayResource(attachment.content()), attachment.mimeType());
                }
            }
            mailSender.send(message);
            log.info("Email envoyé à {} (sujet : {})", to, subject);
            return ProviderResult.ok(null);
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
