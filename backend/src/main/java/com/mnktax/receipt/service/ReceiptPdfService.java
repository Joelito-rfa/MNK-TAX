package com.mnktax.receipt.service;

import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.Rectangle;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import com.mnktax.payment.entity.Payment;
import com.mnktax.receipt.entity.Receipt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.awt.Color;
import java.io.ByteArrayOutputStream;

@Service
public class ReceiptPdfService {

    @Transactional(readOnly = true)
    public byte[] generate(Receipt receipt) {
        Payment payment = receipt.getPayment();
        Document document = new Document();
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try {
            PdfWriter.getInstance(document, out);
            document.open();

            Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 18, new Color(23, 37, 84));
            Font subFont = FontFactory.getFont(FontFactory.HELVETICA, 11, Color.DARK_GRAY);
            Font labelFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, Color.DARK_GRAY);
            Font valueFont = FontFactory.getFont(FontFactory.HELVETICA, 10, Color.BLACK);
            Font bigFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 16, new Color(23, 37, 84));

            Paragraph title = new Paragraph("MNK-TAX", titleFont);
            title.setAlignment(Element.ALIGN_CENTER);
            document.add(title);
            Paragraph slogan = new Paragraph("Gestion intelligente des obligations et du recouvrement fiscal", subFont);
            slogan.setAlignment(Element.ALIGN_CENTER);
            document.add(slogan);
            document.add(new Paragraph(" "));

            Paragraph head = new Paragraph("QUITTANCE DE PAIEMENT", bigFont);
            head.setAlignment(Element.ALIGN_CENTER);
            document.add(head);
            document.add(new Paragraph(" "));

            PdfPTable table = new PdfPTable(2);
            table.setWidthPercentage(100);
            table.setSpacingBefore(10);

            addRow(table, "Numéro de quittance", receipt.getReceiptNumber(), labelFont, valueFont);
            addRow(table, "Référence", receipt.getReference(), labelFont, valueFont);
            addRow(table, "Date d'émission", receipt.getIssuedAt().toString(), labelFont, valueFont);
            addRow(table, "NIF", receipt.getTaxpayer().getNif(), labelFont, valueFont);
            addRow(table, "Contribuable", receipt.getTaxpayer().getName(), labelFont, valueFont);
            addRow(table, "Type d'impôt", receipt.getTaxType().getCode(), labelFont, valueFont);
            addRow(table, "Période", receipt.getPeriod(), labelFont, valueFont);
            addRow(table, "Montant payé", formatAmount(receipt.getAmount()) + " MGA", labelFont, valueFont);
            addRow(table, "Mode de paiement", receipt.getMethod().name(), labelFont, valueFont);
            addRow(table, "Référence paiement", payment.getReference(), labelFont, valueFont);
            addRow(table, "Statut", receipt.getStatus().name(), labelFont, valueFont);

            document.add(table);

            Paragraph footer = new Paragraph(
                    "Document généré par le prototype académique MNK-TAX. Données de démonstration fictives - " +
                            "ne constitue pas une quittance officielle.",
                    subFont);
            footer.setAlignment(Element.ALIGN_CENTER);
            document.add(new Paragraph(" "));
            document.add(footer);
            document.close();
        } catch (Exception ex) {
            throw new IllegalStateException("Erreur de génération PDF : " + ex.getMessage(), ex);
        }
        return out.toByteArray();
    }

    private void addRow(PdfPTable table, String label, String value, Font labelFont, Font valueFont) {
        PdfPCell l = new PdfPCell(new Phrase(label, labelFont));
        l.setBorder(Rectangle.NO_BORDER);
        l.setBackgroundColor(new Color(240, 243, 250));
        l.setPadding(6);
        PdfPCell v = new PdfPCell(new Phrase(value, valueFont));
        v.setBorder(Rectangle.NO_BORDER);
        v.setPadding(6);
        table.addCell(l);
        table.addCell(v);
    }

    private String formatAmount(java.math.BigDecimal amount) {
        return amount == null ? "0,00" : String.format("%,.2f", amount).replace(',', ' ');
    }
}
