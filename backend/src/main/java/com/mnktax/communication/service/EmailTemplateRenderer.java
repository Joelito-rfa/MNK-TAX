package com.mnktax.communication.service;

import org.springframework.stereotype.Service;

/**
 * Rendu HTML professionnel des emails MNK-TAX :
 * en-tête institutionnel, contenu, bouton d'action, pied de page légal.
 */
@Service
public class EmailTemplateRenderer {

    public String render(String title, String body, String buttonLabel, String buttonUrl, String referenceLine) {
        String safeBody = escape(body);
        StringBuilder html = new StringBuilder();
        html.append("<!DOCTYPE html>\n<html lang=\"fr\">\n<head>\n")
            .append("<meta charset=\"UTF-8\">\n")
            .append("<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n")
            .append("</head>\n")
            .append("<body style=\"margin:0;padding:0;background-color:#f1f5f9;font-family:Arial,Helvetica,sans-serif;\">\n")
            .append("<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background-color:#f1f5f9;padding:24px 12px;\">\n")
            .append("<tr><td align=\"center\">\n")
            .append("<table role=\"presentation\" width=\"600\" cellpadding=\"0\" cellspacing=\"0\" ")
            .append("style=\"max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;")
            .append("box-shadow:0 1px 3px rgba(15,23,42,0.12);\">\n")

            // En-tête institutionnel
            .append("<tr><td style=\"background-color:#0f3d6e;padding:24px 32px;\">\n")
            .append("<div style=\"color:#ffffff;font-size:20px;font-weight:bold;letter-spacing:1px;\">MNK-TAX</div>\n")
            .append("<div style=\"color:#c7d6ea;font-size:12px;margin-top:4px;\">Administration fiscale</div>\n")
            .append("</td></tr>\n")

            // Titre
            .append("<tr><td style=\"padding:28px 32px 8px 32px;\">\n")
            .append("<h1 style=\"margin:0;font-size:18px;color:#0f172a;\">")
            .append(escape(title == null ? "Notification fiscale" : title))
            .append("</h1>\n")
            .append("</td></tr>\n")

            // Corps
            .append("<tr><td style=\"padding:8px 32px 16px 32px;\">\n")
            .append("<div style=\"font-size:14px;line-height:1.7;color:#334155;white-space:pre-wrap;\">")
            .append(safeBody)
            .append("</div>\n");

        if (referenceLine != null && !referenceLine.isBlank()) {
            html.append("<div style=\"margin-top:16px;padding:12px 16px;background-color:#f8fafc;")
                .append("border-left:3px solid #0f3d6e;border-radius:6px;font-size:13px;color:#475569;\">")
                .append(escape(referenceLine))
                .append("</div>\n");
        }
        if (buttonLabel != null && !buttonLabel.isBlank() && buttonUrl != null && !buttonUrl.isBlank()) {
            html.append("<table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" style=\"margin-top:24px;\">\n")
                .append("<tr><td style=\"border-radius:8px;background-color:#0f3d6e;\">\n")
                .append("<a href=\"").append(escapeUrl(buttonUrl))
                .append("\" style=\"display:inline-block;padding:12px 28px;color:#ffffff;font-size:14px;")
                .append("font-weight:bold;text-decoration:none;\">")
                .append(escape(buttonLabel))
                .append("</a>\n")
                .append("</td></tr>\n</table>\n");
        }
        html.append("</td></tr>\n")

            // Pied de page
            .append("<tr><td style=\"padding:20px 32px;background-color:#f8fafc;border-top:1px solid #e2e8f0;\">\n")
            .append("<div style=\"font-size:11px;color:#94a3b8;line-height:1.6;\">\n")
            .append("MNK-TAX — Administration fiscale de Madagascar. ")
            .append("Cet email et ses pièces jointes contiennent des informations fiscales protégées. ")
            .append("Si vous n'êtes pas le destinataire prévu, ne le diffusez pas et signalez-le à l'administration.\n")
            .append("</div>\n")
            .append("</td></tr>\n")

            .append("</table>\n</td></tr>\n</table>\n</body>\n</html>");
        return html.toString();
    }

    public String escape(String value) {
        if (value == null) return "";
        return value
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;");
    }

    private String escapeUrl(String url) {
        String safe = escape(url);
        return safe.replace("&#39;", "%27");
    }
}
