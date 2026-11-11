package com.mnktax.communication.provider;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mnktax.communication.config.CommunicationProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.nio.charset.StandardCharsets;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.jsonPath;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

/**
 * Vérifie le contrat HTTP du fournisseur MailerSend : payload envoyé,
 * lecture de l'identifiant de message et classification des erreurs
 * (retryable uniquement pour 429/5xx).
 */
class MailerSendEmailProviderTest {

    private static final String API_URL = "https://api.mailersend.com/v1/email";

    private CommunicationProperties properties;
    private MockRestServiceServer server;
    private MailerSendEmailProvider provider;

    @BeforeEach
    void setUp() {
        properties = new CommunicationProperties();
        properties.getMail().setProvider("mailersend");
        properties.getMail().setApiToken("test-token");
        properties.getMail().setApiUrl(API_URL);
        properties.getMail().setFromAddress("no-reply@example.test");
        properties.getMail().setFromName("MNK-TAX");

        RestClient.Builder builder = RestClient.builder();
        server = MockRestServiceServer.bindTo(builder).build();
        provider = new MailerSendEmailProvider(properties, new ObjectMapper(), builder.build());
    }

    @Test
    @DisplayName("Envoi : payload complet, jeton en en-tête et identifiant du message retourné")
    void sendsExpectedPayloadAndReturnsMessageId() {
        server.expect(requestTo(API_URL))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header(HttpHeaders.AUTHORIZATION, "Bearer test-token"))
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.from.email").value("no-reply@example.test"))
                .andExpect(jsonPath("$.from.name").value("MNK-TAX"))
                .andExpect(jsonPath("$.to[0].email").value("contribuable@example.mg"))
                .andExpect(jsonPath("$.subject").value("Notification fiscale"))
                .andExpect(jsonPath("$.html").value("<p>Version HTML</p>"))
                .andExpect(jsonPath("$.text").value("Version texte"))
                .andExpect(jsonPath("$.attachments[0].filename").value("recu.txt"))
                .andExpect(jsonPath("$.attachments[0].disposition").value("attachment"))
                .andExpect(jsonPath("$.attachments[0].content").value("Y29udGVudA=="))
                .andExpect(jsonPath("$.attachments[1].filename").value("mnk-tax-logo.png"))
                .andExpect(jsonPath("$.attachments[1].disposition").value("inline"))
                .andExpect(jsonPath("$.attachments[1].id").value("mnk-tax-logo"))
                .andRespond(withStatus(HttpStatus.ACCEPTED)
                        .header("x-message-id", "mailersend-123")
                        .contentType(MediaType.APPLICATION_JSON));

        ProviderResult result = provider.send("contribuable@example.mg", "Notification fiscale",
                "<p>Version HTML</p>", "Version texte",
                List.of(
                        new EmailAttachment("recu.txt", "text/plain",
                                "content".getBytes(StandardCharsets.UTF_8)),
                        new EmailAttachment("mnk-tax-logo.png", "image/png",
                                new byte[]{1, 2, 3}, "mnk-tax-logo")));

