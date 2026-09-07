package com.mnktax.ai.service;

import com.mnktax.ai.dto.AiDtos.ChatMessage;
import com.mnktax.reporting.dto.ReportDtos.DashboardSummary;
import com.mnktax.reporting.service.DashboardService;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

@Service
public class AiService {

    private static final Logger log = LoggerFactory.getLogger(AiService.class);
    private final DashboardService dashboardService;

    public AiService(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    public String chat(String userMessage, List<ChatMessage> history) {
        try {
            DashboardSummary s = dashboardService.summary(6);
            String lower = userMessage.toLowerCase().trim();

            if (isGreeting(lower)) {
                return greeting();
            }
            if (matchesAny(lower, "aide", "help", "comment", "utiliser", "fonctionne")) {
                return helpMessage();
            }
            if (matchesAny(lower, "contribuable", "contribuables", "taxpayer", "entreprises")) {
                return taxpayerResponse(s);
            }
            if (matchesAny(lower, "déclaration", "declarations", "déclarations", "declaration")) {
                return declarationResponse(s);
            }
            if (matchesAny(lower, "créance", "creances", "créances", "creance", "dette", "dettes")) {
                return debtResponse(s);
            }
            if (matchesAny(lower, "paiement", "paiements", "payment", "payer", "encaiss")) {
                return paymentResponse(s);
            }
            if (matchesAny(lower, "recouvrement", "taux", "collection", "recouvre")) {
                return collectionResponse(s);
            }
            if (matchesAny(lower, "imposition", "impositions", "assessment", "impot", "impôt", "taxe")) {
                return assessmentResponse(s);
            }
            if (matchesAny(lower, "retard", "overdue", "en retard", "échéance", "echeance")) {
                return overdueResponse(s);
            }
            if (matchesAny(lower, "total", "somme", "montant", "chiffre", "bilan", "résumé", "resume", "synthèse", "synthese", "global")) {
                return summaryResponse(s);
            }
            if (matchesAny(lower, "reçu", "recu", "reçus", "recus", "quittance")) {
                return receiptResponse(s);
            }
            if (matchesAny(lower, "activit", "récent", "recent", "dernier")) {
                return recentActivityResponse(s);
            }

            return defaultResponse(lower, s);
        } catch (Exception e) {
            log.error("Erreur M-TAX AI pour message: {}", userMessage, e);
            return "Désolé, une erreur est survenue : " + e.getMessage();
        }
    }

    /* ── Helpers ── */

    private boolean isGreeting(String lower) {
        return Pattern.matches(".*\\b(bonjour|salut|coucou|bonsoir|hello|hey|yo|bonne ?journ\\w+)\\b.*", lower)
                || lower.equals("salut") || lower.equals("bonjour") || lower.equals("hello");
    }

    private boolean matchesAny(String lower, String... keywords) {
        for (String kw : keywords) {
            if (lower.contains(kw)) return true;
        }
        return false;
    }

    private String fmt(BigDecimal v) {
        if (v == null) return "0";
        return v.setScale(0, RoundingMode.HALF_UP).toPlainString();
    }

    private String pct(double v) {
        return String.format("%.1f", v);
    }

    /* ── Réponses ── */

    private String greeting() {
        return "Bonjour ! Je suis M-TAX AI. Posez-moi des questions sur vos "
                + "contribuables, déclarations, créances, paiements ou le recouvrement. Je suis là pour vous aider !";
    }

    private String helpMessage() {
        return """
                Voici ce que je peux faire pour vous :
                • Résumer vos données fiscales en un clin d'œil
                • Donner des statistiques sur les contribuables, déclarations, créances et paiements
                • Expliquer le taux de recouvrement et les retards
                • Répondre sur les reçus émis

                Essayez par exemple :
                - « Combien de contribuables ? »
                - « Quel est le taux de recouvrement ? »
                - « Résumé des créances »
                - « Paiements du mois »""";
    }

    private String taxpayerResponse(DashboardSummary s) {
        return "Vous avez actuellement **" + s.taxpayerCount() + " contribuables** enregistrés"
                + (s.newTaxpayers() > 0 ? ", dont **" + s.newTaxpayers() + "** ajoutés récemment." : ".")
                + "\n\nAllez dans la section Contribuables pour en gérer.";
    }

    private String declarationResponse(DashboardSummary s) {
        return "Vous avez **" + s.declarationCount() + " déclarations** au total"
                + (s.declarationsToProcess() > 0
                ? ", dont **" + s.declarationsToProcess() + "** en attente de traitement."
                : ". " + s.declarationsToProcess() + " ont déjà été traitées.")
                + "\n\nConsultez la page Déclarations pour voir le détail.";
    }

    private String debtResponse(DashboardSummary s) {
        StringBuilder sb = new StringBuilder();
        sb.append("Créances :\n");
        sb.append("- Total : **%d créances**".formatted(s.debtCount()));
        sb.append("\n- Montant total dû : **%s MGA**".formatted(fmt(s.totalDebts())));
        sb.append("\n- Restant à percevoir : **%s MGA**".formatted(fmt(s.totalOutstanding())));
        if (s.overdueCount() > 0) {
            sb.append("\n- En retard : **%d créances** pour **%s MGA**".formatted(s.overdueCount(), fmt(s.overdueBalance())));
        }
        if (!s.debtsByStatus().isEmpty()) {
            sb.append("\n\nRépartition par statut :");
            for (Map<String, Object> row : s.debtsByStatus()) {
                Object status = row.getOrDefault("status", "?");
                Object count = row.getOrDefault("count", 0);
                Object total = row.getOrDefault("total", BigDecimal.ZERO);
                sb.append("\n  • %s : %s créances (%s MGA)".formatted(status, count, fmt((BigDecimal) total)));
            }
        }
        return sb.toString();
    }

    private String paymentResponse(DashboardSummary s) {
        StringBuilder sb = new StringBuilder();
        sb.append("Paiements :\n");
        sb.append("- Total enregistrés : **%d paiements**".formatted(s.paymentCount()));
        sb.append("\n- Montant encaissé : **%s MGA**".formatted(fmt(s.totalCollected())));
        if (s.currentMonthPayments() != null && s.currentMonthPayments().compareTo(BigDecimal.ZERO) > 0) {
            sb.append("\n- Ce mois-ci : **%s MGA**".formatted(fmt(s.currentMonthPayments())));
        }
        if (!s.paymentsByTaxType().isEmpty()) {
            sb.append("\n\nPar type d'impôt :");
            for (Map<String, Object> row : s.paymentsByTaxType()) {
                Object type = row.getOrDefault("taxType", "?");
                Object total = row.getOrDefault("total", BigDecimal.ZERO);
                sb.append("\n  • %s : %s MGA".formatted(type, fmt((BigDecimal) total)));
            }
        }
        return sb.toString();
    }

    private String collectionResponse(DashboardSummary s) {
        return "Taux de recouvrement : **" + pct(s.collectionRate()) + " %**"
                + "\n\nMontant total dû : **" + fmt(s.totalDebts()) + " MGA**"
                + "\nDéjà encaissé : **" + fmt(s.totalCollected()) + " MGA**"
                + "\nRestant : **" + fmt(s.totalOutstanding()) + " MGA**";
    }

    private String assessmentResponse(DashboardSummary s) {
        return "Vous avez **" + s.assessmentCount() + " impositions** enregistrées dans le système."
                + "\n\nRendez-vous dans la section Impositions pour les consulter ou en créer de nouvelles.";
    }

    private String overdueResponse(DashboardSummary s) {
        if (s.overdueCount() == 0) {
            return "Aucune créance en retard. Excellent travail de recouvrement !";
        }
        return "Retards de paiement :\n"
                + "- **" + s.overdueCount() + " créances** en retard"
                + "\n- Montant : **" + fmt(s.overdueBalance()) + " MGA**";
    }

    private String summaryResponse(DashboardSummary s) {
        return "Résumé MNK-TAX :\n"
                + "- Contribuables : **" + s.taxpayerCount() + "** (" + s.newTaxpayers() + " nouveaux)\n"
                + "- Déclarations : **" + s.declarationCount() + "** (" + s.declarationsToProcess() + " à traiter)\n"
                + "- Impositions : **" + s.assessmentCount() + "**\n"
                + "- Créances : **" + s.debtCount() + "** (" + s.overdueCount() + " en retard)\n"
                + "- Paiements : **" + s.paymentCount() + "**\n"
                + "- Total dû : **" + fmt(s.totalDebts()) + " MGA**\n"
                + "- Total encaissé : **" + fmt(s.totalCollected()) + " MGA**\n"
                + "- Restant dû : **" + fmt(s.totalOutstanding()) + " MGA**\n"
                + "- Taux de recouvrement : **" + pct(s.collectionRate()) + " %**";
    }

    private String receiptResponse(DashboardSummary s) {
        StringBuilder sb = new StringBuilder("Reçus émis :\n");
        sb.append("- Total : **").append(s.receiptCount()).append(" reçus**");
        if (s.receiptTotalAmount() != null) {
            sb.append("\n- Montant total : **").append(fmt(s.receiptTotalAmount())).append(" MGA**");
        }
        if (s.todayReceiptCount() > 0) {
            sb.append("\n- Aujourd'hui : **").append(s.todayReceiptCount()).append("**");
        }
        return sb.toString();
    }

    private String recentActivityResponse(DashboardSummary s) {
        StringBuilder sb = new StringBuilder("Activité récente :\n");
        if (!s.recentActivity().isEmpty()) {
            for (Map<String, Object> a : s.recentActivity()) {
                Object label = a.getOrDefault("label", "");
                Object date = a.getOrDefault("date", "");
                sb.append("\n• %s (%s)".formatted(label, date));
            }
        } else {
            sb.append("\nAucune activité récente enregistrée.");
        }
        return sb.toString();
    }

    private String defaultResponse(String lower, DashboardSummary s) {
        return "Je suis M-TAX AI, spécialisé dans la gestion fiscale malgache. "
                + "Je peux vous renseigner sur :\n"
                + "- Les **contribuables** (%d enregistrés)\n".formatted(s.taxpayerCount())
                + "- Les **déclarations** (%d au total)\n".formatted(s.declarationCount())
                + "- Les **créances** (%d, dont %d en retard)\n".formatted(s.debtCount(), s.overdueCount())
                + "- Les **paiements** (%d enregistrés)\n".formatted(s.paymentCount())
                + "- Le **taux de recouvrement** (%s %%)\n".formatted(pct(s.collectionRate()))
                + "- Les **reçus** (%d émis)\n".formatted(s.receiptCount())
                + "\nPosez-moi une question plus précise !";
    }
}
