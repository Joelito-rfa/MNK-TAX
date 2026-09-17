package com.mnktax.ai.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.NumberFormat;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Map.Entry;
import java.util.Set;

import static java.util.Map.entry;

/**
 * Corpus multilingue (fr / en / mg) de l'assistant M-TAX AI : templates de
 * réponse, mots-clés de détection d'intention et formatage des nombres.
 */
public final class AiMessages {

    /* ──────────────────────────────────────────────────────────────── */
    /*  Formats                                              */
    /* ──────────────────────────────────────────────────────────────── */

    private interface NumberCfg {
        NumberFormat intFmt();

        NumberFormat fracFmt();

        String fR1000();

        String fR1M();

        String fR1Md();

        List<String> suffB();

        List<String> suffM();

        List<String> suffK();

        String trendUp();

        String trendDown();

        String trendStable();
    }

    private static final NumberCfg FR = new NumberCfg() {
        public NumberFormat intFmt() { return NumberFormat.getIntegerInstance(Locale.FRENCH); }
        public NumberFormat fracFmt() { NumberFormat n = NumberFormat.getNumberInstance(Locale.FRENCH); n.setMaximumFractionDigits(1); n.setMinimumFractionDigits(1); return n; }
        public String fR1000() { return " Md"; } public String fR1M() { return " M"; } public String fR1Md() { return " k"; }
        public List<String> suffB() { return List.of("Md"); } public List<String> suffM() { return List.of("M"); } public List<String> suffK() { return List.of("k"); }
        public String trendUp() { return " ↑ +%s%%"; } public String trendDown() { return " ↓ %s%%"; } public String trendStable() { return " → stable"; }
    };

    private static final NumberCfg EN = new NumberCfg() {
        public NumberFormat intFmt() { return NumberFormat.getIntegerInstance(Locale.US); }
        public NumberFormat fracFmt() { NumberFormat n = NumberFormat.getNumberInstance(Locale.US); n.setMaximumFractionDigits(1); n.setMinimumFractionDigits(1); return n; }
        public String fR1000() { return " B"; } public String fR1M() { return " M"; } public String fR1Md() { return " k"; }
        public List<String> suffB() { return List.of("B"); } public List<String> suffM() { return List.of("M"); } public List<String> suffK() { return List.of("k"); }
        public String trendUp() { return " ▲ +%s%%"; } public String trendDown() { return " ▼ %s%%"; } public String trendStable() { return " → stable"; }
    };

    private static final NumberCfg MG = FR;

    /* ──────────────────────────────────────────────────────────────── */
    /*  Corpus                                                         */
    /* ──────────────────────────────────────────────────────────────── */

    private final Map<String, String> texts;
    private final NumberCfg num;
    private final List<String> greetingKw;
    private final List<String> helpKw;
    private final List<String> taxpayerKw;
    private final List<String> declarationKw;
    private final List<String> debtKw;
    private final List<String> paymentKw;
    private final List<String> collectionKw;
    private final List<String> assessmentKw;
    private final List<String> overdueKw;
    private final List<String> summaryKw;
    private final List<String> recentKw;
    private final List<String> nextKw;
    private final List<String> topKw;
    private final List<String> trendKw;
    private final List<String> alertKw;
    private final List<String> receiptKw;
    private final List<String> affirmativeKw;
    private final String urgentHigh;
    private final String urgentWarn;

    private AiMessages(Map<String, String> texts, NumberCfg num,
                       List<String> greetingKw, List<String> helpKw, List<String> taxpayerKw,
                       List<String> declarationKw, List<String> debtKw, List<String> paymentKw,
                       List<String> collectionKw, List<String> assessmentKw, List<String> overdueKw,
                       List<String> summaryKw, List<String> recentKw, List<String> nextKw,
                       List<String> topKw, List<String> trendKw, List<String> alertKw,
                       List<String> receiptKw, List<String> affirmativeKw,
                       String urgentHigh, String urgentWarn) {
        this.texts = texts;
        this.num = num;
        this.greetingKw = greetingKw;
        this.helpKw = helpKw;
        this.taxpayerKw = taxpayerKw;
        this.declarationKw = declarationKw;
        this.debtKw = debtKw;
        this.paymentKw = paymentKw;
        this.collectionKw = collectionKw;
        this.assessmentKw = assessmentKw;
        this.overdueKw = overdueKw;
        this.summaryKw = summaryKw;
        this.recentKw = recentKw;
        this.nextKw = nextKw;
        this.topKw = topKw;
        this.trendKw = trendKw;
        this.alertKw = alertKw;
        this.receiptKw = receiptKw;
        this.affirmativeKw = affirmativeKw;
        this.urgentHigh = urgentHigh;
        this.urgentWarn = urgentWarn;
    }

    public static AiMessages of(String locale) {
        return switch (locale == null ? "fr" : locale.toLowerCase()) {
            case "en" -> new AiMessages(EN_TEXTS, EN, EN_GREETING, EN_HELP, EN_TAXPAYER, EN_DECLARATION,
                    EN_DEBT, EN_PAYMENT, EN_COLLECTION, EN_ASSESSMENT, EN_OVERDUE, EN_SUMMARY,
                    EN_RECENT, EN_NEXT, EN_TOP, EN_TREND, EN_ALERT, EN_RECEIPT, EN_AFFIRMATIVE,
                    "\n\n🚨 **Alert**: A large volume of overdue debts requires immediate action.",
                    "\n\n⚠️ **Warning**: Several debts are overdue — consider sending reminders.");
            case "mg" -> new AiMessages(MG_TEXTS, MG, MG_GREETING, MG_HELP, MG_TAXPAYER, MG_DECLARATION,
                    MG_DEBT, MG_PAYMENT, MG_COLLECTION, MG_ASSESSMENT, MG_OVERDUE, MG_SUMMARY,
                    MG_RECENT, MG_NEXT, MG_TOP, MG_TREND, MG_ALERT, MG_RECEIPT, MG_AFFIRMATIVE,
                    "\n\n🚨 **Fampitandremana**: Misy trosa maromaro lany andro mitaky hetsika haingana.",
                    "\n\n⚠️ **Fampandrenesana**: Misy trosa maromaro lany andro — eritrereto ny mampandeha fampahatsiarovana.");
            default -> new AiMessages(FR_TEXTS, FR, FR_GREETING, FR_HELP, FR_TAXPAYER, FR_DECLARATION,
                    FR_DEBT, FR_PAYMENT, FR_COLLECTION, FR_ASSESSMENT, FR_OVERDUE, FR_SUMMARY,
                    FR_RECENT, FR_NEXT, FR_TOP, FR_TREND, FR_ALERT, FR_RECEIPT, FR_AFFIRMATIVE,
                    "\n\n🚨 **Alerte** : Un volume important de créances en retard nécessite une action immédiate.",
                    "\n\n⚠️ **Attention** : Plusieurs créances sont en retard — pensez à lancer des relances.");
        };
    }

    String text(String key) {
        return texts.get(key);
    }

    boolean isGreeting(String lower) {
        return matchesAny(lower, greetingKw) || greetingKw.contains(lower);
    }

    boolean matchesTaxpayers(String lower) { return matchesAny(lower, taxpayerKw); }
    boolean matchesDeclarations(String lower) { return matchesAny(lower, declarationKw); }
    boolean matchesDebts(String lower) { return matchesAny(lower, debtKw); }
    boolean matchesPayments(String lower) { return matchesAny(lower, paymentKw); }
    boolean matchesCollection(String lower) { return matchesAny(lower, collectionKw); }
    boolean matchesAssessments(String lower) { return matchesAny(lower, assessmentKw); }
    boolean matchesOverdue(String lower) { return matchesAny(lower, overdueKw); }
    boolean matchesSummary(String lower) { return matchesAny(lower, summaryKw); }
    boolean matchesRecent(String lower) { return matchesAny(lower, recentKw); }
    boolean matchesNext(String lower) { return matchesAny(lower, nextKw); }
    boolean matchesTop(String lower) { return matchesAny(lower, topKw); }
    boolean matchesTrend(String lower) { return matchesAny(lower, trendKw); }
    boolean matchesAlerts(String lower) { return matchesAny(lower, alertKw); }
    boolean matchesReceipts(String lower) { return matchesAny(lower, receiptKw); }
    boolean matchesHelp(String lower) { return matchesAny(lower, helpKw); }
    boolean matchesAffirmative(String lower) { return matchesAny(lower, affirmativeKw); }

