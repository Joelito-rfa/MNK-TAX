package com.mnktax.communication.provider;

import com.mnktax.communication.config.CommunicationProperties;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeBodyPart;
import jakarta.mail.internet.MimeMessage;
import jakarta.mail.internet.MimeMultipart;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mail.javamail.JavaMailSender;

import java.util.List;
import java.util.Properties;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Vérifie le contenu réellement confié au serveur SMTP.
 *
 * Régression : lorsque le texte brut et le HTML étaient fournis ensemble,
 * MimeMessageHelper.setText(texte, true) n'en conservait qu'un seul et
 * l'email partait avec le texte brut à la place du modèle HTML.
 */
class SmtpEmailProviderTest {

    private JavaMailSender mailSender;
    private MimeMessage message;
    private SmtpEmailProvider provider;

    @BeforeEach
    void setUp() {
        CommunicationProperties properties = new CommunicationProperties();
        properties.getMail().setHost("smtp.example.test");
        properties.getMail().setPort(587);
        properties.getMail().setUsername("user@example.test");
        properties.getMail().setPassword("secret");
        mailSender = mock(JavaMailSender.class);
        message = new MimeMessage(Session.getInstance(new Properties(), null));
        when(mailSender.createMimeMessage()).thenReturn(message);
        provider = new SmtpEmailProvider(mailSender, properties);
    }

    @Test
    @DisplayName("Texte + HTML : les deux versions partent en multipart/alternative")
    void sendsPlainTextAndHtmlAlternatives() throws Exception {
        ProviderResult result = provider.send("contribuable@example.mg", "Votre mot de passe",
                "<html><body><p>Version HTML</p></body></html>",
                "Bonjour,\nVersion texte",
                List.<EmailAttachment>of());

        assertTrue(result.success(), () -> "Envoi refusé : " + result.error());
        verify(mailSender).send(message);
        // JavaMailSenderImpl écrit les en-têtes MIME au moment de l'envoi.
        message.saveChanges();
        assertEquals("Votre mot de passe", message.getSubject());

        // multipart/mixed (Spring) > multipart/related > multipart/alternative.
        MimeMultipart root = assertInstanceOf(MimeMultipart.class, message.getContent());
        MimeMultipart related = nestedPart(root, 0);
        MimeMultipart alternative = nestedPart(related, 0);
        String alternativeType = alternative.getContentType().toLowerCase();
        assertTrue(alternativeType.startsWith("multipart/alternative"),
                () -> "Type attendu multipart/alternative, obtenu " + alternativeType);

        MimeBodyPart textPart = (MimeBodyPart) alternative.getBodyPart(0);
        MimeBodyPart htmlPart = (MimeBodyPart) alternative.getBodyPart(1);
        String textType = textPart.getContentType().toLowerCase();
        String htmlType = htmlPart.getContentType().toLowerCase();
        assertTrue(textType.startsWith("text/plain"),
                () -> "Type attendu text/plain, obtenu " + textType);
        assertTrue(htmlType.startsWith("text/html"),
                () -> "Type attendu text/html, obtenu " + htmlType);
        assertEquals("Bonjour,\nVersion texte", textPart.getContent());
        assertTrue(((String) htmlPart.getContent()).contains("Version HTML"));
    }

    @Test
    @DisplayName("HTML seul : le contenu part en text/html")
    void sendsHtmlOnlyBody() throws Exception {
        ProviderResult result = provider.send("contribuable@example.mg", "Notification fiscale",
                "<html><body><p>Version HTML</p></body></html>", null,
                List.<EmailAttachment>of());

        assertTrue(result.success(), () -> "Envoi refusé : " + result.error());
        verify(mailSender).send(message);
        message.saveChanges();
        String contentType = message.getContentType().toLowerCase();
        Object content = message.getContent();
        assertTrue(contentType.startsWith("text/html"),
                () -> "Type attendu text/html, obtenu " + contentType);
        assertEquals("<html><body><p>Version HTML</p></body></html>", content);
    }

    private static MimeMultipart nestedPart(MimeMultipart parent, int index) throws Exception {
        MimeBodyPart part = (MimeBodyPart) parent.getBodyPart(index);
        return assertInstanceOf(MimeMultipart.class, part.getContent());
    }
}
