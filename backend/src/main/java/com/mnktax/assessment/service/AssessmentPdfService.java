package com.mnktax.assessment.service;

import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.Paragraph;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import com.mnktax.assessment.entity.Assessment;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.awt.Color;
import java.io.ByteArrayOutputStream;

@Service
public class AssessmentPdfService {

    @Transactional(readOnly = true)
    public byte[] generate(Assessment a) {
        Document document = new Document();
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try {
            PdfWriter.getInstance(document, out);
            document.open();
            Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 18, new Color(23, 37, 84));
            Font normal = FontFactory.getFont(FontFactory.HELVETICA, 10, Color.BLACK);
            Font bold = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, Color.DARK_GRAY);
            Font big = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 15, new Color(23, 37, 84));

            Paragraph h = new Paragraph("DGI MANAKARA — AVIS D'IMPOSITION", titleFont);
            h.setAlignment(Element.ALIGN_CENTER);
            document.add(h);
            document.add(new Paragraph("Référence : " + a.getReference()
                    + "  |  Origine : " + (a.getOrigin() != null ? a.getOrigin().name() : "-")
                    + "  |  Statut : " + (a.getStatus() != null ? a.getStatus().name() : "-"), normal));
            document.add(new Paragraph("Contribuable : " + a.getTaxpayer().getName()
                    + " (" + a.getTaxpayer().getNif() + ")", normal));
            document.add(new Paragraph("Impôt : " + a.getTaxType().getCode() + " — Période : " + a.getPeriod()
                    + "  |  Calculé le : " + a.getCalculationDate()
                    + "  |  Règle : " + a.getRuleCode() + " v" + a.getRuleVersion(), normal));
            if (a.getParent() != null) {
                document.add(new Paragraph("Imposition d'origine : " + a.getParent().getReference(), normal));
            }
            document.add(new Paragraph(" "));

            PdfPTable table = new PdfPTable(3);
            table.setWidthPercentage(100);
            table.addCell("Libellé");
            table.addCell("Base / Taux");
            table.addCell("Montant (MGA)");
            a.getLines().forEach(l -> {
                table.addCell(l.getLabel());
                String bt = (l.getBaseAmount() != null ? l.getBaseAmount().toPlainString() : "-")
                        + (l.getRate() != null ? " @ " + l.getRate().stripTrailingZeros().toPlainString() + "%" : "");
                table.addCell(bt);
                table.addCell(l.getCalculatedAmount() != null ? l.getCalculatedAmount().toPlainString() : "-");
            });
            document.add(table);
            document.add(new Paragraph(" "));
            Paragraph net = new Paragraph("IMPÔT NET À PAYER : "
                    + (a.getNetTax() != null ? a.getNetTax().toPlainString() : "0") + " MGA", big);
            net.setAlignment(Element.ALIGN_RIGHT);
            document.add(net);
            document.add(new Paragraph(" "));
            document.add(new Paragraph("Calculé par : " + (a.getComputedBy() != null ? a.getComputedBy() : "-"), bold));
            if (a.getObservations() != null) {
                document.add(new Paragraph("Observations : " + a.getObservations(), normal));
            }
            document.close();
            return out.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Génération de l'avis d'imposition impossible", e);
        }
    }
}