    boolean lastBotAboutTaxpayers(String lower) {
        return matchesAny(lower, taxpayerKw);
    }

    private boolean matchesAny(String lower, List<String> keywords) {
        for (String kw : keywords) {
            if (lower.contains(kw)) return true;
        }
        return false;
    }

    /* ── Formatage ── */

    String fmt(BigDecimal v) {
        if (v == null) return "0";
        return num.intFmt().format(v.setScale(0, RoundingMode.HALF_UP));
    }

    String fmtK(BigDecimal v) {
        if (v == null) return "0";
        double d = v.doubleValue();
        if (d >= 1_000_000_000) return num.fracFmt().format(d / 1_000_000_000) + num.suffB().get(0);
        if (d >= 1_000_000) return num.fracFmt().format(d / 1_000_000) + num.suffM().get(0);
        if (d >= 1_000) return num.fracFmt().format(d / 1_000) + num.suffK().get(0);
        return fmt(v);
    }

    String pct(double v) {
        return num.fracFmt().format(v);
    }

    String trend(BigDecimal current, BigDecimal previous) {
        if (previous == null || previous.compareTo(BigDecimal.ZERO) == 0) return "";
        double diff = (current.subtract(previous).doubleValue()) / previous.doubleValue() * 100;
        if (diff > 0) return String.format(num.trendUp(), num.fracFmt().format(diff));
        if (diff < 0) return String.format(num.trendDown(), num.fracFmt().format(diff));
        return num.trendStable();
    }

    String healthEmoji(double rate) {
        if (rate >= 80) return "🟢";
        if (rate >= 60) return "🟡";
        if (rate >= 40) return "🟠";
        return "🔴";
    }

    String urgentEmoji(long overdueCount, BigDecimal overdueBalance) {
        if (overdueCount == 0) return "";
        if (overdueCount > 20 || (overdueBalance != null && overdueBalance.doubleValue() > 10_000_000)) {
            return "\n\n" + urgentHigh;
        }
        if (overdueCount > 10) {
            return "\n\n" + urgentWarn;
        }
        return "";
    }

    /* ════════════════════════════════════════════════════════════ */
    /*  FRANÇAIS                                                    */
    /* ════════════════════════════════════════════════════════════ */

    private static final Map<String, String> FR_TEXTS = Map.ofEntries(frEntries());

