package com.mnktax.collection.service;

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
import com.mnktax.collection.entity.CollectionNotice;
import com.mnktax.collection.repository.CollectionNoticeRepository;
import com.mnktax.common.exception.ResourceNotFoundException;
import com.mnktax.debt.entity.TaxDebt;
import com.mnktax.debt.repository.TaxDebtRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

/**
 * Génération de documents professionnels du module Recouvrement :
 * - mise en demeure (acte formel déjà émis) ;
 * - lettre de relance amiable ;
 * - état des restes à recouvrer.
 *
 * Les libellés restent factuels (données enregistrées) : aucun délai ou
 * mention juridique n'est inventé. Les textes types sont configurables.
 */
@Service
public class CollectionDocumentService {

    private final TaxDebtRepository debtRepository;
    private final CollectionNoticeRepository noticeRepository;

    public CollectionDocumentService(TaxDebtRepository debtRepository,
                                     CollectionNoticeRepository noticeRepository) {
        this.debtRepository = debtRepository;
        this.noticeRepository = noticeRepository;
    }

    // ── Mise en demeure ──────────────────────────────────────

    @Transactional(readOnly = true)
    public byte[] miseEnDemeure(Long debtId) {
        TaxDebt debt = findDebt(debtId);
        CollectionNotice notice = noticeRepository.findByDebtIdOrderByNoticeDateDesc(debtId).stream()
                .findFirst().orElse(null);
        Document doc = new Document();
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try {
            PdfWriter.getInstance(doc, out);
            doc.open();
            header(doc, "MISE EN DEMEURE DE PAYER");
            if (notice != null) {
                infoTable(doc, new String[][]{
                        {"Référence de l'acte", notice.getNoticeNumber()},
                        {"Date", formatDate(notice.getNoticeDate())},
                });
            }
            identity(doc, debt);
            debtBlock(doc, debt);
            doc.add(blank());
            Paragraph body = new Paragraph("Objet : régularisation de la créance fiscale "
                    + debt.getReference() + " — solde restant : "
                    + formatAmount(debt.getBalance()) + " MGA.",
                    bodyFont());
            doc.add(body);
            if (notice != null && notice.getContent() != null) {
                doc.add(blank());
                Paragraph content = new Paragraph(notice.getContent(), bodyFont());
                doc.add(content);
            }
            doc.add(blank());
            footer(doc, "Document établi à partir des données enregistrées — prototype MNK-TAX (données de démonstration fictives).");
            doc.close();
        } catch (Exception ex) {
            throw new IllegalStateException("Erreur de génération du PDF : " + ex.getMessage(), ex);
        }
        return out.toByteArray();
    }

    // ── Lettre de relance amiable ────────────────────────────

    @Transactional(readOnly = true)
    public byte[] relance(Long debtId) {
        TaxDebt debt = findDebt(debtId);
        Document doc = new Document();
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try {
            PdfWriter.getInstance(doc, out);
            doc.open();
            header(doc, "LETTRE DE RELANCE AMIABLE");
            identity(doc, debt);
            debtBlock(doc, debt);
            doc.add(blank());
            Paragraph body = new Paragraph(
                    "Nous vous invitons à régulariser la créance fiscale référencée "
                            + debt.getReference() + ", dont l'échéance était le "
                            + formatDate(debt.getDueDate()) + "."
                            + " Le solde restant à ce jour s'élève à "
                            + formatAmount(debt.getBalance()) + " MGA.",
                    bodyFont());
            doc.add(body);
            doc.add(blank());
            footer(doc, "Lettre de relance amiable — prototype MNK-TAX (données de démonstration fictives).");
            doc.close();
        } catch (Exception ex) {
            throw new IllegalStateException("Erreur de génération du PDF : " + ex.getMessage(), ex);
        }
        return out.toByteArray();
    }

    // ── État des restes à recouvrer ──────────────────────────

    @Transactional(readOnly = true)
    public byte[] etatDesRestes(boolean overdue, String taxTypeCode, String period, String q) {
        Document doc = new Document();
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try {
            PdfWriter.getInstance(doc, out);
            doc.open();
            header(doc, "ÉTAT DES RESTES À RECOUVRER");
            Paragraph meta = new Paragraph("Arrêté au " + formatDate(LocalDate.now())
                    + (overdue ? " — créances en retard" : " — toutes créances exigibles"),
                    smallFont());
            doc.add(meta);
            doc.add(blank());

            Page<TaxDebt> page = debtRepository.searchCollection(null,
                    blankToNull(taxTypeCode), blankToNull(period), null, null,
                    overdue, false, false, null, null, null, null,
                    blankToNull(q), LocalDate.now(), PageRequest.of(0, 500));

            PdfPTable table = new PdfPTable(6);
            table.setWidthPercentage(100);
            table.setWidths(new float[]{20, 12, 24, 12, 14, 18});
            addHeader(table, "Référence", "NIF", "Contribuable", "Impôt", "Échéance", "Reste à recouvrer");
            BigDecimal total = BigDecimal.ZERO;
            for (TaxDebt debt : page.getContent()) {
                total = total.add(debt.getBalance() == null ? BigDecimal.ZERO : debt.getBalance());
                addCell(table, debt.getReference());
                addCell(table, debt.getTaxpayer() != null ? debt.getTaxpayer().getNif() : "—");
                addCell(table, debt.getTaxpayer() != null ? debt.getTaxpayer().getName() : "—");
                addCell(table, debt.getTaxType() != null ? debt.getTaxType().getCode() : "—");
                addCell(table, formatDate(debt.getDueDate()));
                addCell(table, formatAmount(debt.getBalance()));
            }
            doc.add(table);
            doc.add(blank());
            Paragraph totalP = new Paragraph("TOTAL GÉNÉRAL : " + formatAmount(total) + " MGA ("
                    + page.getTotalElements() + " créance(s))", sectionFont());
            doc.add(totalP);
            doc.add(blank());
            footer(doc, "Document établi à partir des données enregistrées — prototype MNK-TAX (données de démonstration fictives).");
            doc.close();
        } catch (Exception ex) {
            throw new IllegalStateException("Erreur de génération du PDF : " + ex.getMessage(), ex);
        }
        return out.toByteArray();
    }

