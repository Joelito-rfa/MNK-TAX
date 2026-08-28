package com.mnktax.receipt.service;

import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.Image;
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
import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;

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

            // Fonts
            Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 20, new Color(23, 37, 84));
            Font subFont = FontFactory.getFont(FontFactory.HELVETICA, 10, Color.DARK_GRAY);
            Font sectionFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12, new Color(23, 37, 84));
            Font labelFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, Color.DARK_GRAY);
            Font valueFont = FontFactory.getFont(FontFactory.HELVETICA, 10, Color.BLACK);
            Font bigFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 16, new Color(23, 37, 84));
            Font smallFont = FontFactory.getFont(FontFactory.HELVETICA, 8, Color.GRAY);
            Font amountFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 18, new Color(22, 163, 74));
            Font statusFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12, new Color(22, 163, 74));

            // ── En-tête ──
            Paragraph title = new Paragraph("MNK-TAX", titleFont);
            title.setAlignment(Element.ALIGN_CENTER);
            document.add(title);

            Paragraph slogan = new Paragraph("Gestion des Impôts — Prototype Académique", subFont);
            slogan.setAlignment(Element.ALIGN_CENTER);
            document.add(slogan);

            Paragraph institution = new Paragraph("DGI Manakara", subFont);
            institution.setAlignment(Element.ALIGN_CENTER);
            document.add(institution);
            document.add(new Paragraph(" "));

            // ── Ligne séparatrice ──
            document.add(createSeparator());
            document.add(new Paragraph(" "));

            // ── Titre quittance ──
            Paragraph head = new Paragraph("QUITTANCE DE PAIEMENT", bigFont);
            head.setAlignment(Element.ALIGN_CENTER);
            document.add(head);
            document.add(new Paragraph(" "));

            // ── Numéro et référence ──
            PdfPTable headerTable = new PdfPTable(2);
            headerTable.setWidthPercentage(100);
            headerTable.setWidths(new float[]{50, 50});

            PdfPCell numLabel = new PdfPCell(new Phrase("Numéro", labelFont));
            numLabel.setBorder(Rectangle.NO_BORDER);
            numLabel.setPadding(6);
            PdfPCell numValue = new PdfPCell(new Phrase(receipt.getReceiptNumber(), FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12, new Color(23, 37, 84))));
            numValue.setBorder(Rectangle.NO_BORDER);
            numValue.setPadding(6);
            numValue.setHorizontalAlignment(Element.ALIGN_RIGHT);
            headerTable.addCell(numLabel);
            headerTable.addCell(numValue);

            PdfPCell refLabel = new PdfPCell(new Phrase("Référence", labelFont));
            refLabel.setBorder(Rectangle.NO_BORDER);
            refLabel.setPadding(6);
            PdfPCell refValue = new PdfPCell(new Phrase(receipt.getReference(), FontFactory.getFont(FontFactory.HELVETICA, 11, new Color(23, 37, 84))));
            refValue.setBorder(Rectangle.NO_BORDER);
            refValue.setPadding(6);
            refValue.setHorizontalAlignment(Element.ALIGN_RIGHT);
            headerTable.addCell(refLabel);
            headerTable.addCell(refValue);

            document.add(headerTable);
            document.add(new Paragraph(" "));
            document.add(createSeparator());
            document.add(new Paragraph(" "));

            // ── Section Contribuable ──
            document.add(new Paragraph("CONTRIBUABLE", sectionFont));
            PdfPTable contribTable = new PdfPTable(2);
            contribTable.setWidthPercentage(100);
            addRow(contribTable, "Nom / Raison sociale", receipt.getTaxpayer().getName(), labelFont, valueFont);
            addRow(contribTable, "NIF", receipt.getTaxpayer().getNif(), labelFont, valueFont);
            if (receipt.getCenterCode() != null) {
                addRow(contribTable, "Centre fiscal", receipt.getCenterCode(), labelFont, valueFont);
            }
            document.add(contribTable);
            document.add(new Paragraph(" "));

            // ── Section Impôt ──
            document.add(new Paragraph("IMPÔT", sectionFont));
            PdfPTable taxTable = new PdfPTable(2);
            taxTable.setWidthPercentage(100);
            addRow(taxTable, "Type d'impôt", receipt.getTaxType() != null ? receipt.getTaxType().getCode() : "—", labelFont, valueFont);
            addRow(taxTable, "Période", receipt.getPeriod() != null ? receipt.getPeriod() : "—", labelFont, valueFont);
            document.add(taxTable);
            document.add(new Paragraph(" "));

            // ── Section Paiement ──
            document.add(new Paragraph("PAIEMENT", sectionFont));
            PdfPTable payTable = new PdfPTable(2);
            payTable.setWidthPercentage(100);
            addRow(payTable, "Référence", payment != null ? payment.getReference() : "—", labelFont, valueFont);
            addRow(payTable, "Date de paiement", receipt.getPaymentDate() != null ? receipt.getPaymentDate().toString() : "—", labelFont, valueFont);
            addRow(payTable, "Mode de paiement", formatMethod(receipt.getMethod()), labelFont, valueFont);
            if (receipt.getTransactionReference() != null) {
                addRow(payTable, "Réf. transaction", receipt.getTransactionReference(), labelFont, valueFont);
            }
            if (receipt.getDeclaration() != null) {
                addRow(payTable, "Déclaration", receipt.getDeclaration().getReference(), labelFont, valueFont);
            }
            if (receipt.getDebt() != null) {
                addRow(payTable, "Créance", receipt.getDebt().getReference(), labelFont, valueFont);
            }
            document.add(payTable);
            document.add(new Paragraph(" "));

            // ── Montant payé ──
            document.add(createSeparator());
            document.add(new Paragraph(" "));
            Paragraph amountTitle = new Paragraph("MONTANT PAYÉ", sectionFont);
            amountTitle.setAlignment(Element.ALIGN_CENTER);
            document.add(amountTitle);
            Paragraph amountValue = new Paragraph(formatAmount(receipt.getAmount()) + " " + (receipt.getCurrency() != null ? receipt.getCurrency() : "MGA"), amountFont);
            amountValue.setAlignment(Element.ALIGN_CENTER);
            document.add(amountValue);
            document.add(new Paragraph(" "));

            // ── Statut ──
            Paragraph statusLine = new Paragraph("Statut : " + formatStatus(receipt.getStatus()), statusFont);
            statusLine.setAlignment(Element.ALIGN_CENTER);
            document.add(statusLine);
            document.add(new Paragraph(" "));

            // ── QR Code ──
            if (receipt.getQrCodePath() != null) {
                File qrFile = new File(receipt.getQrCodePath());
                if (qrFile.exists()) {
                    document.add(createSeparator());
                    document.add(new Paragraph(" "));
                    Image qr = Image.getInstance(qrFile.getAbsolutePath());
                    qr.setAlignment(Element.ALIGN_CENTER);
                    qr.scaleAbsolute(120, 120);
                    document.add(qr);
                    Paragraph qrText = new Paragraph("Scanner pour vérifier cette quittance", smallFont);
                    qrText.setAlignment(Element.ALIGN_CENTER);
                    document.add(qrText);
                    document.add(new Paragraph(" "));
                }
            }

            // ── Informations de vérification ──
            document.add(createSeparator());
            document.add(new Paragraph(" "));
            PdfPTable verifyTable = new PdfPTable(2);
            verifyTable.setWidthPercentage(100);
            addRow(verifyTable, "Date d'émission", receipt.getIssuedAt() != null ? receipt.getIssuedAt().toString() : "—", labelFont, valueFont);
            addRow(verifyTable, "Émis par", receipt.getCreatedBy() != null ? receipt.getCreatedBy() : "—", labelFont, valueFont);
            if (receipt.getVerificationToken() != null) {
                addRow(verifyTable, "Token de vérification", receipt.getVerificationToken(), labelFont, valueFont);
            }
            addRow(verifyTable, "Document ID", "RECEIPT-" + receipt.getId(), labelFont, valueFont);
            document.add(verifyTable);
            document.add(new Paragraph(" "));

            // ── Pied de page ──
            document.add(createSeparator());
            document.add(new Paragraph(" "));
            Paragraph footer = new Paragraph(
                    "Document généré par le prototype académique MNK-TAX.\n" +
                            "Données de démonstration fictives — ne constitue pas une quittance officielle de la DGI.",
                    smallFont);
            footer.setAlignment(Element.ALIGN_CENTER);
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
        PdfPCell v = new PdfPCell(new Phrase(value != null ? value : "—", valueFont));
        v.setBorder(Rectangle.NO_BORDER);
        v.setPadding(6);
        table.addCell(l);
        table.addCell(v);
    }

    private String formatAmount(java.math.BigDecimal amount) {
        return amount == null ? "0,00" : String.format("%,.2f", amount).replace(',', ' ');
    }

    private String formatMethod(com.mnktax.payment.entity.PaymentMethod method) {
        if (method == null) return "—";
        return switch (method) {
            case CASH -> "Espèces";
            case BANK_TRANSFER -> "Virement bancaire";
            case MOBILE_MONEY -> "Mobile Money";
            case CARD -> "Carte bancaire";
            case CHEQUE -> "Chèque";
            default -> method.name();
        };
    }

    private String formatStatus(com.mnktax.receipt.entity.ReceiptStatus status) {
        if (status == null) return "—";
        return switch (status) {
            case GENERATED -> "Générée";
            case ISSUED -> "Émise";
            case VALID -> "Valide";
            case CANCELLED -> "Annulée";
            case REFUNDED -> "Remboursée";
            case REPLACED -> "Remplacée";
            case VOID -> "Annulée";
        };
    }

    private Paragraph createSeparator() {
        Paragraph p = new Paragraph(" ");
        p.setSpacingBefore(2);
        p.setSpacingAfter(2);
        return p;
    }
}
