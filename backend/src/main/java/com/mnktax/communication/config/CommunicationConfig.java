package com.mnktax.communication.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;

import java.util.Properties;

/**
 * Configuration du centre de communication :
 * - JavaMailSender construit uniquement si un SMTP est configuré (variables d'env),
 * - TaskScheduler dédié aux files d'envoi (worker + dispatcher programmé),
 * - propriétés mnk-tax.communication.*.
 *
 * Si MAIL_HOST n'est pas défini, le bean mail est créé mais hors service :
 * le canal EMAIL reste "non configuré" et les envois passent en FAILED avec
 * un message clair — jamais en "envoyé".
 */
@Configuration
@EnableConfigurationProperties(CommunicationProperties.class)
public class CommunicationConfig {

    /** true si un SMTP réel est configuré via l'environnement. */
    public static boolean mailConfigured(String host) {
        return host != null && !host.isBlank();
    }

    @Bean(name = "communicationMailSender")
    public JavaMailSender communicationMailSender(
            @Value("${MAIL_HOST:}") String host,
            @Value("${MAIL_PORT:587}") int port,
            @Value("${MAIL_USERNAME:}") String username,
            @Value("${MAIL_PASSWORD:}") String password,
            @Value("${MAIL_SMTP_AUTH:true}") boolean smtpAuth,
            @Value("${MAIL_SMTP_STARTTLS:true}") boolean startTls) {

        JavaMailSenderImpl sender = new JavaMailSenderImpl();
        if (!mailConfigured(host)) {
            // Hors service : inutilisable tant que MAIL_HOST n'est pas fourni.
            sender.setHost("localhost");
            return sender;
        }
        sender.setHost(host);
        sender.setPort(port);
        sender.setUsername(username == null || username.isBlank() ? null : username);
        sender.setPassword(password == null || password.isBlank() ? null : password);
        sender.setDefaultEncoding("UTF-8");

        Properties props = sender.getJavaMailProperties();
        props.put("mail.transport.protocol", "smtp");
        props.put("mail.smtp.auth", String.valueOf(smtpAuth));
        props.put("mail.smtp.starttls.enable", String.valueOf(startTls));
        props.put("mail.smtp.connectiontimeout", "10000");
        props.put("mail.smtp.timeout", "15000");
        props.put("mail.smtp.writetimeout", "15000");
        return sender;
    }
}