    private static Entry<String, String>[] frEntries() {
        List<Entry<String, String>> e = new java.util.ArrayList<>();
        e.add(entry("greeting",
                "Bonjour ! 👋 Je suis **M-TAX AI**, votre assistant fiscal intelligent.\n\n"
                        + "Je peux vous fournir des analyses en temps réel sur :\n"
                        + "• 📊 Statistiques globales\n"
                        + "• 👥 Contribuables et NIF\n"
                        + "• 📋 Déclarations fiscales\n"
                        + "• 💰 Paiements et encaissements\n"
                        + "• 📉 Créances et recouvrement\n"
                        + "• 📈 Tendances et alertes\n\n"
                        + "Que souhaitez-vous savoir ?"));
        e.add(entry("help",
                "## 🧭 Guide d'utilisation — M-TAX AI\n\n"
                        + "Je suis spécialisé dans la gestion fiscale malgache. Voici ce que je peux faire :\n\n"
                        + "### 📊 Statistiques\n"
                        + "• « Résumé général » — Vue d'ensemble complète\n"
                        + "• « Bilan du mois » — Données de la période courante\n"
                        + "• « Comparaison avec le mois dernier » — Tendance\n\n"
                        + "### 👥 Contribuables\n"
                        + "• « Combien de contribuables ? »\n"
                        + "• « Top contribuables » — Meilleurs payeurs\n"
                        + "• « Nouveaux contribuables »\n\n"
                        + "### 📋 Déclarations\n"
                        + "• « État des déclarations »\n"
                        + "• « Déclarations en attente »\n\n"
                        + "### 💰 Paiements\n"
                        + "• « Total encaissé »\n"
                        + "• « Paiements par type d'impôt »\n\n"
                        + "### 📉 Créances\n"
                        + "• « Résumé des créances »\n"
                        + "• « Créances en retard »\n"
                        + "• « Répartition par statut »\n\n"
                        + "### ⚠️ Alertes\n"
                        + "• « Y a-t-il des alertes ? » — Points critiques\n"
                        + "• « Prochaines actions » — À faire\n\n"
                        + "Posez-moi une question avec vos propres mots, je comprends !"));
        e.add(entry("tax_count", "**%d** contribuables enregistrés au total.\n\n"));
        e.add(entry("tax_new", "📈 **%d** nouveaux ajouts récemment.\n"));
        e.add(entry("tax_top_title", "\n### 🏆 Top contribuables par encaissement :\n"));
        e.add(entry("tax_top_item", "  %d. **%s** — %s MGA\n"));
        e.add(entry("tax_tip_empty", "\n💡 **Conseil** : Commencez par enregistrer vos contribuables dans la section Contribuables."));
        e.add(entry("tax_tip_nonew", "\n💡 **Conseil** : Aucun nouveau contribuable récemment. Pensez à vérifier les inscriptions en attente."));
        e.add(entry("title_taxpayers", "## 👥 Contribuables\n\n"));
        e.add(entry("dec_count", "**%d** déclarations au total.\n\n"));
        e.add(entry("dec_toprocess", "⏳ **%d** en attente de traitement.\n"));
        e.add(entry("dec_new", "📥 **%d** nouvelles ce mois-ci.\n"));
        e.add(entry("dec_rate", "\n✅ Taux de traitement : **%s%%**\n"));
        e.add(entry("dec_warn", "\n🚨 **Attention** : %d déclarations en attente — un effort de traitement est recommandé."));
        e.add(entry("dec_done", "\n🎉 Toutes les déclarations ont été traitées !"));
        e.add(entry("title_declarations", "## 📋 Déclarations fiscales\n\n"));
        e.add(entry("debt_count", "• Total : **%d créances**\n"));
        e.add(entry("debt_total", "• Montant total dû : **%s MGA**\n"));
        e.add(entry("debt_collected", "• Déjà encaissé : **%s MGA**\n"));
        e.add(entry("debt_outstanding", "• Restant à percevoir : **%s MGA**\n"));
        e.add(entry("debt_overdue", "\n⚠️ **En retard** : **%d** créances — **%s MGA**\n"));
        e.add(entry("debt_status_title", "\n### 📊 Répartition par statut :\n"));
        e.add(entry("debt_status_item", "  • **%s** : %d créances — %s MGA\n"));
        e.add(entry("debt_type_title", "\n### 🔴 Retards par type d'impôt :\n"));
        e.add(entry("debt_type_item", "  • **%s** : %d en retard\n"));
        e.add(entry("title_debts", "## 📉 Créances\n\n"));
        e.add(entry("pay_count", "• Total enregistrés : **%d paiements**\n"));
        e.add(entry("pay_collected", "• Montant encaissé : **%s MGA**\n"));
        e.add(entry("pay_month", "• Ce mois-ci : **%s MGA**\n"));
        e.add(entry("pay_period", "• Période filtrée : **%s MGA** (%d paiements)\n"));
        e.add(entry("pay_vs", "• vs période précédente : **%s**\n"));
        e.add(entry("pay_type_title", "\n### 📊 Par type d'impôt :\n"));
        e.add(entry("pay_type_item", "  • **%s** : %s MGA\n"));
        e.add(entry("pay_tip", "\n💡 **Conseil** : Aucun paiement enregistré. Vérifiez que les encaissements sont bien saisis."));
        e.add(entry("title_payments", "## 💰 Paiements\n\n"));
        e.add(entry("col_rate", "**%s %%**\n\n"));
        e.add(entry("col_perf_excellent", "\n✅ **Excellente performance** de recouvrement !"));
        e.add(entry("col_perf_good", "\n💡 **Performance correcte**, mais des améliorations sont possibles."));
        e.add(entry("col_perf_below", "\n⚠️ **Performance en dessous de la moyenne** — renforcez les actions de relance."));
        e.add(entry("col_perf_critical", "\n🚨 **Performance critique** — des mesures urgentes sont nécessaires."));
        e.add(entry("col_type_item", "  • **%s** : %s %% — %s MGA\n"));
        e.add(entry("title_rate", "## 📈 Taux de recouvrement\n\n"));
        e.add(entry("assess_count", "**%d** impositions enregistrées dans le système.\n"));
        e.add(entry("assess_tip", "\n💡 **Conseil** : Rendez-vous dans la section Impositions pour créer de nouvelles impositions."));
        e.add(entry("assess_note", "\nConsultez la page Impositions pour gérer les barèmes et grilles d'imposition."));
        e.add(entry("title_assessments", "## 📑 Impositions\n\n"));
        e.add(entry("ovd_none", "🟢 **Aucune créance en retard** — Excellent travail de recouvrement !"));
        e.add(entry("ovd_count", "🔴 **%d** créances en retard\n"));
        e.add(entry("ovd_amount", "💰 Montant : **%s MGA**\n"));
        e.add(entry("ovd_share", "📊 Part des retards : **%s%%** des créances\n"));
        e.add(entry("ovd_type_title", "\n### 📋 Par type d'impôt :\n"));
        e.add(entry("ovd_type_item", "  • **%s** : %d — %s MGA\n"));
        e.add(entry("ovd_rec_title", "\n### 💡 Recommandations :\n"));
        e.add(entry("ovd_rec1", "• Lancez des relances pour les créances les plus anciennes\n"));
        e.add(entry("ovd_rec2", "• Priorisez les montants les plus élevés\n"));
        e.add(entry("ovd_rec3", "• Envisagez des plans de paiement pour les gros montants"));
        e.add(entry("title_overdue", "## ⏰ Retards de paiement\n\n"));
        e.add(entry("sum_header", "| Indicateur | Valeur |\n|---|---|\n"));
        e.add(entry("sum_taxpayers", "| 👥 Contribuables | **%d** (%d nouveaux) |\n"));
        e.add(entry("sum_declarations", "| 📋 Déclarations | **%d** (%d à traiter) |\n"));
        e.add(entry("sum_assessments", "| 📑 Impositions | **%d** |\n"));
        e.add(entry("sum_debts", "| 📉 Créances | **%d** (%d en retard) |\n"));
        e.add(entry("sum_payments", "| 💰 Paiements | **%d** |\n"));
        e.add(entry("sum_total_due", "| 💵 Total dû | **%s MGA** |\n"));
        e.add(entry("sum_collected", "| ✅ Encaissé | **%s MGA** |\n"));
        e.add(entry("sum_outstanding", "| 📊 Restant | **%s MGA** |\n"));
        e.add(entry("sum_rate", "| 📈 Taux recouvrement | **%s %%** %s |\n"));
        e.add(entry("sum_receipts", "| 🧾 Reçus | **%d** |\n"));
        e.add(entry("sum_evo", "| 📈 Évolution | **%s** vs période précédente |\n"));
        e.add(entry("title_summary", "## 📊 Résumé MNK-TAX\n\n"));
        e.add(entry("rec_total", "• Total : **%d reçus**\n"));
        e.add(entry("rec_amount", "• Montant total : **%s MGA**\n"));
        e.add(entry("rec_today", "• Aujourd'hui : **%d** reçus\n"));
        e.add(entry("rec_month_title", "\n### 📅 Émission par mois :\n"));
        e.add(entry("rec_month_item", "  • **%s** : %d reçus\n"));
        e.add(entry("title_receipts", "## 🧾 Reçus émis\n\n"));
        e.add(entry("recent_item", "• %s**%s** — %s\n"));
        e.add(entry("recent_more", "\n_... et %d autres actions_\n"));
        e.add(entry("recent_none", "Aucune activité récente enregistrée.\n"));
        e.add(entry("recent_tip", "\n💡 **Conseil** : Les activités apparaîtront ici après vos prochaines actions."));
        e.add(entry("title_recent", "## 🕐 Activité récente\n\n"));
        e.add(entry("next_debt_ref", " — créance %s"));
        e.add(entry("next_none", "Aucune action planifiée pour le moment.\n"));
        e.add(entry("next_priority", "\n⚠️ **Actions prioritaires** :\n"));
        e.add(entry("next_relance", "• Relancer les **%d** créances en retard\n"));
        e.add(entry("next_recover", "• Montant à récupérer : **%s MGA**\n"));
        e.add(entry("next_process_title", "\n📋 **À traiter** :\n"));
        e.add(entry("next_declarations", "• **%d** déclarations en attente de traitement\n"));
        e.add(entry("title_next", "## 📌 Prochaines actions\n\n"));
        e.add(entry("top_none", "Aucune donnée disponible pour le moment.\n"));
        e.add(entry("top_tip", "\n💡 Les classements apparaîtront après les premiers encaissements."));
        e.add(entry("top_nif", " (NIF: %s)"));
        e.add(entry("title_top", "## 🏆 Top contribuables par encaissement\n\n"));
        e.add(entry("tr_enc", "• Encaissements : **%s MGA** vs **%s MGA**"));
        e.add(entry("tr_newtax", "• Nouveaux contribuables : **%d**\n"));
        e.add(entry("tr_decl", "• Déclarations créées : **%d**\n"));
        e.add(entry("tr_month_title", "\n### 📅 Encaissements par mois :\n"));
        e.add(entry("tr_month_item", "  • **%s** : %s MGA\n"));
        e.add(entry("title_trend", "## 📈 Tendances et évolution\n\n"));
        e.add(entry("alert_overdue", "🔴 **%d** créances en retard — **%s MGA**\n"));
        e.add(entry("alert_declarations", "🟡 **%d** déclarations en attente de traitement\n"));
        e.add(entry("alert_rate", "🟠 Taux de recouvrement faible : **%s** %%\n"));
        e.add(entry("alert_outstanding", "🟡 **%s%%** du montant total reste à percevoir\n"));
        e.add(entry("alert_none", "🟢 **Aucune alerte critique** — Tout est sous contrôle !\n\n"));
        e.add(entry("alert_none2", "Continuez comme ça ! 🎉"));
        e.add(entry("alert_rec_title", "\n### 💡 Actions recommandées :\n"));
        e.add(entry("alert_rec_relance", "• Priorisez les relances pour les créances les plus anciennes\n"));
        e.add(entry("alert_rec_process", "• Accélérez le traitement des déclarations en attente\n"));
        e.add(entry("alert_rec_strategies", "• Renforcez les stratégies de recouvrement\n"));
        e.add(entry("alert_rec_module", "• Consultez le module Recouvrement pour planifier les actions"));
        e.add(entry("title_alert", "## 🚨 Alertes et points critiques\n\n"));
        e.add(entry("def_followup",
                "Parfait ! N'hésitez pas si vous avez d'autres questions sur :\n"
                        + "• Les déclarations fiscales\n"
                        + "• Les créances et le recouvrement\n"
                        + "• Les paiements et encaissements\n"
                        + "• Les alertes et tendances\n\n"
                        + "Je suis là pour vous aider ! 😊"));
        e.add(entry("def_title", "Je n'ai pas trouvé de réponse précise à votre question.\n\n"));
        e.add(entry("def_subheader", "### 🧭 Voici ce que je peux vous dire :\n\n"));
        e.add(entry("def_taxpayer", "• **%d** contribuables enregistrés\n"));
        e.add(entry("def_declaration", "• **%d** déclarations (%d à traiter)\n"));
        e.add(entry("def_debt", "• **%d** créances — **%s MGA** restant\n"));
        e.add(entry("def_payment", "• **%d** paiements — **%s MGA** encaissés\n"));
        e.add(entry("def_rate", "• Taux de recouvrement : **%s** %%\n"));
        e.add(entry("def_try", "\n💡 Essayez des questions comme :\n"));
        e.add(entry("def_try1", "• « Combien de contribuables ? »\n"));
        e.add(entry("def_try2", "• « Quel est le taux de recouvrement ? »\n"));
        e.add(entry("def_try3", "• « Résumé des créances »\n"));
        e.add(entry("def_try4", "• « Y a-t-il des alertes ? »\n"));
        e.add(entry("def_try5", "• « Top contribuables »\n"));
        e.add(entry("def_try6", "• « Comparaison avec le mois dernier »"));
        e.add(entry("err_retry", "Désolé, une erreur technique est survenue. Veuillez réessayer dans quelques instants.\n\n"));
        e.add(entry("err_support", "Si le problème persiste, contactez l'assistance technique."));
        return e.toArray(new Entry[0]);
    }

