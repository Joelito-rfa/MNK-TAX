package com.mnktax.communication.provider;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mnktax.communication.config.CommunicationProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

import java.util.ArrayList;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Envoi email réel via l'API HTTP MailerSend.
 *
 * <p>Alternative au SMTP : sélectionnée avec {@code MAIL_PROVIDER=mailersend}.
 * Le jeton et l'expéditeur proviennent exclusivement de la configuration
 * ({@code MAILERSEND_API_TOKEN}, {@code MAIL_FROM_ADDRESS}). Aucun secret
 * n'est exposé dans les logs ni dans les réponses API.</p>
 */
@Component
@ConditionalOnProperty(prefix = "mnk-tax.communication.mail", name = "provider", havingValue = "mailersend")
public class MailerSendEmailProvider implements EmailProvider {

    private static final Logger log = LoggerFactory.getLogger(MailerSendEmailProvider.class);

    private final CommunicationProperties properties;
    private final ObjectMapper objectMapper;
    private final RestClient restClient;

    @Autowired
    public MailerSendEmailProvider(CommunicationProperties properties, ObjectMapper objectMapper) {
        this(properties, objectMapper, RestClient.builder()
                .requestFactory(httpRequestFactory())
                .build());
    }

    /** Délais courts : le contrôle de domaine ne doit jamais bloquer durablement le démarrage. */
    private static SimpleClientHttpRequestFactory httpRequestFactory() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5_000);
        factory.setReadTimeout(10_000);
        return factory;
    }

    /** Constructeur de test : permet d'injecter un client mocké. */
    MailerSendEmailProvider(CommunicationProperties properties, ObjectMapper objectMapper,
                            RestClient restClient) {
        this.properties = properties;
        this.objectMapper = objectMapper;
        this.restClient = restClient;
        if (isConfigured()) {
            log.info("Canal email réel configuré : API MailerSend (expéditeur : {})",
                    properties.getMail().getFromAddress());
            if (properties.isMailerSendTrialSender()) {
                log.warn("MailerSend utilise encore son domaine d'essai ({}). "
                                + "Le compte sandbox est limité à 2 destinataires uniques : vérifiez un "
                                + "domaine d'envoi dans MailerSend, puis renseignez MAIL_FROM_ADDRESS "
                                + "avec une adresse de ce domaine.",
                        properties.getMail().getFromAddress());
            }
        } else {
            log.warn("Canal email MailerSend sélectionné mais incomplet : "
                    + "MAILERSEND_API_TOKEN ou MAIL_FROM_ADDRESS absent.");
        }
    }

    @Override
    public boolean isConfigured() {
        CommunicationProperties.Mail mail = properties.getMail();
        return notBlank(mail.getApiToken())
                && notBlank(mail.getFromAddress())
                && notBlank(mail.getApiUrl());
    }

    @Override
    public String providerName() {
        return "MAILERSEND";
    }

    @Override
    public ProviderResult send(String to, String subject, String htmlBody, String textBody,
                               List<EmailAttachment> attachments) {
        if (!isConfigured()) {
            return ProviderResult.failure(
                    "Service email non configuré (MAILERSEND_API_TOKEN ou MAIL_FROM_ADDRESS absent).", false);
        }
        if (!notBlank(to)) {
            return ProviderResult.failure("Adresse email du destinataire inconnue.", false);
        }

        CommunicationProperties.Mail mail = properties.getMail();
        try {
            Map<String, Object> payload = buildPayload(mail, to, subject, htmlBody, textBody, attachments);
            ResponseEntity<Void> response = restClient.post()
                    .uri(mail.getApiUrl())
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + mail.getApiToken().trim())
                    .contentType(MediaType.APPLICATION_JSON)
                    .accept(MediaType.APPLICATION_JSON)
                    .body(payload)
                    .retrieve()
                    .toBodilessEntity();

            String messageId = response.getHeaders().getFirst("x-message-id");
            log.info("Email MailerSend accepté pour {} (id : {})", to, messageId);
            return ProviderResult.ok(messageId);
        } catch (RestClientResponseException ex) {
            int status = ex.getStatusCode().value();
            String detail = actionableError(errorDetail(ex));
            boolean retryable = status == 429 || status >= 500;
            log.warn("Échec MailerSend (HTTP {}) vers {} : {}", status, to, detail);
            return ProviderResult.failure("Échec MailerSend (HTTP " + status + ") : " + detail, retryable);
        } catch (RestClientException ex) {
            log.warn("Erreur réseau MailerSend vers {} : {}", to, ex.getMessage());
            return ProviderResult.failure("Erreur réseau MailerSend : " + ex.getMessage(), true);
        } catch (Exception ex) {
            log.warn("Erreur inattendue MailerSend vers {}", to, ex);
            return ProviderResult.failure("Erreur email : " + ex.getMessage(), false);
        }
    }

    private Map<String, Object> buildPayload(CommunicationProperties.Mail mail, String to,
                                             String subject, String htmlBody, String textBody,
                                             List<EmailAttachment> attachments) {
        Map<String, Object> payload = new LinkedHashMap<>();
        Map<String, String> from = new LinkedHashMap<>();
        from.put("email", mail.getFromAddress().trim());
        if (notBlank(mail.getFromName())) {
            from.put("name", mail.getFromName().trim());
        }
        payload.put("from", from);
        payload.put("to", List.of(Map.of("email", to.trim())));
        payload.put("subject", subject == null ? "" : subject);

        if (htmlBody != null) {
            payload.put("html", htmlBody);
        }
        if (textBody != null) {
            payload.put("text", textBody);
        }
        if (htmlBody == null && textBody == null) {
            payload.put("text", "");
        }

        if (attachments != null && !attachments.isEmpty()) {
            List<Map<String, String>> items = new ArrayList<>();
            for (EmailAttachment attachment : attachments) {
                Map<String, String> item = new LinkedHashMap<>();
                item.put("content", Base64.getEncoder().encodeToString(attachment.content()));
                item.put("filename", attachment.fileName());
                if (attachment.inline()) {
                    // Ressource embarquée (logo) référencée par cid:<contentId>.
                    item.put("disposition", "inline");
                    item.put("id", attachment.contentId());
                } else {
                    item.put("disposition", "attachment");
                }
                items.add(item);
            }
            payload.put("attachments", items);
        }
        return payload;
    }

    /**
     * Traduit les refus récurrents de MailerSend en consigne actionnable : un
     * compte en mode sandbox (domaine d'essai) n'accepte que 2 destinataires
     * uniques, et le domaine expéditeur doit être vérifié. Le message d'origine
     * reste inclus pour la traçabilité.
     */
    private String actionableError(String detail) {
        String normalized = detail == null ? "" : detail.toLowerCase(java.util.Locale.ROOT);
        if (normalized.contains("ms42225")
                || normalized.contains("sandbox account unique recipients")) {
            return detail + " — Compte MailerSend en mode sandbox : 2 destinataires uniques "
                    + "maximum. Vérifiez un domaine d'envoi dans MailerSend (Email → Domains), "
                    + "renseignez MAIL_FROM_ADDRESS avec une adresse de ce domaine, puis "
                    + "redémarrez le backend.";
        }
        if (normalized.contains("ms42212")
                || normalized.contains("must be one of the verified domains")
                || normalized.contains("domain on the from.email must be verified")) {
            return detail + " — Le domaine expéditeur n'est pas vérifié dans MailerSend. "
                    + "Vérifiez-le dans Email → Domains et utilisez une adresse "
                    + "MAIL_FROM_ADDRESS sur ce domaine.";
        }
        return detail;
    }

    /**
     * Contrôle au démarrage : interroge l'API Domains de MailerSend et journalise
     * clairement l'état de vérification du domaine expéditeur (VÉRIFIÉ, présent
     * mais NON VÉRIFIÉ, ABSENT du compte, ou contrôle impossible). Aucun secret
     * n'est journalisé et une API injoignable n'empêche pas le démarrage.
     */
    @EventListener(ApplicationReadyEvent.class)
    public void logSendingDomainStatus() {
        if (!isConfigured()) {
            return;
        }
        SendingDomainStatus status = checkSendingDomain();
        if (status.error() != null) {
            log.warn("Contrôle du domaine d'envoi MailerSend impossible pour {} : {}",
                    status.domain(), status.error());
        } else if (!status.found()) {
            log.warn("Contrôle domaine MailerSend : {} n'est pas rattaché à ce compte — "
                    + "ajoutez-le dans Email → Domains, publiez les enregistrements DNS "
                    + "puis cliquez Verify domain avant tout envoi réel.", status.domain());
        } else if (!status.verified()) {
            log.warn("Contrôle domaine MailerSend : {} est présent mais NON VÉRIFIÉ — "
                    + "publiez les enregistrements SPF/DKIM/Return-Path puis cliquez "
                    + "Verify domain avant tout envoi réel.", status.domain());
        } else if (properties.isMailerSendTrialSender()) {
            log.warn("Contrôle domaine MailerSend : {} est VÉRIFIÉ, mais il s'agit du "
                    + "domaine d'essai (sandbox) — 2 destinataires uniques maximum. "
                    + "Vérifiez votre propre domaine pour écrire à de vraies adresses.",
                    status.domain());
        } else {
            log.info("Contrôle domaine MailerSend : {} est VÉRIFIÉ — envoi vers de vrais "
                    + "destinataires autorisé.", status.domain());
        }
    }

    /** Résultat du contrôle du domaine expéditeur (visible package pour les tests). */
    SendingDomainStatus checkSendingDomain() {
        String from = properties.getMail().getFromAddress();
        int at = from == null ? -1 : from.indexOf('@');
        if (at < 0 || at == from.length() - 1) {
            return new SendingDomainStatus(from == null ? "" : from, false, false,
                    "adresse expéditrice invalide");
        }
        String domain = from.substring(at + 1).trim();
        try {
            String body = restClient.get()
                    .uri(domainsUrl())
                    .header(HttpHeaders.AUTHORIZATION,
                            "Bearer " + properties.getMail().getApiToken().trim())
                    .accept(MediaType.APPLICATION_JSON)
                    .retrieve()
                    .body(String.class);
            JsonNode root = objectMapper.readTree(body == null || body.isBlank() ? "{}" : body);
            for (JsonNode node : root.path("data")) {
                if (domain.equalsIgnoreCase(node.path("name").asText(""))) {
                    return new SendingDomainStatus(domain, true,
                            node.path("is_verified").asBoolean(false), null);
                }
            }
            return new SendingDomainStatus(domain, false, false, null);
        } catch (RestClientResponseException ex) {
            return new SendingDomainStatus(domain, false, false,
                    "HTTP " + ex.getStatusCode().value() + " : " + errorDetail(ex));
        } catch (Exception ex) {
            return new SendingDomainStatus(domain, false, false,
                    ex.getMessage() == null ? ex.getClass().getSimpleName() : ex.getMessage());
        }
    }

    /** Endpoint Domains dérivé de l'URL d'envoi (.../v1/email → .../v1/domains). */
    private String domainsUrl() {
        String url = properties.getMail().getApiUrl();
        if (url != null && url.endsWith("/email")) {
            return url.substring(0, url.length() - "/email".length()) + "/domains";
        }
        return "https://api.mailersend.com/v1/domains";
    }

    /** État du domaine expéditeur renvoyé par MailerSend. */
    record SendingDomainStatus(String domain, boolean found, boolean verified, String error) {
    }

    /** Extrait le message d'erreur JSON de MailerSend sans jamais journaliser le jeton. */
    private String errorDetail(RestClientResponseException ex) {
        String raw = ex.getResponseBodyAsString();
        if (notBlank(raw)) {
            try {
                JsonNode node = objectMapper.readTree(raw);
                if (node.hasNonNull("message")) {
                    return node.get("message").asText();
                }
            } catch (Exception ignored) {
                // Corps non JSON : on renvoie le texte brut ci-dessous.
            }
            return raw.length() > 300 ? raw.substring(0, 300) : raw;
        }
        return ex.getStatusText() == null ? "Erreur inconnue" : ex.getStatusText();
    }

    private static boolean notBlank(String value) {
        return value != null && !value.isBlank();
    }
}
