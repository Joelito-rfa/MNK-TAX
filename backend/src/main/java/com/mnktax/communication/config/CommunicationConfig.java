package com.mnktax.communication.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;

import java.util.Properties;

/**
 * Configuration du centre de communication :
 * - JavaMailSender construit uniquement si un SMTP est configuré (MAIL_HOST),
 * - propriétés mnk-tax.communication.* liées depuis l'environnement ou
 *   .env.local en développement.
 *
 * Si MAIL_HOST n'est pas défini, le bean mail est créé mais hors service :
 * le canal EMAIL reste "non configuré" et les envois passent en FAILED avec
 * un message clair — jamais en "envoyé".
 */
@Configuration
@EnableConfigurationProperties(CommunicationProperties.class)
public class CommunicationConfig {

    @Bean(name = "communicationMailSender")
    public JavaMailSender communicationMailSender(CommunicationProperties properties) {
        CommunicationProperties.Mail mail = properties.getMail();
        JavaMailSenderImpl sender = new JavaMailSenderImpl();
        if (!properties.isMailHostConfigured()) {
            // Hors service : inutilisable tant que MAIL_HOST n'est pas fourni.
            sender.setHost("localhost");
            return sender;
        }

        sender.setHost(mail.getHost().trim());
        sender.setPort(mail.getPort());
        String username = blankToNull(mail.getUsername());
        sender.setUsername(username);
        sender.setPassword(blankToNull(mail.getPassword()));
        sender.setDefaultEncoding("UTF-8");

        // TLS implicite : port 465 ou MAIL_SMTP_SSL=true.
        boolean ssl = mail.isSsl() || mail.getPort() == 465;
        boolean starttls = mail.isStarttls() && !ssl;
        boolean auth = mail.isSmtpAuth() && username != null;

        Properties props = sender.getJavaMailProperties();
        props.put("mail.transport.protocol", "smtp");
        props.put("mail.smtp.auth", String.valueOf(auth));
        props.put("mail.smtp.starttls.enable", String.valueOf(starttls));
        props.put("mail.smtp.starttls.required", String.valueOf(starttls));
        props.put("mail.smtp.ssl.enable", String.valueOf(ssl));
        props.put("mail.smtp.ssl.checkserveridentity", "true");
        if (!mail.getSslTrust().isBlank()) {
            props.put("mail.smtp.ssl.trust", mail.getSslTrust().trim());
        }
        if (mail.isDebug()) {
            props.put("mail.debug", "true");
        }
        props.put("mail.smtp.connectiontimeout", "10000");
        props.put("mail.smtp.timeout", "15000");
        props.put("mail.smtp.writetimeout", "15000");
        return sender;
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