    private static final List<String> FR_GREETING = List.of("bonjour", "salut", "coucou", "bonsoir", "hey", "hello", "yo", "bonne journ");
    private static final List<String> FR_HELP = List.of("aide", "help", "comment", "utiliser", "fonctionne", "que sais-tu", "que savez", "capacit", "guide");
    private static final List<String> FR_TAXPAYER = List.of("contribuable", "contribuables", "taxpayer", "taxpayers", "entreprise", "entreprises", "societe", "sociéte", "sociétés", "nif", "registre");
    private static final List<String> FR_DECLARATION = List.of("declar", "impôt", "impot", "impôts", "imposition fiscale");
    private static final List<String> FR_DEBT = List.of("créance", "créances", "creance", "creances", "dette", "dettes", "impayé", "impaye", "non payé", "non paye", "restant", "encours", "dû");
    private static final List<String> FR_PAYMENT = List.of("paiement", "paiements", "fixation", "payer", "encaiss", "reçu", "recu", "reçus", "recus", "quittance", "encaissement", "montant reçu", "montant recu");
    private static final List<String> FR_COLLECTION = List.of("recouvrement", "taux", "collection", "recouvre", "recupér", "recuper", "perception");
    private static final List<String> FR_ASSESSMENT = List.of("imposition", "impositions", "assessment", "taxe", "taxes", "barème", "bareme", "grille");
    private static final List<String> FR_OVERDUE = List.of("retard", "retards", "overdue", "en retard", "échéance", "echeance", "échéancier", "echeancier", "défaillant", "defaillant", "en défaut", "en defaut");
    private static final List<String> FR_SUMMARY = List.of("total", "somme", "montant", "chiffre", "bilan", "résumé", "resume", "synthèse", "synthese", "global", "vue d'ensemble", "aperçu", "apercu", "récapitulatif", "recapitulatif");
    private static final List<String> FR_RECENT = List.of("activit", "récent", "recent", "dernier", "dernière", "derniere", "nouveaux", "nouvelles", "ce mois", "aujourd'hui", "ajourd hui", "hier", "jour");
    private static final List<String> FR_NEXT = List.of("prochaine", "prochain", "action", "actions", "planifier", "plan", "échéance à venir", "echeance a venir", "à faire", "a faire", "todo");
    private static final List<String> FR_TOP = List.of("meilleur", "meilleurs", "top", "classement", "ranking", "plus gros", "plus grand", "principaux");
    private static final List<String> FR_TREND = List.of("tendance", "trend", "évolution", "evolution", "progression", "hausse", "baisse", "comparaison", "vs", "contre", "période précédente", "periode precedente", "mois dernier");
    private static final List<String> FR_ALERT = List.of("alerte", "alert", "critique", "urgent", "problème", "probleme", "attention", "risque", "danger", "rouge");
    private static final List<String> FR_RECEIPT = List.of("reçu", "recu", "reçus", "recus", "quittance");
    private static final List<String> FR_AFFIRMATIVE = List.of("oui", "ok", "d'accord", "daccord", "merci", "autre", "suivant", "autre chose");

    /* ── Accesseurs statiques pour le scoring d'intentions (AiService) ── */

    public List<String> greetingKeywords() { return greetingKw; }
    public List<String> helpKeywords()     { return helpKw; }
    public List<String> taxpayerKeywords()  { return taxpayerKw; }
    public List<String> declarationKeywords() { return declarationKw; }
    public List<String> debtKeywords()      { return debtKw; }
    public List<String> paymentKeywords()   { return paymentKw; }
    public List<String> collectionKeywords() { return collectionKw; }
    public List<String> assessmentKeywords() { return assessmentKw; }
    public List<String> overdueKeywords()   { return overdueKw; }
    public List<String> summaryKeywords()   { return summaryKw; }
    public List<String> recentKeywords()    { return recentKw; }
    public List<String> nextKeywords()      { return nextKw; }
    public List<String> topKeywords()       { return topKw; }
    public List<String> trendKeywords()     { return trendKw; }
    public List<String> alertKeywords()     { return alertKw; }
    public List<String> receiptKeywords()   { return receiptKw; }

    /* ════════════════════════════════════════════════════════════ */
    /*  ENGLISH                                                     */
    /* ════════════════════════════════════════════════════════════ */

    private static final Map<String, String> EN_TEXTS = Map.ofEntries(enEntries());

