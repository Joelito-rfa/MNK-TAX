package com.mnktax.communication.service;

import com.mnktax.communication.provider.EmailAttachment;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Vérifie que chaque email porte le logo du projet dans son en-tête,
 * embarqué en CID (aucune dépendance à une URL publique).
 */
class EmailTemplateRendererTest {

    private final EmailTemplateRenderer renderer = new EmailTemplateRenderer();

    @Test
    @DisplayName("L'en-tête référence le logo embarqué cid:mnk-tax-logo")
    void rendersHeaderWithEmbeddedLogo() {
        String html = renderer.render("Notification fiscale", "Corps du message",
                "Ouvrir MNK-TAX", "https://mnk-tax.mg/messages", "Référence");

        assertTrue(html.contains("src=\"cid:mnk-tax-logo\""), html);
        assertTrue(html.contains("alt=\"MNK-TAX\""), html);
    }

    @Test
    @DisplayName("Le logo est fourni comme pièce jointe inline PNG")
    void exposesLogoAsInlineAsset() {
        List<EmailAttachment> assets = renderer.inlineAssets();

        assertEquals(1, assets.size());
        EmailAttachment logo = assets.get(0);
        assertTrue(logo.inline());
        assertEquals(EmailTemplateRenderer.LOGO_CONTENT_ID, logo.contentId());
        assertEquals("image/png", logo.mimeType());
        assertTrue(logo.content().length > 0, "Le PNG du logo ne doit pas être vide");
    }

    @Test
    @DisplayName("Les pièces jointes métier sont conservées après ajout du logo")
    void keepsBusinessAttachments() {
        EmailAttachment receipt = new EmailAttachment("recu.pdf", "application/pdf",
                new byte[]{1, 2, 3});

        List<EmailAttachment> merged = renderer.withInlineAssets(List.of(receipt));

        assertEquals(2, merged.size());
        assertTrue(merged.get(0).inline());
        assertEquals("recu.pdf", merged.get(1).fileName());
    }
}