        assertTrue(result.success(), () -> "Envoi refusé : " + result.error());
        assertEquals("mailersend-123", result.providerMessageId());
        server.verify();
    }

    @Test
    @DisplayName("HTTP 422 : échec définitif, non rejoué automatiquement")
    void treatsUnprocessableEntityAsNonRetryable() {
        server.expect(requestTo(API_URL))
                .andRespond(withStatus(HttpStatus.UNPROCESSABLE_ENTITY)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("{\"message\":\"Invalid recipient\"}"));

        ProviderResult result = provider.send("invalide@example.mg", "Sujet",
                "<p>HTML</p>", "Texte", List.of());

        assertFalse(result.success());
        assertFalse(result.retryable(), "Un 422 ne doit jamais être rejoué automatiquement");
        assertTrue(result.error().contains("422"), result.error());
        assertTrue(result.error().contains("Invalid recipient"), result.error());
        server.verify();
    }

    @Test
    @DisplayName("HTTP 503 : échec temporaire, rejouable")
    void treatsServerErrorAsRetryable() {
        server.expect(requestTo(API_URL))
                .andRespond(withStatus(HttpStatus.SERVICE_UNAVAILABLE)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("{\"message\":\"Service unavailable\"}"));

        ProviderResult result = provider.send("contribuable@example.mg", "Sujet",
                "<p>HTML</p>", "Texte", List.of());

        assertFalse(result.success());
        assertTrue(result.retryable());
        server.verify();
    }

    @Test
    @DisplayName("Sans jeton API : fournisseur non configuré, aucun appel réseau")
    void rejectsSendWhenNotConfigured() {
        properties.getMail().setApiToken("");

        assertFalse(provider.isConfigured());
        ProviderResult result = provider.send("contribuable@example.mg", "Sujet",
                "<p>HTML</p>", "Texte", List.of());

        assertFalse(result.success());
        assertFalse(result.retryable());
        assertTrue(result.error().contains("non configuré"), result.error());
        server.verify();
    }

    @Test
    @DisplayName("Fournisseur identifié comme MAILERSEND")
    void exposesProviderName() {
        assertEquals("MAILERSEND", provider.providerName());
        assertTrue(provider.isConfigured());
    }

    @Test
    @DisplayName("Sandbox MailerSend : refus expliqué (domaine d'envoi à vérifier), non rejoué")
    void explainsSandboxRecipientLimit() {
        server.expect(requestTo(API_URL))
                .andRespond(withStatus(HttpStatus.UNPROCESSABLE_ENTITY)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("{\"message\":\"You have reached sandbox account unique recipients "
                                + "limit.\",\"code\":\"MS42225\"}"));

        ProviderResult result = provider.send("nouveau.destinataire@example.mg", "Sujet",
                "<p>HTML</p>", "Texte", List.of());

        assertFalse(result.success());
        assertFalse(result.retryable());
        assertTrue(result.error().contains("sandbox"), result.error());
        assertTrue(result.error().contains("domaine d'envoi"), result.error());
        server.verify();
    }

    @Test
    @DisplayName("Domaine d'essai MailerSend détecté depuis l'adresse expéditrice")
    void detectsMailerSendTrialSender() {
        assertFalse(properties.isMailerSendTrialSender());
        properties.getMail().setFromAddress("no-reply@test-abc123.mlsender.net");
        assertTrue(properties.isMailerSendTrialSender());
    }

    @Test
    @DisplayName("Contrôle de domaine : domaine expéditeur vérifié")
    void reportsVerifiedSendingDomain() {
        server.expect(requestTo("https://api.mailersend.com/v1/domains"))
                .andExpect(method(HttpMethod.GET))
                .andExpect(header(HttpHeaders.AUTHORIZATION, "Bearer test-token"))
                .andRespond(withSuccess("{\"data\":[{\"name\":\"example.test\","
                        + "\"is_verified\":true}]}", MediaType.APPLICATION_JSON));

        MailerSendEmailProvider.SendingDomainStatus status = provider.checkSendingDomain();

        assertEquals("example.test", status.domain());
        assertTrue(status.found());
        assertTrue(status.verified());
        assertNull(status.error());
        server.verify();
    }

    @Test
    @DisplayName("Contrôle de domaine : domaine présent mais non vérifié")
    void reportsUnverifiedSendingDomain() {
        server.expect(requestTo("https://api.mailersend.com/v1/domains"))
                .andRespond(withSuccess("{\"data\":[{\"name\":\"example.test\","
                        + "\"is_verified\":false}]}", MediaType.APPLICATION_JSON));

        MailerSendEmailProvider.SendingDomainStatus status = provider.checkSendingDomain();

        assertTrue(status.found());
        assertFalse(status.verified());
        assertNull(status.error());
        server.verify();
    }

    @Test
    @DisplayName("Contrôle de domaine : domaine absent du compte MailerSend")
    void reportsMissingSendingDomain() {
        server.expect(requestTo("https://api.mailersend.com/v1/domains"))
                .andRespond(withSuccess("{\"data\":[]}", MediaType.APPLICATION_JSON));

        MailerSendEmailProvider.SendingDomainStatus status = provider.checkSendingDomain();

        assertFalse(status.found());
        assertFalse(status.verified());
        assertNull(status.error());
        server.verify();
    }

    @Test
    @DisplayName("Contrôle de domaine : API refusée, erreur tracée sans secret")
    void reportsDomainCheckFailure() {
        server.expect(requestTo("https://api.mailersend.com/v1/domains"))
                .andRespond(withStatus(HttpStatus.UNAUTHORIZED)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("{\"message\":\"Unauthenticated.\"}"));

        MailerSendEmailProvider.SendingDomainStatus status = provider.checkSendingDomain();

        assertFalse(status.found());
        assertTrue(status.error().contains("HTTP 401"), status.error());
        assertFalse(status.error().contains("test-token"), "Le jeton ne doit jamais apparaître");
        server.verify();
    }
}