    private static Entry<String, String>[] enEntries() {
        List<Entry<String, String>> e = new java.util.ArrayList<>();
        e.add(entry("greeting",
                "Hello! 👋 I am **M-TAX AI**, your smart tax assistant.\n\n"
                        + "I can provide real-time analysis on:\n"
                        + "• 📊 Global statistics\n"
                        + "• 👥 Taxpayers and NIF\n"
                        + "• 📋 Tax declarations\n"
                        + "• 💰 Payments and collections\n"
                        + "• 📉 Debts and recovery\n"
                        + "• 📈 Trends and alerts\n\n"
                        + "What would you like to know?"));
        e.add(entry("help",
                "## 🧭 M-TAX AI — Usage guide\n\n"
                        + "I specialize in Malagasy tax management. Here is what I can do:\n\n"
                        + "### 📊 Statistics\n"
                        + "• \"General summary\" — Full overview\n"
                        + "• \"Monthly balance\" — Current period data\n"
                        + "• \"Comparison with last month\" — Trend\n\n"
                        + "### 👥 Taxpayers\n"
                        + "• \"How many taxpayers?\"\n"
                        + "• \"Top taxpayers\" — Best payers\n"
                        + "• \"New taxpayers\"\n\n"
                        + "### 📋 Declarations\n"
                        + "• \"Declarations status\"\n"
                        + "• \"Pending declarations\"\n\n"
                        + "### 💰 Payments\n"
                        + "• \"Total collected\"\n"
                        + "• \"Payments by tax type\"\n\n"
                        + "### 📉 Debts\n"
                        + "• \"Debt summary\"\n"
                        + "• \"Overdue debts\"\n"
                        + "• \"Breakdown by status\"\n\n"
                        + "### ⚠️ Alerts\n"
                        + "• \"Are there any alerts?\" — Critical points\n"
                        + "• \"Next actions\" — To do\n\n"
                        + "Ask me in your own words, I understand!"));
        e.add(entry("tax_count", "**%d** registered taxpayers in total.\n\n"));
        e.add(entry("tax_new", "📈 **%d** new additions recently.\n"));
        e.add(entry("tax_top_title", "\n### 🏆 Top taxpayers by collection:\n"));
        e.add(entry("tax_top_item", "  %d. **%s** — %s MGA\n"));
        e.add(entry("tax_tip_empty", "\n💡 **Tip**: Start by registering your taxpayers in the Taxpayers section."));
        e.add(entry("tax_tip_nonew", "\n💡 **Tip**: No new taxpayers recently. Consider checking pending registrations."));
        e.add(entry("title_taxpayers", "## 👥 Taxpayers\n\n"));
        e.add(entry("dec_count", "**%d** declarations in total.\n\n"));
        e.add(entry("dec_toprocess", "⏳ **%d** awaiting processing.\n"));
        e.add(entry("dec_new", "📥 **%d** new this month.\n"));
        e.add(entry("dec_rate", "\n✅ Processing rate: **%s%%**\n"));
        e.add(entry("dec_warn", "\n🚨 **Warning**: %d declarations pending — processing effort is recommended."));
        e.add(entry("dec_done", "\n🎉 All declarations have been processed!"));
        e.add(entry("title_declarations", "## 📋 Tax declarations\n\n"));
        e.add(entry("debt_count", "• Total: **%d debts**\n"));
        e.add(entry("debt_total", "• Total amount due: **%s MGA**\n"));
        e.add(entry("debt_collected", "• Already collected: **%s MGA**\n"));
        e.add(entry("debt_outstanding", "• Remaining to collect: **%s MGA**\n"));
        e.add(entry("debt_overdue", "\n⚠️ **Overdue**: **%d** debts — **%s MGA**\n"));
        e.add(entry("debt_status_title", "\n### 📊 Breakdown by status:\n"));
        e.add(entry("debt_status_item", "  • **%s** : %d debts — %s MGA\n"));
        e.add(entry("debt_type_title", "\n### 🔴 Overdue by tax type:\n"));
        e.add(entry("debt_type_item", "  • **%s** : %d overdue\n"));
        e.add(entry("title_debts", "## 📉 Debts\n\n"));
        e.add(entry("pay_count", "• Total recorded: **%d payments**\n"));
        e.add(entry("pay_collected", "• Amount collected: **%s MGA**\n"));
        e.add(entry("pay_month", "• This month: **%s MGA**\n"));
        e.add(entry("pay_period", "• Filtered period: **%s MGA** (%d payments)\n"));
        e.add(entry("pay_vs", "• vs previous period: **%s**\n"));
        e.add(entry("pay_type_title", "\n### 📊 By tax type:\n"));
        e.add(entry("pay_type_item", "  • **%s** : %s MGA\n"));
        e.add(entry("pay_tip", "\n💡 **Tip**: No payments recorded. Make sure collections are correctly entered."));
        e.add(entry("title_payments", "## 💰 Payments\n\n"));
        e.add(entry("col_rate", "**%s %%**\n\n"));
        e.add(entry("col_perf_excellent", "\n✅ **Excellent collection performance**!"));
        e.add(entry("col_perf_good", "\n💡 **Good performance**, some improvements are possible."));
        e.add(entry("col_perf_below", "\n⚠️ **Below average performance** — strengthen follow-up actions."));
        e.add(entry("col_perf_critical", "\n🚨 **Critical performance** — urgent measures are needed."));
        e.add(entry("col_type_item", "  • **%s** : %s %% — %s MGA\n"));
        e.add(entry("title_rate", "## 📈 Collection rate\n\n"));
        e.add(entry("assess_count", "**%d** assessments recorded in the system.\n"));
        e.add(entry("assess_tip", "\n💡 **Tip**: Go to the Assessments section to create new assessments."));
        e.add(entry("assess_note", "\nCheck the Assessments page to manage rating scales and schedules."));
        e.add(entry("title_assessments", "## 📑 Assessments\n\n"));
        e.add(entry("ovd_none", "🟢 **No overdue debts** — Excellent collection work!"));
        e.add(entry("ovd_count", "🔴 **%d** overdue debts\n"));
        e.add(entry("ovd_amount", "💰 Amount: **%s MGA**\n"));
        e.add(entry("ovd_share", "📊 Overdue share: **%s%%** of debts\n"));
        e.add(entry("ovd_type_title", "\n### 📋 By tax type:\n"));
        e.add(entry("ovd_type_item", "  • **%s** : %d — %s MGA\n"));
        e.add(entry("ovd_rec_title", "\n### 💡 Recommendations:\n"));
        e.add(entry("ovd_rec1", "• Send reminders for the oldest debts\n"));
        e.add(entry("ovd_rec2", "• Prioritize the highest amounts\n"));
        e.add(entry("ovd_rec3", "• Consider payment plans for large amounts"));
        e.add(entry("title_overdue", "## ⏰ Late payments\n\n"));
        e.add(entry("sum_header", "| Indicator | Value |\n|---|---|\n"));
        e.add(entry("sum_taxpayers", "| 👥 Taxpayers | **%d** (%d new) |\n"));
        e.add(entry("sum_declarations", "| 📋 Declarations | **%d** (%d to process) |\n"));
        e.add(entry("sum_assessments", "| 📑 Assessments | **%d** |\n"));
        e.add(entry("sum_debts", "| 📉 Debts | **%d** (%d overdue) |\n"));
        e.add(entry("sum_payments", "| 💰 Payments | **%d** |\n"));
        e.add(entry("sum_total_due", "| 💵 Total due | **%s MGA** |\n"));
        e.add(entry("sum_collected", "| ✅ Collected | **%s MGA** |\n"));
        e.add(entry("sum_outstanding", "| 📊 Outstanding | **%s MGA** |\n"));
        e.add(entry("sum_rate", "| 📈 Collection rate | **%s %%** %s |\n"));
        e.add(entry("sum_receipts", "| 🧾 Receipts | **%d** |\n"));
        e.add(entry("sum_evo", "| 📈 Evolution | **%s** vs previous period |\n"));
        e.add(entry("title_summary", "## 📊 MNK-TAX Summary\n\n"));
        e.add(entry("rec_total", "• Total: **%d receipts**\n"));
        e.add(entry("rec_amount", "• Total amount: **%s MGA**\n"));
        e.add(entry("rec_today", "• Today: **%d** receipts\n"));
        e.add(entry("rec_month_title", "\n### 📅 Issuance by month:\n"));
        e.add(entry("rec_month_item", "  • **%s** : %d receipts\n"));
        e.add(entry("title_receipts", "## 🧾 Issued receipts\n\n"));
        e.add(entry("recent_item", "• %s**%s** — %s\n"));
        e.add(entry("recent_more", "\n_... and %d more actions_\n"));
        e.add(entry("recent_none", "No recent activity recorded.\n"));
        e.add(entry("recent_tip", "\n💡 **Tip**: Activities will appear here after your next actions."));
        e.add(entry("title_recent", "## 🕐 Recent activity\n\n"));
        e.add(entry("next_debt_ref", " — debt %s"));
        e.add(entry("next_none", "No action planned for now.\n"));
        e.add(entry("next_priority", "\n⚠️ **Priority actions**:\n"));
        e.add(entry("next_relance", "• Follow up the **%d** overdue debts\n"));
        e.add(entry("next_recover", "• Amount to recover: **%s MGA**\n"));
        e.add(entry("next_process_title", "\n📋 **To process**:\n"));
        e.add(entry("next_declarations", "• **%d** declarations awaiting processing\n"));
        e.add(entry("title_next", "## 📌 Next actions\n\n"));
        e.add(entry("top_none", "No data available at the moment.\n"));
        e.add(entry("top_tip", "\n💡 Rankings will appear after the first collections."));
        e.add(entry("top_nif", " (NIF: %s)"));
        e.add(entry("title_top", "## 🏆 Top taxpayers by collection\n\n"));
        e.add(entry("tr_enc", "• Collections: **%s MGA** vs **%s MGA**"));
        e.add(entry("tr_newtax", "• New taxpayers: **%d**\n"));
        e.add(entry("tr_decl", "• Declarations created: **%d**\n"));
        e.add(entry("tr_month_title", "\n### 📅 Collections by month:\n"));
        e.add(entry("tr_month_item", "  • **%s** : %s MGA\n"));
        e.add(entry("title_trend", "## 📈 Trends and evolution\n\n"));
        e.add(entry("alert_overdue", "🔴 **%d** overdue debts — **%s MGA**\n"));
        e.add(entry("alert_declarations", "🟡 **%d** declarations awaiting processing\n"));
        e.add(entry("alert_rate", "🟠 Low collection rate: **%s** %%\n"));
        e.add(entry("alert_outstanding", "🟡 **%s%%** of the total amount remains to be collected\n"));
        e.add(entry("alert_none", "🟢 **No critical alert** — Everything is under control!\n\n"));
        e.add(entry("alert_none2", "Keep it up! 🎉"));
        e.add(entry("alert_rec_title", "\n### 💡 Recommended actions:\n"));
        e.add(entry("alert_rec_relance", "• Prioritize reminders for the oldest debts\n"));
        e.add(entry("alert_rec_process", "• Speed up processing of pending declarations\n"));
        e.add(entry("alert_rec_strategies", "• Strengthen collection strategies\n"));
        e.add(entry("alert_rec_module", "• Check the Collection module to plan actions"));
        e.add(entry("title_alert", "## 🚨 Alerts and critical points\n\n"));
        e.add(entry("def_followup",
                "Great! Feel free to ask about:\n"
                        + "• Tax declarations\n"
                        + "• Debts and collection\n"
                        + "• Payments and receipts\n"
                        + "• Alerts and trends\n\n"
                        + "I'm here to help! 😊"));
        e.add(entry("def_title", "I couldn't find a precise answer to your question.\n\n"));
        e.add(entry("def_subheader", "### 🧭 Here is what I can tell you:\n\n"));
        e.add(entry("def_taxpayer", "• **%d** registered taxpayers\n"));
        e.add(entry("def_declaration", "• **%d** declarations (%d to process)\n"));
        e.add(entry("def_debt", "• **%d** debts — **%s MGA** outstanding\n"));
        e.add(entry("def_payment", "• **%d** payments — **%s MGA** collected\n"));
        e.add(entry("def_rate", "• Collection rate: **%s** %%\n"));
        e.add(entry("def_try", "\n💡 Try questions like:\n"));
        e.add(entry("def_try1", "• \"How many taxpayers?\"\n"));
        e.add(entry("def_try2", "• \"What is the collection rate?\"\n"));
        e.add(entry("def_try3", "• \"Debt summary\"\n"));
        e.add(entry("def_try4", "• \"Are there any alerts?\"\n"));
        e.add(entry("def_try5", "• \"Top taxpayers\"\n"));
        e.add(entry("def_try6", "• \"Comparison with last month\""));
        e.add(entry("err_retry", "Sorry, a technical error occurred. Please try again in a few moments.\n\n"));
        e.add(entry("err_support", "If the problem persists, contact technical support."));
        return e.toArray(new Entry[0]);
    }