    // ── Helpers d'impression ─────────────────────────────────

    private TaxDebt findDebt(Long id) {
        return debtRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Créance", id));
    }

    private void header(Document doc, String title) throws Exception {
        Paragraph brand = new Paragraph("MNK-TAX", titleFont());
        brand.setAlignment(Element.ALIGN_CENTER);
        doc.add(brand);
        Paragraph sub = new Paragraph("Gestion des Impôts — Service de recouvrement", smallFont());
        sub.setAlignment(Element.ALIGN_CENTER);
        doc.add(sub);
        Paragraph t = new Paragraph(title, bigFont());
        t.setAlignment(Element.ALIGN_CENTER);
        doc.add(t);
        doc.add(blank());
    }

    private void identity(Document doc, TaxDebt debt) throws Exception {
        com.mnktax.taxpayer.entity.Taxpayer tp = debt.getTaxpayer();
        doc.add(new Paragraph("CONTRIBUABLE", sectionFont()));
        PdfPTable table = new PdfPTable(2);
        table.setWidthPercentage(100);
        row(table, "Nom / Raison sociale", tp.getName());
        row(table, "NIF", tp.getNif());
        row(table, "Adresse", tp.getAddress());
        doc.add(table);
        doc.add(blank());
    }

    private void debtBlock(Document doc, TaxDebt debt) throws Exception {
        doc.add(new Paragraph("CRÉANCE", sectionFont()));
        PdfPTable table = new PdfPTable(2);
        table.setWidthPercentage(100);
        row(table, "Référence", debt.getReference());
        row(table, "Impôt", debt.getTaxType() != null ? debt.getTaxType().getCode() : "—");
        row(table, "Période", debt.getPeriod());
        row(table, "Montant total", formatAmount(debt.getTotalAmount()) + " MGA");
        row(table, "Payé", formatAmount(debt.getPaidAmount()) + " MGA");
        row(table, "Reste à recouvrer", formatAmount(debt.getBalance()) + " MGA");
        row(table, "Échéance", formatDate(debt.getDueDate()));
        doc.add(table);
    }

    private void row(PdfPTable table, String label, String value) {
        PdfPCell l = new PdfPCell(new Phrase(label, labelFont()));
        l.setBorder(Rectangle.NO_BORDER);
        l.setBackgroundColor(new Color(240, 243, 250));
        l.setPadding(5);
        PdfPCell v = new PdfPCell(new Phrase(value != null ? value : "—", valueFont()));
        v.setBorder(Rectangle.NO_BORDER);
        v.setPadding(5);
        table.addCell(l);
        table.addCell(v);
    }

    private void infoTable(Document doc, String[][] pairs) throws Exception {
        PdfPTable table = new PdfPTable(2);
        table.setWidthPercentage(100);
        for (String[] p : pairs) {
            row(table, p[0], p[1]);
        }
        doc.add(table);
        doc.add(blank());
    }

    private void addHeader(PdfPTable table, String... headers) {
        for (String h : headers) {
            PdfPCell c = new PdfPCell(new Phrase(h, labelFont()));
            c.setBackgroundColor(new Color(23, 37, 84));
            c.setPadding(5);
            table.addCell(c);
        }
    }

    private void addCell(PdfPTable table, String value) {
        PdfPCell c = new PdfPCell(new Phrase(value != null ? value : "—", valueFont()));
        c.setPadding(5);
        table.addCell(c);
    }

    private void footer(Document doc, String text) throws Exception {
        doc.add(blank());
        Paragraph footer = new Paragraph(text, smallFont());
        footer.setAlignment(Element.ALIGN_CENTER);
        doc.add(footer);
    }

    private Paragraph blank() {
        return new Paragraph(" ");
    }

    private String formatDate(LocalDate date) {
        if (date == null) return "—";
        return date.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
    }

    private String formatAmount(BigDecimal amount) {
        return amount == null ? "0" : amount.setScale(0, RoundingMode.HALF_UP)
                .toString().replaceAll("\\B(?=(\\d{3})+(?!\\d))", " ");
    }

    private Font titleFont() {
        return FontFactory.getFont(FontFactory.HELVETICA_BOLD, 20, new Color(23, 37, 84));
    }

    private Font bigFont() {
        return FontFactory.getFont(FontFactory.HELVETICA_BOLD, 15, new Color(23, 37, 84));
    }

    private Font sectionFont() {
        return FontFactory.getFont(FontFactory.HELVETICA_BOLD, 11, new Color(23, 37, 84));
    }

    private Font labelFont() {
        return FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, Color.DARK_GRAY);
    }

    private Font valueFont() {
        return FontFactory.getFont(FontFactory.HELVETICA, 9, Color.BLACK);
    }

    private Font bodyFont() {
        return FontFactory.getFont(FontFactory.HELVETICA, 11, Color.BLACK);
    }

    private Font smallFont() {
        return FontFactory.getFont(FontFactory.HELVETICA, 8, Color.GRAY);
    }

    private static String blankToNull(String v) {
        return v == null || v.isBlank() ? null : v;
    }
}