    private static final List<String> EN_GREETING = List.of("hello", "hi", "hey", "good morning", "good afternoon", "good evening", "yo", "greetings", "bonjour");
    private static final List<String> EN_HELP = List.of("help", "how do", "how to", "how can", "use", "usage", "what can you", "capabilities", "guide", "instructions");
    private static final List<String> EN_TAXPAYER = List.of("taxpayer", "taxpayers", "company", "companies", "business", "businesses", "corporation", "nif", "registry", "register", "firm", "contribuable");
    private static final List<String> EN_DECLARATION = List.of("declaration", "declare", "filing", "tax return", "returns", "submitted", "declar");
    private static final List<String> EN_DEBT = List.of("debt", "debts", "unpaid", "outstanding", "owed", "arrears", "receivable", "money owed", "non-payment");
    private static final List<String> EN_PAYMENT = List.of("payment", "payments", "paid", "pay", "revenue", "receipt", "receipts", "received", "income", "collections", "cashed");
    private static final List<String> EN_COLLECTION = List.of("collection", "rate", "recovery", "collect", "recouvr");
    private static final List<String> EN_ASSESSMENT = List.of("assessment", "assessments", "levy", "levies", "tax scale", "threshold", "taxe");
    private static final List<String> EN_OVERDUE = List.of("overdue", "late", "past due", "delay", "delays", "arrears", "missed", "deadline", "expired","lany andro");
    private static final List<String> EN_SUMMARY = List.of("total", "sum", "amount", "summary", "overview", "global", "recap", "balance", "figures", "résumé","resume");
    private static final List<String> EN_RECENT = List.of("recent", "activity", "latest", "new", "today", "yesterday", "this month", "updates", "last");
    private static final List<String> EN_NEXT = List.of("next", "action", "actions", "plan", "to do", "todo", "upcoming", "scheduled");
    private static final List<String> EN_TOP = List.of("best", "top", "ranking", "largest", "biggest", "leaders", "main", "highest");
    private static final List<String> EN_TREND = List.of("trend", "evolution", "growth", "increase", "decrease", "comparison", "vs", "previous period", "last month", "progress");
    private static final List<String> EN_ALERT = List.of("alert", "alerts", "critical", "urgent", "problem", "attention", "risk", "danger", "warning", "issue");
    private static final List<String> EN_RECEIPT = List.of("receipt", "receipts", "quittance", "voucher");
    private static final List<String> EN_AFFIRMATIVE = List.of("yes", "yep", "ok", "okay", "thanks", "thank", "sure", "other", "another", "next", "continue", "perfect");

    /* ════════════════════════════════════════════════════════════ */
    /*  MALAGASY                                                    */
    /* ════════════════════════════════════════════════════════════ */

    private static final Map<String, String> MG_TEXTS = Map.ofEntries(mgEntries());

    private static Entry<String, String>[] mgEntries() {
        List<Entry<String, String>> e = new java.util.ArrayList<>();
        e.add(entry("greeting",
                "Manao ahoana! 👋 Izaho dia **M-TAX AI**, mpanampy vola marani-tsaina anao.\n\n"
                        + "Afaka manome famakafakana amin'ny fotoana tena izy aho momba :\n"
                        + "• 📊 Statistika ankapobeny\n"
                        + "• 👥 Mpandoa vola sy NIF\n"
                        + "• 📋 Fizorana hetra\n"
                        + "• 💰 Fandoavana sy fanangonam-bola\n"
                        + "• 📉 Trosa sy fandrenesana\n"
                        + "• 📈 Fivoarana sy fampandrenesana\n\n"
                        + "Inona no tianao ho fantatra?"));
        e.add(entry("help",
                "## 🧭 Torolàlana fampiasana — M-TAX AI\n\n"
                        + "Manam-pahaizana amin'ny fitantanana hetra malagasy aho. Izao no azoko atao :\n\n"
                        + "### 📊 Statistika\n"
                        + "• « Famintinana ankapobeny » — Fahitana feno\n"
                        + "• « Fifandanjan'ny volana » — Data amin'ny vanim-potoana\n"
                        + "• « Fampitahana amin'ny volana lasa » — Fivoarana\n\n"
                        + "### 👥 Mpandoa vola\n"
                        + "• « Firy ny mpandoa vola? »\n"
                        + "• « Mpandoa ambony indrindra » — Mpandoa tsara\n"
                        + "• « Mpandoa vaovao »\n\n"
                        + "### 📋 Fizorana\n"
                        + "• « Toetran'ny fizorana »\n"
                        + "• « Fizorana miandry »\n\n"
                        + "### 💰 Fandoavana\n"
                        + "• « Vola voangona rehetra »\n"
                        + "• « Fandoavana araka ny karazana hetra »\n\n"
                        + "### 📉 Trosa\n"
                        + "• « Famintinana ny trosa »\n"
                        + "• « Trosa lany andro »\n"
                        + "• « Fanapariahana araka ny toetra »\n\n"
                        + "### ⚠️ Fampandrenesana\n"
                        + "• « Misy fampandrenesana ve? » — Teboka manan-danja\n"
                        + "• « Asa manaraka » — Hatao\n\n"
                        + "Mametraha fanontaniana amin'ny teninao, mahay aho!"));
        e.add(entry("tax_count", "**%d** mpandoa vola voasoratra manontolo.\n\n"));
        e.add(entry("tax_new", "📈 **%d** fanampiana vaovao vao haingana.\n"));
        e.add(entry("tax_top_title", "\n### 🏆 Mpandoa ambony indrindra amin'ny fanangonana :\n"));
        e.add(entry("tax_top_item", "  %d. **%s** — %s MGA\n"));
        e.add(entry("tax_tip_empty", "\n💡 **Soso-kevitra** : Atombohy amin'ny fanoratana ny mpandoa vola ao amin'ny fizarana Mpandoa vola."));
        e.add(entry("tax_tip_nonew", "\n💡 **Soso-kevitra** : Tsy misy mpandoa vola vaovao vao haingana. Eritrereto ny hijerena ny antontan-teny miandry."));
        e.add(entry("title_taxpayers", "## 👥 Mpandoa vola\n\n"));
        e.add(entry("dec_count", "**%d** fizorana manontolo.\n\n"));
        e.add(entry("dec_toprocess", "⏳ **%d** miandry fanodinana.\n"));
        e.add(entry("dec_new", "📥 **%d** vaovao amin'ity volana ity.\n"));
        e.add(entry("dec_rate", "\n✅ Tahan'ny fanodinana : **%s%%**\n"));
        e.add(entry("dec_warn", "\n🚨 **Fampitandremana** : %d fizorana miandry — asaina manafaka ny fanodinana."));
        e.add(entry("dec_done", "\n🎉 Efa voasokajy avokoa ny fizorana!"));
        e.add(entry("title_declarations", "## 📋 Fizorana hetra\n\n"));
        e.add(entry("debt_count", "• Totaly : **%d trosa**\n"));
        e.add(entry("debt_total", "• Vola andoavana : **%s MGA**\n"));
        e.add(entry("debt_collected", "• Efa voangona : **%s MGA**\n"));
        e.add(entry("debt_outstanding", "• Sisa horaisina : **%s MGA**\n"));
        e.add(entry("debt_overdue", "\n⚠️ **Lany andro** : **%d** trosa — **%s MGA**\n"));
        e.add(entry("debt_status_title", "\n### 📊 Fanapariahana araka ny toetra :\n"));
        e.add(entry("debt_status_item", "  • **%s** : %d trosa — %s MGA\n"));
        e.add(entry("debt_type_title", "\n### 🔴 Trosa lany andro araka ny karazana hetra :\n"));
        e.add(entry("debt_type_item", "  • **%s** : %d lany andro\n"));
        e.add(entry("title_debts", "## 📉 Trosa\n\n"));
        e.add(entry("pay_count", "• Voasoratra : **%d fandoavana**\n"));
        e.add(entry("pay_collected", "• Vola voangona : **%s MGA**\n"));
        e.add(entry("pay_month", "• Amin'ity volana ity : **%s MGA**\n"));
        e.add(entry("pay_period", "• Vanim-potoana voasivana : **%s MGA** (%d fandoavana)\n"));
        e.add(entry("pay_vs", "• raha oharina amin'ny vanim-potoana taloha : **%s**\n"));
        e.add(entry("pay_type_title", "\n### 📊 Araka ny karazana hetra :\n"));
        e.add(entry("pay_type_item", "  • **%s** : %s MGA\n"));
        e.add(entry("pay_tip", "\n💡 **Soso-kevitra** : Tsy misy fandoavana voasoratra. Hamarino fa efa tafiditra ny fanangonana."));
        e.add(entry("title_payments", "## 💰 Fandoavana\n\n"));
        e.add(entry("col_rate", "**%s %%**\n\n"));
        e.add(entry("col_perf_excellent", "\n✅ **Fahombiazana lehibe** tamin'ny fangadiana!"));
        e.add(entry("col_perf_good", "\n💡 **Fahombiazana antonony**, saingy azo hatsaraina kokoa."));
        e.add(entry("col_perf_below", "\n⚠️ **Fahombiazana ambany** — mampitomboa ny hetsika fampahatsiarovana."));
        e.add(entry("col_perf_critical", "\n🚨 **Fahombiazana mampanahy** — ilaina ny fepetra maika."));
        e.add(entry("col_type_item", "  • **%s** : %s %% — %s MGA\n"));
        e.add(entry("title_rate", "## 📈 Tahan'ny fangadiana\n\n"));
        e.add(entry("assess_count", "**%d** tombana voasoratra ao amin'ny rafitra.\n"));
        e.add(entry("assess_tip", "\n💡 **Soso-kevitra** : Mandehana any amin'ny fizarana Tombana mba hamoronana tombana vaovao."));
        e.add(entry("assess_note", "\nJereo ny pejy Tombana mba hitantana ny barème sy ny grille hetra."));
        e.add(entry("title_assessments", "## 📑 Tombana\n\n"));
        e.add(entry("ovd_none", "🟢 **Tsy misy trosa lany andro** — Fahombiazana amin'ny fangadiana!"));
        e.add(entry("ovd_count", "🔴 **%d** trosa lany andro\n"));
        e.add(entry("ovd_amount", "💰 Vola : **%s MGA**\n"));
        e.add(entry("ovd_share", "📊 Anjara lany andro : **%s%%** amin'ny trosa\n"));
        e.add(entry("ovd_type_title", "\n### 📋 Araka ny karazana hetra :\n"));
        e.add(entry("ovd_type_item", "  • **%s** : %d — %s MGA\n"));
        e.add(entry("ovd_rec_title", "\n### 💡 Soso-kevitra :\n"));
        e.add(entry("ovd_rec1", "• Alefaso ny fampahatsiarovana ho an'ny trosa tranainy indrindra\n"));
        e.add(entry("ovd_rec2", "• Laharana aloha ny vola be indrindra\n"));
        e.add(entry("ovd_rec3", "• Eritrereto ny drafitra fandoavana ho an'ny trosa lehibe"));
        e.add(entry("title_overdue", "## ⏰ Fahatarana amin'ny fandoavana\n\n"));
        e.add(entry("sum_header", "| Tondro | Sanda |\n|---|---|\n"));
        e.add(entry("sum_taxpayers", "| 👥 Mpandoa vola | **%d** (%d vaovao) |\n"));
        e.add(entry("sum_declarations", "| 📋 Fizorana | **%d** (%d hotokana) |\n"));
        e.add(entry("sum_assessments", "| 📑 Tombana | **%d** |\n"));
        e.add(entry("sum_debts", "| 📉 Trosa | **%d** (%d lany andro) |\n"));
        e.add(entry("sum_payments", "| 💰 Fandoavana | **%d** |\n"));
        e.add(entry("sum_total_due", "| 💵 Totaly andoavana | **%s MGA** |\n"));
        e.add(entry("sum_collected", "| ✅ Voangona | **%s MGA** |\n"));
        e.add(entry("sum_outstanding", "| 📊 Sisa | **%s MGA** |\n"));
        e.add(entry("sum_rate", "| 📈 Tahan'ny fangadiana | **%s %%** %s |\n"));
        e.add(entry("sum_receipts", "| 🧾 Rakikira | **%d** |\n"));
        e.add(entry("sum_evo", "| 📈 Fivoarana | **%s** raha oharina amin'ny vanim-potoana taloha |\n"));
        e.add(entry("title_summary", "## 📊 Famintinana MNK-TAX\n\n"));
        e.add(entry("rec_total", "• Totaly : **%d rakikira**\n"));
        e.add(entry("rec_amount", "• Vola manontolo : **%s MGA**\n"));
        e.add(entry("rec_today", "• Ankehitriny : **%d** rakikira\n"));
        e.add(entry("rec_month_title", "\n### 📅 Fakana isam-bolana :\n"));
        e.add(entry("rec_month_item", "  • **%s** : %d rakikira\n"));
        e.add(entry("title_receipts", "## 🧾 Rakikira navoaka\n\n"));
        e.add(entry("recent_item", "• %s**%s** — %s\n"));
        e.add(entry("recent_more", "\n_... ary %d hetsika hafa_\n"));
        e.add(entry("recent_none", "Tsy misy hetsika vaovao voarakitra.\n"));
        e.add(entry("recent_tip", "\n💡 **Soso-kevitra** : Hisy hetsika hiseho eto aorian'ny asanao manaraka."));
        e.add(entry("title_recent", "## 🕐 Hetsika farany\n\n"));
        e.add(entry("next_debt_ref", " — trosa %s"));
        e.add(entry("next_none", "Tsy misy drafitra voalahatra amin'izao.\n"));
        e.add(entry("next_priority", "\n⚠️ **Hetsika laharam-pahamehana** :\n"));
        e.add(entry("next_relance", "• Fandrosoana ny **%d** trosa lany andro\n"));
        e.add(entry("next_recover", "• Vola hamerina : **%s MGA**\n"));
        e.add(entry("next_process_title", "\n📋 **Hotokana** :\n"));
        e.add(entry("next_declarations", "• **%d** fizorana miandry fanodinana\n"));
        e.add(entry("title_next", "## 📌 Hetsika manaraka\n\n"));
        e.add(entry("top_none", "Tsy misy data amin'izao.\n"));
        e.add(entry("top_tip", "\n💡 Hisy ny laharana aorian'ny fanangonana voalohany."));
        e.add(entry("top_nif", " (NIF: %s)"));
        e.add(entry("title_top", "## 🏆 Mpandoa ambony indrindra amin'ny fanangonana\n\n"));
        e.add(entry("tr_enc", "• Fanangonana : **%s MGA** raha oharina amin'ny **%s MGA**"));
        e.add(entry("tr_newtax", "• Mpandoa vola vaovao : **%d**\n"));
        e.add(entry("tr_decl", "• Fizorana noforonina : **%d**\n"));
        e.add(entry("tr_month_title", "\n### 📅 Fanangonana isam-bolana :\n"));
        e.add(entry("tr_month_item", "  • **%s** : %s MGA\n"));
        e.add(entry("title_trend", "## 📈 Fivoarana sy fironana\n\n"));
        e.add(entry("alert_overdue", "🔴 **%d** trosa lany andro — **%s MGA**\n"));
        e.add(entry("alert_declarations", "🟡 **%d** fizorana miandry fanodinana\n"));
        e.add(entry("alert_rate", "🟠 Tahan'ny fangadiana ambany : **%s** %%\n"));
        e.add(entry("alert_outstanding", "🟡 **%s%%** amin'ny vola manontolo mbola tsy voangona\n"));
        e.add(entry("alert_none", "🟢 **Tsy misy fampandrenesana** — Mifehy ny zava-drehetra!\n\n"));
        e.add(entry("alert_none2", "Tohizo fotsiny izany! 🎉"));
        e.add(entry("alert_rec_title", "\n### 💡 Hetsika natolotra :\n"));
        e.add(entry("alert_rec_relance", "• Laharana aloha ny fampahatsiarovana ho an'ny trosa tranainy\n"));
        e.add(entry("alert_rec_process", "• Manafaingana ny fanodinana ny fizorana miandry\n"));
        e.add(entry("alert_rec_strategies", "• Mampitomboa ny paikady fanangonana\n"));
        e.add(entry("alert_rec_module", "• Jereo ny fizarana Fandrenesana mba handrafetana hetsika"));
        e.add(entry("title_alert", "## 🚨 Fampandrenesana sy teboka manan-danja\n\n"));
        e.add(entry("def_followup",
                "Tena tsara! Aza misalasala mametraka fanontaniana hafa momba :\n"
                        + "• Ny fizorana hetra\n"
                        + "• Ny trosa sy ny fandrenesana\n"
                        + "• Ny fandoavana sy ny rakikira\n"
                        + "• Ny fampandrenesana sy ny fivoarana\n\n"
                        + "Eto aho hanampy anao! 😊"));
        e.add(entry("def_title", "Tsy nahita valiny mazava ho an'ny fanontanianao aho.\n\n"));
        e.add(entry("def_subheader", "### 🧭 Izao no azo ambara aminao :\n\n"));
        e.add(entry("def_taxpayer", "• **%d** mpandoa vola voasoratra\n"));
        e.add(entry("def_declaration", "• **%d** fizorana (%d hotokana)\n"));
        e.add(entry("def_debt", "• **%d** trosa — **%s MGA** sisa\n"));
        e.add(entry("def_payment", "• **%d** fandoavana — **%s MGA** voangona\n"));
        e.add(entry("def_rate", "• Tahan'ny fangadiana : **%s** %%\n"));
        e.add(entry("def_try", "\n💡 Andramo fanontaniana toy ny :\n"));
        e.add(entry("def_try1", "• « Firy ny mpandoa vola? »\n"));
        e.add(entry("def_try2", "• « Inona ny tahan'ny fangadiana? »\n"));
        e.add(entry("def_try3", "• « Famintinana ny trosa »\n"));
        e.add(entry("def_try4", "• « Misy fampandrenesana ve? »\n"));
        e.add(entry("def_try5", "• « Mpandoa ambony indrindra »\n"));
        e.add(entry("def_try6", "• « Fampitahana amin'ny volana lasa »"));
        e.add(entry("err_retry", "Miala tsiny, nisy hadisoana ara-teknika. Andramo indray amin'ny fotoana vitsy.\n\n"));
        e.add(entry("err_support", "Raha mitohy ny olana, mifandraisa amin'ny fanohanana ara-teknika."));
        return e.toArray(new Entry[0]);
    }

    private static final List<String> MG_GREETING = List.of("manao ahoana", "salama", "mankasitraka", "bonjour", "hey");
    private static final List<String> MG_HELP = List.of("fanampiana", "ahoana", "fampiasana", "torolalana", "inona no azonao atao", "fiasana", "help");
    private static final List<String> MG_TAXPAYER = List.of("mpandoa", "mpividy", "orinasa", "registre", "nif", "fikambanana", "contribuable");
    private static final List<String> MG_DECLARATION = List.of("fizorana", "hetra", "declarasiona", "fanambarana", "declar");
    private static final List<String> MG_DEBT = List.of("trosa", "tsy voaloa", "sisa", "trosa be", "impaye");
    private static final List<String> MG_PAYMENT = List.of("fandoavana", "voaloa", "voangona", "rakikira", "karama", "vola voangona", "fandoavam-bola");
    private static final List<String> MG_COLLECTION = List.of("fangadiana", "taha", "fanarenana", "fanangonam-bola", "recouvr");
    private static final List<String> MG_ASSESSMENT = List.of("fanombanana", "tombana", "barème", "bareme", "grille", "taham-bola", "hetra");
    private static final List<String> MG_OVERDUE = List.of("lany andro", "tara", "fahatarana", "tsy voaloa ara-potoana", "daty lany", "overdue");
    private static final List<String> MG_SUMMARY = List.of("famintinana", "totaly", "vola", "sanda", "fahitana", "ankapobeny", "résumé", "resume");
    private static final List<String> MG_RECENT = List.of("hetsika", "vaovao", "farany", "androany", "omaly", "volana", "tamin'ity volana", "asiana");
    private static final List<String> MG_NEXT = List.of("manaraka", "drafitra", "hetsika", "hatao", "ho vita", "plan", "todo");
    private static final List<String> MG_TOP = List.of("ambony", "tsara", "lehibe", "mpandoa ambony", "top", "laharana");
    private static final List<String> MG_TREND = List.of("fivoarana", "fitomboana", "fihenana", "fampitahana", "volana lasa", "fandrosoana", "tendance");
    private static final List<String> MG_ALERT = List.of("fampandrenesana", "fampitandremana", "alerte", "maika", "olana", "loza", "risque");
    private static final List<String> MG_RECEIPT = List.of("rakikira", "quittance", "reçu", "recu");
    private static final List<String> MG_AFFIRMATIVE = List.of("eny", "ok", "misaotra", "tsara", "hafa", "manaraka", "tohizo", "aza misalasala");
}