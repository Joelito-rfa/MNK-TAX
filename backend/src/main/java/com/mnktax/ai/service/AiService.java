package com.mnktax.ai.service;

import com.mnktax.ai.dto.AiDtos.ChatMessage;
import com.mnktax.reporting.dto.ReportDtos.DashboardSummary;
import com.mnktax.reporting.service.DashboardService;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Assistant IA amélioré M-TAX AI.
 *
 * Améliorations :
 * - Détection d'intention par scoring (pas juste premier match)
 * - Extraction d'entités (NIF, montants, types d'impôt, périodes)
 * - Suivi de contexte conversationnel (follow-ups, références implicites)
 * - Questions composées ("contribuables et paiements", "compare X avec Y")
 * - Analyse proactive (tendances, anomalies, recommandations)
 * - Réponses enrichies avec insights et suggestions
 */
@Service
public class AiService {

    private static final Logger log = LoggerFactory.getLogger(AiService.class);
    private final DashboardService dashboardService;

    /* ── Historique de contexte ── */
    private static final int MAX_CONTEXT_HISTORY = 5;
    private final Deque<String> recentIntents = new ArrayDeque<>();

    /* ── Détection de langue ── */
    // Mots-clés signatures par langue (hors domaine fiscal)
    private static final List<String> FRENCH_MARKERS = List.of(
            "bonjour", "salut", "comment", "est-ce", "c'est", "nous", "vous", "avez",
            "combien", "quel", "quelle", "pourquoi", "aussi", "mais", "dans",
            "résumé", "résumé", "synthèse", "récapitulatif", "bilan"
    );
    private static final List<String> ENGLISH_MARKERS = List.of(
            "hello", "how", "what", "why", "where", "when", "which",
            "the", "this", "that", "these", "those",
            "summary", "overview", "total", "please", "could", "would"
    );
    private static final List<String> MALAGASY_MARKERS = List.of(
            "manao", "ahoana", "firy", "inona", "iza", "hoe",
            "fa", "sy", "na", "azafady", "misaotra",
            "famintinana", "statistika", "trosa", "fandoavana"
    );

    /* ── Patterns d'extraction d'entités ── */
    private static final Pattern NIF_PATTERN = Pattern.compile("\\b(\\d{10,15})\\b");
    private static final Pattern AMOUNT_PATTERN = Pattern.compile("(\\d[\\d\\s.,]*)\\s*(mga|ar|mg|francs?)", Pattern.CASE_INSENSITIVE);
    private static final Pattern PERIOD_PATTERN = Pattern.compile("\\b(cette?\\s*(?:semaine|mois|ann[ée]e)|ce\\s*(?:trimestre|semestre)|mois\\s*(?:dernier|pass[ée])|ann[ée]e\\s*(?:derni[èe]re|pass[ée])|today|hier|this\\s*(?:week|month|year)|last\\s*(?:week|month|year))\\b", Pattern.CASE_INSENSITIVE);
    private static final Pattern COMPARISON_PATTERN = Pattern.compile("(compare|compar|vs|contre|versus|plutot que|diff[ée]rence|écart)", Pattern.CASE_INSENSITIVE);
    private static final Pattern RANKING_PATTERN = Pattern.compile("(top|meilleur|classement|ranking|premier|dernier|plus\\s*(?:gros|grand|petit)|moins)", Pattern.CASE_INSENSITIVE);
    private static final Pattern TREND_PATTERN = Pattern.compile("(tendance|trend|[ée]volution|progression|hausse|baisse|croissance|d[ée]clin|diminue|augmente|stable|stagn)", Pattern.CASE_INSENSITIVE);
    private static final Pattern ALERT_PATTERN = Pattern.compile("(alerte|alert|critique|urgent|probl[èe]me|attention|risque|danger|rouge|vérif|check)", Pattern.CASE_INSENSITIVE);
    private static final Pattern WHY_PATTERN = Pattern.compile("(pourquoi|pour qu|comment|explique|raison|cause|origine|d[ée]termin)", Pattern.CASE_INSENSITIVE);
    private static final Pattern HOW_MANY_PATTERN = Pattern.compile("(combien|nombre|quantit|total|count|how\\s*many|firy)", Pattern.CASE_INSENSITIVE);
    private static final Pattern RECOMMEND_PATTERN = Pattern.compile("(recommand|conseil|suggestion|propos|devrait|faut|que faire|action|plan|strat[ée]gie)", Pattern.CASE_INSENSITIVE);
    private static final Pattern COMPARE_PERIOD_PATTERN = Pattern.compile("(mois dernier|mois pass|pr[ée]c[ée]dent|vs mois|compar.*mois|last month|previous month)", Pattern.CASE_INSENSITIVE);

    public AiService(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    /**
     * Point d'entrée principal : analyse le message utilisateur, extrait les intentions
     * et entités, consulte le contexte conversationnel, et génère une réponse enrichie.
     */
    public String chat(String userMessage, List<ChatMessage> history) {
        try {
            DashboardSummary s = dashboardService.summary(6);
            String lower = userMessage.toLowerCase().trim();

            // 0. Détecter la langue de l'utilisateur
            String locale = detectLanguage(lower);
            AiMessages msgs = AiMessages.of(locale);

            // 1. Extraire les entités du message
            Entities entities = extractEntities(lower);

            // 2. Détecter les intentions par scoring (avec les mots-clés de la langue détectée)
            IntentResult intents = detectIntents(lower, msgs);

            // 3. Gérer les salutations (pas de contexte nécessaire)
            if (intents.isGreeting()) {
                String response = greetingResponse(entities);
                trackIntent("greeting");
                return response;
            }

            // 4. Détecter les follow-ups et questions contextuelles
            String followUpResponse = handleFollowUp(lower, entities, s);
            if (followUpResponse != null) {
                trackIntent(intents.primaryIntent());
                return followUpResponse;
            }

            // 5. Questions composées ("contribuables et paiements")
            if (intents.isCompound()) {
                String response = handleCompoundQuery(intents, entities, s);
                trackIntent(intents.primaryIntent());
                return response;
            }

            // 6. Questions de comparaison
            if (intents.isComparison() || entities.hasComparison()) {
                String response = handleComparison(intents, entities, s);
                trackIntent("comparison");
                return response;
            }

            // 7. Questions de tendance
            if (intents.isTrend() || entities.hasTrend()) {
                String response = handleTrend(intents, entities, s);
                trackIntent("trend");
                return response;
            }

            // 8. Questions d'alerte
            if (intents.isAlert() || entities.hasAlert()) {
                String response = handleAlert(intents, entities, s);
                trackIntent("alert");
                return response;
            }

            // 9. Questions de recommandation
            if (intents.isRecommend()) {
                String response = handleRecommendation(intents, entities, s);
                trackIntent("recommend");
                return response;
            }

            // 10. Questions "pourquoi"
            if (entities.hasWhy()) {
                String response = handleWhy(intents, entities, s);
                trackIntent("analysis");
                return response;
            }

            // 11. Questions "combien" (extraction directe)
            if (entities.hasHowMany()) {
                String response = handleHowMany(intents, entities, s);
                trackIntent(intents.primaryIntent());
                return response;
            }

            // 12. Aide
            if (intents.isHelp()) {
                trackIntent("help");
                return helpResponse(entities);
            }

            // 13. Réponses standard par intention principale
            String response = generateResponse(intents, entities, s);
            trackIntent(intents.primaryIntent());
            return response;

        } catch (Exception e) {
            log.error("Erreur M-TAX AI pour message: {}", userMessage, e);
            return "Désolé, une erreur est survenue : " + e.getMessage()
                    + "\n\nVeuillez réessayer ou posez une autre question.";
        }
    }

    /* ══════════════════════════════════════════════════════════════════
     *  EXTRACTION D'ENTITÉS
     * ══════════════════════════════════════════════════════════════════ */

    private record Entities(
            List<String> nifs,
            List<BigDecimal> amounts,
            String period,
            boolean hasComparison,
            boolean hasTrend,
            boolean hasAlert,
            boolean hasWhy,
            boolean hasHowMany,
            boolean hasRanking,
            boolean isNegative,
            List<String> taxTypes
    ) {}

    private Entities extractEntities(String lower) {
        List<String> nifs = new ArrayList<>();
        Matcher nifM = NIF_PATTERN.matcher(lower);
        while (nifM.find()) nifs.add(nifM.group(1));

        List<BigDecimal> amounts = new ArrayList<>();
        Matcher amtM = AMOUNT_PATTERN.matcher(lower);
        while (amtM.find()) {
            try {
                String raw = amtM.group(1).replaceAll("[\\s,]", "");
                amounts.add(new BigDecimal(raw));
            } catch (NumberFormatException ignored) {}
        }

        String period = null;
        Matcher perM = PERIOD_PATTERN.matcher(lower);
        if (perM.find()) period = perM.group(1);

        List<String> taxTypes = new ArrayList<>();
        String[] taxKeywords = {"patente", "irc", "irsa", "tps", "tv", "iuv", "fip", "tsv", "th", "tf"};
        for (String kw : taxKeywords) {
            if (lower.contains(kw)) taxTypes.add(kw.toUpperCase());
        }

        return new Entities(
                nifs, amounts, period,
                COMPARISON_PATTERN.matcher(lower).find(),
                TREND_PATTERN.matcher(lower).find(),
                ALERT_PATTERN.matcher(lower).find(),
                WHY_PATTERN.matcher(lower).find(),
                HOW_MANY_PATTERN.matcher(lower).find(),
                RANKING_PATTERN.matcher(lower).find(),
                lower.contains("pas") || lower.contains("non") || lower.contains("aucun") || lower.contains("jamais"),
                taxTypes
        );
    }

    /* ══════════════════════════════════════════════════════════════════
     *  DÉTECTION D'INTENTIONS PAR SCORING
     * ══════════════════════════════════════════════════════════════════ */

    private record IntentResult(
            String primaryIntent,
            Map<String, Double> scores,
            boolean isGreeting,
            boolean isHelp,
            boolean isCompound,
            boolean isComparison,
            boolean isTrend,
            boolean isAlert,
            boolean isRecommend,
            List<String> matchedIntents
    ) {}

    private IntentResult detectIntents(String lower, AiMessages msgs) {
        Map<String, Double> scores = new LinkedHashMap<>();

        // Scoring par intention (avec les mots-clés de la langue détectée)
        scores.put("greeting", scoreIntent(lower, msgs.greetingKeywords(), 1.0));
        scores.put("help", scoreIntent(lower, msgs.helpKeywords(), 1.0));
        scores.put("taxpayer", scoreIntent(lower, msgs.taxpayerKeywords(), 1.0));
        scores.put("declaration", scoreIntent(lower, msgs.declarationKeywords(), 1.0));
        scores.put("debt", scoreIntent(lower, msgs.debtKeywords(), 1.0));
        scores.put("payment", scoreIntent(lower, msgs.paymentKeywords(), 1.0));
        scores.put("collection", scoreIntent(lower, msgs.collectionKeywords(), 1.0));
        scores.put("assessment", scoreIntent(lower, msgs.assessmentKeywords(), 1.0));
        scores.put("overdue", scoreIntent(lower, msgs.overdueKeywords(), 1.0));
        scores.put("summary", scoreIntent(lower, msgs.summaryKeywords(), 1.0));
        scores.put("receipt", scoreIntent(lower, msgs.receiptKeywords(), 1.0));
        scores.put("recent", scoreIntent(lower, msgs.recentKeywords(), 1.0));
        scores.put("top", scoreIntent(lower, msgs.topKeywords(), 1.2)); // Boost ranking
        scores.put("trend", scoreIntent(lower, msgs.trendKeywords(), 1.1));
        scores.put("alert", scoreIntent(lower, msgs.alertKeywords(), 1.1));
        scores.put("next", scoreIntent(lower, msgs.nextKeywords(), 1.0));

        // Trouver l'intention principale
        String primary = "summary"; // défaut
        double maxScore = 0;
        List<String> matched = new ArrayList<>();
        for (Map.Entry<String, Double> e : scores.entrySet()) {
            if (e.getValue() > 0) {
                matched.add(e.getKey());
                if (e.getValue() > maxScore) {
                    maxScore = e.getValue();
                    primary = e.getKey();
                }
            }
        }

        // Si aucun score, essayer le fallback
        if (matched.isEmpty()) {
            matched.add("default");
        }

        boolean isCompound = countNonZero(scores) >= 2;

        return new IntentResult(
                primary, scores,
                scores.get("greeting") > 0,
                scores.get("help") > 0,
                isCompound,
                COMPARISON_PATTERN.matcher(lower).find() || scores.getOrDefault("trend", 0.0) > 0.5,
                scores.get("trend") > 0 || TREND_PATTERN.matcher(lower).find(),
                scores.get("alert") > 0 || ALERT_PATTERN.matcher(lower).find(),
                RECOMMEND_PATTERN.matcher(lower).find(),
                matched
        );
    }

    /**
     * Détecte la langue du message utilisateur en comptant les marqueurs linguistiques.
     * Par défaut : français.
     */
    private String detectLanguage(String lower) {
        int fr = 0, en = 0, mg = 0;
        for (String m : FRENCH_MARKERS)   { if (lower.contains(m)) fr++; }
        for (String m : ENGLISH_MARKERS)  { if (lower.contains(m)) en++; }
        for (String m : MALAGASY_MARKERS) { if (lower.contains(m)) mg++; }

        // Si aucun marqueur trouvé, essayer la détection par structure
        if (fr == 0 && en == 0 && mg == 0) {
            if (Pattern.compile("\b(how many|what is|could you|please|thank)\b").matcher(lower).find()) return "en";
            if (Pattern.compile("\b(firy|manao ahoana|azafady|misaotra)\b").matcher(lower).find()) return "mg";
            return "fr"; // défaut
        }

        if (en > fr && en > mg) return "en";
        if (mg > fr && mg > en) return "mg";
        return "fr";
    }

    private double scoreIntent(String lower, List<String> keywords, double baseWeight) {
        double score = 0;
        for (String kw : keywords) {
            if (lower.contains(kw)) {
                score += baseWeight;
                // Bonus pour les mots-clés plus longs (plus spécifiques)
                if (kw.length() > 5) score += 0.3;
            }
        }
        // Bonus si le mot-clé est en début de phrase
        for (String kw : keywords) {
            if (lower.startsWith(kw)) {
                score += 0.5;
                break;
            }
        }
        return Math.min(score, 3.0); // cap
    }

    private long countNonZero(Map<String, Double> scores) {
        return scores.values().stream().filter(v -> v > 0).count();
    }

    /* ══════════════════════════════════════════════════════════════════
     *  SUIVI DE CONTEXTE & FOLLOW-UPS
     * ══════════════════════════════════════════════════════════════════ */

    private void trackIntent(String intent) {
        recentIntents.addFirst(intent);
        while (recentIntents.size() > MAX_CONTEXT_HISTORY) recentIntents.pollLast();
    }

    /**
     * Détecte les questions de suivi qui référencent le contexte précédent
     * ("et les paiements ?", "et l'autre ?", "combien pour celui-ci ?").
     */
    private String handleFollowUp(String lower, Entities entities, DashboardSummary s) {
        if (recentIntents.isEmpty()) return null;

        String lastIntent = recentIntents.peekFirst();

        // Patterns de follow-up
        boolean isFollowUp = lower.startsWith("et ") || lower.startsWith("mais ")
                || lower.contains("aussi") || lower.contains("ensuite")
                || lower.contains("et vous") || lower.contains("et les")
                || lower.contains("par contre") || lower.contains("ensuite")
                || lower.matches("^\\s*(et|mais|aussi|ensuite|ok|d'accord|bon|super|merci).*");

        if (!isFollowUp) return null;

        // Répondre en fonction du contexte précédent avec des informations complémentaires
        return switch (lastIntent) {
            case "taxpayer" -> {
                yield "Voici les détails complémentaires sur les **contribuables** :\n"
                        + "- Total : **" + s.taxpayerCount() + "** contribuables\n"
                        + "- Nouveaux ce mois : **" + s.newTaxpayers() + "**\n"
                        + "- Déclarations liées : **" + s.periodDeclarationCount() + "**\n"
                        + "- Top payeurs : " + formatTopTaxpayers(s.topTaxpayersByCollected(), 3) + "\n\n"
                        + "💡 **Insight** : " + generateTaxpayerInsight(s);
            }
            case "declaration" -> {
                yield "Détails sur les **déclarations** :\n"
                        + "- Total : **" + s.declarationCount() + "**\n"
                        + "- À traiter : **" + s.declarationsToProcess() + "**\n"
                        + "- Nouvelles ce mois : **" + s.newDeclarations() + "**\n\n"
                        + "💡 **Insight** : " + generateDeclarationInsight(s);
            }
            case "debt" -> {
                yield "Plus de détails sur les **créances** :\n"
                        + "- Total : **" + s.debtCount() + "** créances\n"
                        + "- Montant total : **" + fmt(s.totalDebts()) + " MGA**\n"
                        + "- En retard : **" + s.overdueCount() + "** pour **" + fmt(s.overdueBalance()) + " MGA**\n"
                        + "- Répartition : " + formatDebtsByStatus(s.debtsByStatus()) + "\n\n"
                        + "💡 **Insight** : " + generateDebtInsight(s);
            }
            case "payment" -> {
                yield "Détails sur les **paiements** :\n"
                        + "- Total : **" + s.paymentCount() + "** paiements\n"
                        + "- Montant encaissé : **" + fmt(s.totalCollected()) + " MGA**\n"
                        + "- Ce mois-ci : **" + fmt(s.currentMonthPayments()) + " MGA**\n"
                        + "- Par type : " + formatPaymentsByType(s.paymentsByTaxType()) + "\n\n"
                        + "💡 **Insight** : " + generatePaymentInsight(s);
            }
            default -> null;
        };
    }

    /* ══════════════════════════════════════════════════════════════════
     *  QUESTIONS COMPOSÉES
     * ══════════════════════════════════════════════════════════════════ */

    private String handleCompoundQuery(IntentResult intents, Entities entities, DashboardSummary s) {
        StringBuilder sb = new StringBuilder("## 📊 Réponse combinée\n\n");
        Map<String, Double> scores = intents.scores();

        if (scores.getOrDefault("taxpayer", 0.0) > 0) {
            sb.append("### 👥 Contribuables\n")
              .append("- **").append(s.taxpayerCount()).append("** enregistrés")
              .append(s.newTaxpayers() > 0 ? " (" + s.newTaxpayers() + " nouveaux)" : "").append("\n\n");
        }
        if (scores.getOrDefault("declaration", 0.0) > 0) {
            sb.append("### 📋 Déclarations\n")
              .append("- **").append(s.declarationCount()).append("** au total")
              .append(s.declarationsToProcess() > 0 ? " (" + s.declarationsToProcess() + " à traiter)" : "").append("\n\n");
        }
        if (scores.getOrDefault("debt", 0.0) > 0 || scores.getOrDefault("overdue", 0.0) > 0) {
            sb.append("### 📉 Créances\n")
              .append("- **").append(s.debtCount()).append("** créances — **").append(fmt(s.totalDebts())).append(" MGA**\n")
              .append("- En retard : **").append(s.overdueCount()).append("** — **").append(fmt(s.overdueBalance())).append(" MGA**\n\n");
        }
        if (scores.getOrDefault("payment", 0.0) > 0) {
            sb.append("### 💰 Paiements\n")
              .append("- **").append(s.paymentCount()).append("** enregistrés — **").append(fmt(s.totalCollected())).append(" MGA**\n")
              .append("- Ce mois : **").append(fmt(s.currentMonthPayments())).append(" MGA**\n\n");
        }
        if (scores.getOrDefault("collection", 0.0) > 0) {
            sb.append("### 📈 Recouvrement\n")
              .append("- Taux : **").append(pct(s.collectionRate())).append(" %**\n\n");
        }

        // Ajouter un insight global
        sb.append("💡 **Analyse** : ").append(generateGlobalInsight(s));
        return sb.toString();
    }

    /* ══════════════════════════════════════════════════════════════════
     *  COMPARAISONS & TENDANCES
     * ══════════════════════════════════════════════════════════════════ */

    private String handleComparison(IntentResult intents, Entities entities, DashboardSummary s) {
        StringBuilder sb = new StringBuilder("## 📊 Comparaison\n\n");

        // Comparaison des paiements mois courant vs précédent
        if (s.paymentsByMonth() != null && s.paymentsByMonth().size() >= 2) {
            Map<String, Object> current = s.paymentsByMonth().get(s.paymentsByMonth().size() - 1);
            Map<String, Object> previous = s.paymentsByMonth().get(s.paymentsByMonth().size() - 2);
            BigDecimal curAmt = (BigDecimal) current.getOrDefault("amount", BigDecimal.ZERO);
            BigDecimal prevAmt = (BigDecimal) previous.getOrDefault("amount", BigDecimal.ZERO);

            sb.append("### 💰 Paiements\n")
              .append("- Mois courant (**").append(current.get("month")).append("**) : **").append(fmt(curAmt)).append(" MGA**\n")
              .append("- Mois précédent (**").append(previous.get("month")).append("**) : **").append(fmt(prevAmt)).append(" MGA**\n")
              .append("- Variation : **").append(formatVariation(curAmt, prevAmt)).append("**\n\n");
        }

        // Comparaison des créances
        sb.append("### 📉 Créances\n")
          .append("- Total dû : **").append(fmt(s.totalDebts())).append(" MGA**\n")
          .append("- Déjà encaissé : **").append(fmt(s.totalCollected())).append(" MGA**\n")
          .append("- Restant : **").append(fmt(s.totalOutstanding())).append(" MGA**\n")
          .append("- Taux de recouvrement : **").append(pct(s.collectionRate())).append(" %**\n\n");

        // Insight de comparaison
        sb.append("💡 **Analyse comparative** : ").append(generateComparisonInsight(s));
        return sb.toString();
    }

    private String handleTrend(IntentResult intents, Entities entities, DashboardSummary s) {
        StringBuilder sb = new StringBuilder("## 📈 Tendances\n\n");

        if (s.paymentsByMonth() != null && !s.paymentsByMonth().isEmpty()) {
            sb.append("### 💰 Évolution des paiements\n");
            List<Map<String, Object>> months = s.paymentsByMonth();
            int size = months.size();
            for (int i = Math.max(0, size - 6); i < size; i++) {
                Map<String, Object> m = months.get(i);
                BigDecimal amt = (BigDecimal) m.getOrDefault("amount", BigDecimal.ZERO);
                String bar = generateBar(amt, months);
                sb.append("- **").append(m.get("month")).append("** : ").append(fmt(amt)).append(" MGA ").append(bar).append("\n");
            }
            sb.append("\n");
        }

        // Évolution des créances
        if (s.debtsByStatus() != null && !s.debtsByStatus().isEmpty()) {
            sb.append("### 📉 Répartition des créances\n");
            for (Map<String, Object> row : s.debtsByStatus()) {
                String status = (String) row.getOrDefault("status", "?");
                Object count = row.getOrDefault("count", 0);
                BigDecimal total = (BigDecimal) row.getOrDefault("total", BigDecimal.ZERO);
                sb.append("- **").append(status).append("** : ").append(count).append(" créances — ").append(fmt(total)).append(" MGA\n");
            }
            sb.append("\n");
        }

        sb.append("💡 **Tendance** : ").append(generateTrendInsight(s));
        return sb.toString();
    }

    /* ══════════════════════════════════════════════════════════════════
     *  ALERTES & RECOMMANDATIONS
     * ══════════════════════════════════════════════════════════════════ */

    private String handleAlert(IntentResult intents, Entities entities, DashboardSummary s) {
        StringBuilder sb = new StringBuilder("## 🚨 Alertes et points critiques\n\n");
        int alertCount = 0;

        // Alerte créances en retard
        if (s.overdueCount() > 0) {
            alertCount++;
            String severity = s.overdueCount() > 20 ? "🔴 CRITIQUE" : s.overdueCount() > 10 ? "🟠 ÉLEVÉ" : "🟡 MODÉRÉ";
            sb.append(severity).append(" : **").append(s.overdueCount()).append("** créances en retard\n")
              .append("  - Montant : **").append(fmt(s.overdueBalance())).append(" MGA**\n");
            if (s.overdueByTaxType() != null && !s.overdueByTaxType().isEmpty()) {
                sb.append("  - Par type :\n");
                for (Map<String, Object> row : s.overdueByTaxType()) {
                    sb.append("    • **").append(row.get("taxType")).append("** : ").append(fmt((BigDecimal) row.get("amount"))).append(" MGA\n");
                }
            }
            sb.append("\n");
        }

        // Alerte déclarations en attente
        if (s.declarationsToProcess() > 0) {
            alertCount++;
            String severity = s.declarationsToProcess() > 50 ? "🔴" : s.declarationsToProcess() > 20 ? "🟠" : "🟡";
            sb.append(severity).append(" **").append(s.declarationsToProcess()).append("** déclarations en attente de traitement\n\n");
        }

        // Alerte taux de recouvrement
        if (s.collectionRate() < 50) {
            alertCount++;
            sb.append("🟠 Taux de recouvrement faible : **").append(pct(s.collectionRate())).append(" %**\n\n");
        }

        // Alerte solde impayé élevé
        double outstandingPct = s.totalDebts().signum() > 0
                ? s.totalOutstanding().divide(s.totalDebts(), 4, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100)).doubleValue()
                : 0;
        if (outstandingPct > 60) {
            alertCount++;
            sb.append("🟡 **").append(String.format("%.1f", outstandingPct)).append("%** du montant total reste à percevoir\n\n");
        }

        if (alertCount == 0) {
            sb.append("🟢 **Aucune alerte critique** — Tout est sous contrôle ! 🎉\n\n");
        } else {
            sb.append("### 💡 Actions recommandées\n");
            if (s.overdueCount() > 0) sb.append("1. Priorisez les relances pour les **").append(Math.min(s.overdueCount(), 5)).append("** créances les plus anciennes\n");
            if (s.declarationsToProcess() > 0) sb.append("2. Accélérez le traitement des déclarations en attente\n");
            if (s.collectionRate() < 70) sb.append("3. Renforcez les stratégies de recouvrement\n");
            sb.append("4. Consultez le module Recouvrement pour planifier les actions\n");
        }

        return sb.toString();
    }

    private String handleRecommendation(IntentResult intents, Entities entities, DashboardSummary s) {
        StringBuilder sb = new StringBuilder("## 💡 Recommandations stratégiques\n\n");

        // Analyser l'état du système et générer des recommandations contextuelles
        List<String> recommendations = new ArrayList<>();

        if (s.overdueCount() > 0) {
            recommendations.add("🔴 **Urgence** : Lancez immédiatement des relances pour les " + s.overdueCount()
                    + " créances en retard (" + fmt(s.overdueBalance()) + " MGA). Priorisez par montant décroissant.");
        }
        if (s.declarationsToProcess() > 10) {
            recommendations.add("📋 **Traitement** : " + s.declarationsToProcess() + " déclarations attendent un traitement. "
                    + "Planifiez une session de validation pour réduire l'arriéré.");
        }
        if (s.collectionRate() < 70) {
            recommendations.add("📈 **Recouvrement** : Le taux de " + pct(s.collectionRate()) + "% est sous l'objectif de 70%. "
                    + "Envisagez des plans de paiement pour les gros montants.");
        }
        if (s.newTaxpayers() == 0) {
            recommendations.add("👥 **Acquisition** : Aucun nouveau contribuable ce mois. "
                    + "Vérifiez les demandes d'inscription en attente.");
        }
        if (s.currentMonthPayments() != null && s.currentMonthPayments().compareTo(BigDecimal.ZERO) == 0) {
            recommendations.add("💰 **Encaissement** : Aucun paiement ce mois. "
                    + "Vérifiez que les échéances sont bien notifiées.");
        }

        // Recommandation générale toujours
        recommendations.add("📊 **Suivi** : Consultez régulièrement le tableau de bord pour détecter les anomalies.");

        for (int i = 0; i < recommendations.size(); i++) {
            sb.append(i + 1).append(". ").append(recommendations.get(i)).append("\n\n");
        }

        return sb.toString();
    }

    /* ══════════════════════════════════════════════════════════════════
     *  QUESTIONS "POURQUOI" & "COMBIEN"
     * ══════════════════════════════════════════════════════════════════ */

    private String handleWhy(IntentResult intents, Entities entities, DashboardSummary s) {
        String intent = intents.primaryIntent();
        return switch (intent) {
            case "overdue", "debt" -> "### 📉 Pourquoi y a-t-il des créances en retard ?\n\n"
                    + "Les retards de paiement peuvent être causés par :\n"
                    + "1. **Manque de relances** — Les contribuables ne sont pas suffisamment sollicités\n"
                    + "2. **Difficultés financières** — Certains contribuables rencontrent des problèmes de trésorerie\n"
                    + "3. **Complexité fiscale** — Les procédures de paiement peuvent décourager\n"
                    + "4. **Défaut de suivi** — Pas de plan de paiement en place\n\n"
                    + "💡 **Solution** : Activez le module Recouvrement et configurez des relances automatiques.\n"
                    + "Vous avez actuellement **" + s.overdueCount() + "** créances en retard pour **" + fmt(s.overdueBalance()) + " MGA**.";
            case "collection" -> "### 📈 Pourquoi le taux de recouvrement est-il de " + pct(s.collectionRate()) + " % ?\n\n"
                    + "Le taux dépend du ratio entre le montant encaissé (**" + fmt(s.totalCollected()) + " MGA**) "
                    + "et le montant total dû (**" + fmt(s.totalDebts()) + " MGA**).\n\n"
                    + (s.collectionRate() < 70
                    ? "⚠️ Ce taux est sous la moyenne. Actions suggérées :\n"
                    + "- Renforcer les relances\n"
                    + "- Proposer des facilités de paiement\n"
                    + "- Cibler les gros montants en retard"
                    : "✅ Ce taux est dans la norme. Continuez les efforts de recouvrement !");
            default -> "### 💡 Analyse de la situation\n\n"
                    + "Voici un résumé de l'état actuel :\n"
                    + "- Contribuables : **" + s.taxpayerCount() + "**\n"
                    + "- Créances en retard : **" + s.overdueCount() + "**\n"
                    + "- Taux de recouvrement : **" + pct(s.collectionRate()) + " %**\n\n"
                    + "N'hésitez pas à préciser votre question pour une analyse plus détaillée.";
        };
    }

    private String handleHowMany(IntentResult intents, Entities entities, DashboardSummary s) {
        String intent = intents.primaryIntent();
        return switch (intent) {
            case "taxpayer" -> "👥 **" + s.taxpayerCount() + "** contribuables sont enregistrés"
                    + (s.newTaxpayers() > 0 ? " (" + s.newTaxpayers() + " nouveaux récemment)" : "") + ".";
            case "declaration" -> "📋 **" + s.declarationCount() + "** déclarations au total"
                    + (s.declarationsToProcess() > 0 ? " dont **" + s.declarationsToProcess() + "** à traiter" : "") + ".";
            case "debt", "overdue" -> "📉 **" + s.debtCount() + "** créances au total"
                    + (s.overdueCount() > 0 ? ", dont **" + s.overdueCount() + "** en retard" : "") + ".";
            case "payment" -> "💰 **" + s.paymentCount() + "** paiements enregistrés pour **" + fmt(s.totalCollected()) + " MGA**.";
            case "receipt" -> "🧾 **" + s.receiptCount() + "** reçus émis"
                    + (s.todayReceiptCount() > 0 ? " (" + s.todayReceiptCount() + " aujourd'hui)" : "") + ".";
            case "assessment" -> "📑 **" + s.assessmentCount() + "** impositions enregistrées.";
            default -> "### 📊 Voici les chiffres clés :\n"
                    + "- 👥 Contribuables : **" + s.taxpayerCount() + "**\n"
                    + "- 📋 Déclarations : **" + s.declarationCount() + "**\n"
                    + "- 📉 Créances : **" + s.debtCount() + "**\n"
                    + "- 💰 Paiements : **" + s.paymentCount() + "**\n"
                    + "- 📈 Taux de recouvrement : **" + pct(s.collectionRate()) + " %**";
        };
    }

    /* ══════════════════════════════════════════════════════════════════
     *  GÉNÉRATION DE RÉPONSES STANDARD
     * ══════════════════════════════════════════════════════════════════ */

    private String generateResponse(IntentResult intents, Entities entities, DashboardSummary s) {
        String intent = intents.primaryIntent();
        return switch (intent) {
            case "taxpayer" -> taxpayerResponse(s, entities);
            case "declaration" -> declarationResponse(s, entities);
            case "debt" -> debtResponse(s, entities);
            case "payment" -> paymentResponse(s, entities);
            case "collection" -> collectionResponse(s, entities);
            case "assessment" -> assessmentResponse(s, entities);
            case "overdue" -> overdueResponse(s, entities);
            case "receipt" -> receiptResponse(s, entities);
            case "recent" -> recentActivityResponse(s, entities);
            case "top" -> topResponse(s, entities);
            case "next" -> nextActionsResponse(s, entities);
            default -> defaultResponse(s, entities);
        };
    }

    /* ══════════════════════════════════════════════════════════════════
     *  RÉPONSES ENRICHIES PAR INTENTION
     * ══════════════════════════════════════════════════════════════════ */

    private String greetingResponse(Entities entities) {
        return "Bonjour ! 👋 Je suis **M-TAX AI**, votre assistant fiscal intelligent.\n\n"
                + "Je peux vous fournir des analyses en temps réel sur :\n"
                + "• 📊 Statistiques globales et tendances\n"
                + "• 👥 Contribuables et NIF\n"
                + "• 📋 Déclarations fiscales\n"
                + "• 💰 Paiements et encaissements\n"
                + "• 📉 Créances et recouvrement\n"
                + "• 🚨 Alertes et recommandations\n\n"
                + "💡 Essayez des questions comme :\n"
                + "- « Combien de contribuables ? »\n"
                + "- « Quel est le taux de recouvrement ? »\n"
                + "- « Comparez les paiements du mois »\n"
                + "- « Y a-t-il des alertes ? »\n"
                + "- « Recommandez-moi des actions »";
    }

    private String helpResponse(Entities entities) {
        return "## 🧭 Guide d'utilisation — M-TAX AI\n\n"
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
                + "### ⚠️ Alertes & Recommandations\n"
                + "• « Y a-t-il des alertes ? » — Points critiques\n"
                + "• « Recommandez des actions » — Stratégies\n"
                + "• « Prochaines actions » — À faire\n\n"
                + "### 🔍 Questions avancées\n"
                + "• « Comparez contribuables et paiements »\n"
                + "• « Pourquoi le taux est-il bas ? »\n"
                + "• « Quelle est la tendance ? »\n\n"
                + "Posez-moi une question avec vos propres mots, je comprends ! 😊";
    }

    private String taxpayerResponse(DashboardSummary s, Entities entities) {
        StringBuilder sb = new StringBuilder("## 👥 Contribuables\n\n");
        sb.append("**").append(s.taxpayerCount()).append("** contribuables enregistrés au total.\n\n");

        if (s.newTaxpayers() > 0) {
            sb.append("📈 **").append(s.newTaxpayers()).append("** nouveaux ajouts récemment.\n");
        } else {
            sb.append("💡 **Conseil** : Aucun nouveau contribuable récemment. Vérifiez les inscriptions en attente.\n");
        }

        if (!s.topTaxpayersByCollected().isEmpty()) {
            sb.append("\n### 🏆 Top contribuables par encaissement :\n");
            int rank = 1;
            for (Map<String, Object> t : s.topTaxpayersByCollected()) {
                if (rank > 5) break;
                sb.append(rank).append(". **").append(t.get("taxpayerName")).append("**");
                if (t.get("nif") != null) sb.append(" (NIF: ").append(t.get("nif")).append(")");
                sb.append(" — ").append(fmt((BigDecimal) t.get("collected"))).append(" MGA\n");
                rank++;
            }
        }

        // Insight
        sb.append("\n💡 **Insight** : ").append(generateTaxpayerInsight(s));
        return sb.toString();
    }

    private String declarationResponse(DashboardSummary s, Entities entities) {
        StringBuilder sb = new StringBuilder("## 📋 Déclarations fiscales\n\n");
        sb.append("**").append(s.declarationCount()).append("** déclarations au total.\n\n");

        if (s.declarationsToProcess() > 0) {
            sb.append("⏳ **").append(s.declarationsToProcess()).append("** en attente de traitement.\n");
            double processingRate = s.declarationCount() > 0
                    ? (1.0 - (double) s.declarationsToProcess() / s.declarationCount()) * 100 : 100;
            sb.append("✅ Taux de traitement : **").append(String.format("%.1f", processingRate)).append("%**\n");

            if (s.declarationsToProcess() > 10) {
                sb.append("\n🚨 **Attention** : Un effort de traitement est recommandé.\n");
            }
        } else {
            sb.append("🎉 Toutes les déclarations ont été traitées !\n");
        }

        if (s.newDeclarations() > 0) {
            sb.append("\n📥 **").append(s.newDeclarations()).append("** nouvelles ce mois-ci.\n");
        }

        sb.append("\n💡 **Insight** : ").append(generateDeclarationInsight(s));
        return sb.toString();
    }

    private String debtResponse(DashboardSummary s, Entities entities) {
        StringBuilder sb = new StringBuilder("## 📉 Créances\n\n");
        sb.append("• Total : **").append(s.debtCount()).append(" créances**\n");
        sb.append("• Montant total dû : **").append(fmt(s.totalDebts())).append(" MGA**\n");
        sb.append("• Déjà encaissé : **").append(fmt(s.totalCollected())).append(" MGA**\n");
        sb.append("• Restant à percevoir : **").append(fmt(s.totalOutstanding())).append(" MGA**\n");

        if (s.overdueCount() > 0) {
            sb.append("\n⚠️ **En retard** : **").append(s.overdueCount()).append("** créances — **").append(fmt(s.overdueBalance())).append(" MGA**\n");
        }

        if (s.debtsByStatus() != null && !s.debtsByStatus().isEmpty()) {
            sb.append("\n### 📊 Répartition par statut :\n");
            for (Map<String, Object> row : s.debtsByStatus()) {
                String status = (String) row.getOrDefault("status", "?");
                Object count = row.getOrDefault("count", 0);
                BigDecimal total = (BigDecimal) row.getOrDefault("total", BigDecimal.ZERO);
                sb.append("  • **").append(status).append("** : ").append(count).append(" créances — ").append(fmt(total)).append(" MGA\n");
            }
        }

        if (s.overdueByTaxType() != null && !s.overdueByTaxType().isEmpty()) {
            sb.append("\n### 🔴 Retards par type d'impôt :\n");
            for (Map<String, Object> row : s.overdueByTaxType()) {
                sb.append("  • **").append(row.get("taxType")).append("** : ").append(fmt((BigDecimal) row.get("amount"))).append(" MGA\n");
            }
        }

        sb.append("\n💡 **Insight** : ").append(generateDebtInsight(s));
        return sb.toString();
    }

    private String paymentResponse(DashboardSummary s, Entities entities) {
        StringBuilder sb = new StringBuilder("## 💰 Paiements\n\n");
        sb.append("• Total enregistrés : **").append(s.paymentCount()).append(" paiements**\n");
        sb.append("• Montant encaissé : **").append(fmt(s.totalCollected())).append(" MGA**\n");

        if (s.currentMonthPayments() != null && s.currentMonthPayments().compareTo(BigDecimal.ZERO) > 0) {
            sb.append("• Ce mois-ci : **").append(fmt(s.currentMonthPayments())).append(" MGA**\n");
        }

        if (s.paymentsByTaxType() != null && !s.paymentsByTaxType().isEmpty()) {
            sb.append("\n### 📊 Par type d'impôt :\n");
            for (Map<String, Object> row : s.paymentsByTaxType()) {
                sb.append("  • **").append(row.get("taxType")).append("** : ").append(fmt((BigDecimal) row.get("amount"))).append(" MGA\n");
            }
        }

        if (s.paymentCount() == 0) {
            sb.append("\n💡 **Conseil** : Aucun paiement enregistré. Vérifiez que les encaissements sont bien saisis.\n");
        }

        sb.append("\n💡 **Insight** : ").append(generatePaymentInsight(s));
        return sb.toString();
    }

    private String collectionResponse(DashboardSummary s, Entities entities) {
        StringBuilder sb = new StringBuilder("## 📈 Taux de recouvrement\n\n");
        sb.append("**").append(pct(s.collectionRate())).append(" %**\n\n");
        sb.append("• Montant total dû : **").append(fmt(s.totalDebts())).append(" MGA**\n");
        sb.append("• Déjà encaissé : **").append(fmt(s.totalCollected())).append(" MGA**\n");
        sb.append("• Restant : **").append(fmt(s.totalOutstanding())).append(" MGA**\n");

        // Évaluation de la performance
        sb.append("\n");
        if (s.collectionRate() >= 80) {
            sb.append("✅ **Excellente performance** de recouvrement !\n");
        } else if (s.collectionRate() >= 60) {
            sb.append("💡 **Performance correcte**, mais des améliorations sont possibles.\n");
        } else if (s.collectionRate() >= 40) {
            sb.append("⚠️ **Performance en dessous de la moyenne** — renforcez les actions de relance.\n");
        } else {
            sb.append("🚨 **Performance critique** — des mesures urgentes sont nécessaires.\n");
        }

        // Détail par type si disponible
        if (s.collectionByTaxType() != null && !s.collectionByTaxType().isEmpty()) {
            sb.append("\n### 📊 Par type d'impôt :\n");
            for (Map<String, Object> row : s.collectionByTaxType()) {
                BigDecimal amt = (BigDecimal) row.getOrDefault("amount", BigDecimal.ZERO);
                double typeRate = s.totalDebts().signum() > 0
                        ? amt.divide(s.totalDebts(), 4, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100)).doubleValue() : 0;
                sb.append("  • **").append(row.get("taxType")).append("** : ").append(fmt(amt)).append(" MGA (").append(String.format("%.1f", typeRate)).append("%)\n");
            }
        }

        return sb.toString();
    }

    private String assessmentResponse(DashboardSummary s, Entities entities) {
        return "## 📑 Impositions\n\n"
                + "**" + s.assessmentCount() + "** impositions enregistrées dans le système.\n\n"
                + "💡 **Conseil** : Rendez-vous dans la section Impositions pour créer de nouvelles impositions "
                + "ou gérer les barèmes existants.\n\n"
                + "Consultez la page Impositions pour gérer les barèmes et grilles d'imposition.";
    }

    private String overdueResponse(DashboardSummary s, Entities entities) {
        if (s.overdueCount() == 0) {
            return "🟢 **Aucune créance en retard** — Excellent travail de recouvrement ! 🎉";
        }

        StringBuilder sb = new StringBuilder("## ⏰ Retards de paiement\n\n");
        sb.append("🔴 **").append(s.overdueCount()).append("** créances en retard\n");
        sb.append("💰 Montant : **").append(fmt(s.overdueBalance())).append(" MGA**\n");

        double share = s.debtCount() > 0 ? (double) s.overdueCount() / s.debtCount() * 100 : 0;
        sb.append("📊 Part des retards : **").append(String.format("%.1f", share)).append("%** des créances\n");

        if (s.overdueByTaxType() != null && !s.overdueByTaxType().isEmpty()) {
            sb.append("\n### 📋 Par type d'impôt :\n");
            for (Map<String, Object> row : s.overdueByTaxType()) {
                sb.append("  • **").append(row.get("taxType")).append("** : ").append(fmt((BigDecimal) row.get("amount"))).append(" MGA\n");
            }
        }

        sb.append("\n### 💡 Recommandations :\n");
        sb.append("• Lancez des relances pour les créances les plus anciennes\n");
        sb.append("• Priorisez les montants les plus élevés\n");
        sb.append("• Envisagez des plans de paiement pour les gros montants\n");

        return sb.toString();
    }

    private String receiptResponse(DashboardSummary s, Entities entities) {
        StringBuilder sb = new StringBuilder("## 🧾 Reçus émis\n\n");
        sb.append("• Total : **").append(s.receiptCount()).append(" reçus**\n");
        if (s.receiptTotalAmount() != null) {
            sb.append("• Montant total : **").append(fmt(s.receiptTotalAmount())).append(" MGA**\n");
        }
        if (s.todayReceiptCount() > 0) {
            sb.append("• Aujourd'hui : **").append(s.todayReceiptCount()).append("**\n");
        }
        return sb.toString();
    }

    private String recentActivityResponse(DashboardSummary s, Entities entities) {
        StringBuilder sb = new StringBuilder("## 🕐 Activité récente\n\n");
        if (s.recentActivity() != null && !s.recentActivity().isEmpty()) {
            for (Map<String, Object> a : s.recentActivity()) {
                String label = (String) a.getOrDefault("label", "");
                String date = (String) a.getOrDefault("date", "");
                String taxpayerName = (String) a.getOrDefault("taxpayerName", "");
                sb.append("• **").append(label).append("**");
                if (!taxpayerName.isEmpty()) sb.append(" — ").append(taxpayerName);
                sb.append(" (").append(date != null ? date.substring(0, Math.min(10, date.length())) : "").append(")\n");
            }
        } else {
            sb.append("Aucune activité récente enregistrée.\n\n");
            sb.append("💡 **Conseil** : Les activités apparaîtront ici après vos prochaines actions.\n");
        }
        return sb.toString();
    }

    private String topResponse(DashboardSummary s, Entities entities) {
        StringBuilder sb = new StringBuilder("## 🏆 Top contribuables par encaissement\n\n");
        if (s.topTaxpayersByCollected() == null || s.topTaxpayersByCollected().isEmpty()) {
            sb.append("Aucune donnée disponible pour le moment.\n\n");
            sb.append("💡 Les classements apparaîtront après les premiers encaissements.\n");
        } else {
            int rank = 1;
            for (Map<String, Object> t : s.topTaxpayersByCollected()) {
                sb.append(rank).append(". **").append(t.get("taxpayerName")).append("**");
                if (t.get("nif") != null) sb.append(" (NIF: ").append(t.get("nif")).append(")");
                sb.append(" — ").append(fmt((BigDecimal) t.get("collected"))).append(" MGA encaissés\n");
                if (t.get("due") != null) {
                    BigDecimal due = (BigDecimal) t.get("due");
                    if (due.compareTo(BigDecimal.ZERO) > 0) {
                        sb.append("   Restant dû : ").append(fmt(due)).append(" MGA\n");
                    }
                }
                rank++;
            }
        }
        return sb.toString();
    }

    private String nextActionsResponse(DashboardSummary s, Entities entities) {
        StringBuilder sb = new StringBuilder("## 📌 Prochaines actions\n\n");

        if (s.overdueCount() > 0) {
            sb.append("### ⚠️ Actions prioritaires :\n");
            sb.append("• Relancer les **").append(s.overdueCount()).append("** créances en retard\n");
            sb.append("• Montant à récupérer : **").append(fmt(s.overdueBalance())).append(" MGA**\n");
        }

        if (s.declarationsToProcess() > 0) {
            sb.append("\n### 📋 À traiter :\n");
            sb.append("• **").append(s.declarationsToProcess()).append("** déclarations en attente de traitement\n");
        }

        if (s.nextCollectionActions() != null && !s.nextCollectionActions().isEmpty()) {
            sb.append("\n### 📅 Actions planifiées :\n");
            for (Map<String, Object> a : s.nextCollectionActions()) {
                sb.append("• **").append(a.get("type")).append("** pour ")
                  .append(a.get("taxpayerName")).append(" — ");
                if (a.get("nextActionDate") != null) {
                    sb.append("le ").append(a.get("nextActionDate"));
                }
                sb.append("\n");
            }
        }

        if (s.overdueCount() == 0 && s.declarationsToProcess() == 0) {
            sb.append("Aucune action urgente pour le moment. 🎉\n");
            sb.append("Continuez à suivre vos indicateurs régulièrement !");
        }

        return sb.toString();
    }

    private String defaultResponse(DashboardSummary s, Entities entities) {
        return "Je suis M-TAX AI, spécialisé dans la gestion fiscale malgache. "
                + "Je peux vous renseigner sur :\n"
                + "- Les **contribuables** (" + s.taxpayerCount() + " enregistrés)\n"
                + "- Les **déclarations** (" + s.declarationCount() + " au total)\n"
                + "- Les **créances** (" + s.debtCount() + ", dont " + s.overdueCount() + " en retard)\n"
                + "- Les **paiements** (" + s.paymentCount() + " enregistrés)\n"
                + "- Le **taux de recouvrement** (" + pct(s.collectionRate()) + " %)\n"
                + "- Les **reçus** (" + s.receiptCount() + " émis)\n\n"
                + "💡 Essayez des questions comme :\n"
                + "- « Combien de contribuables ? »\n"
                + "- « Quel est le taux de recouvrement ? »\n"
                + "- « Résumé des créances »\n"
                + "- « Y a-t-il des alertes ? »\n"
                + "- « Recommandez des actions »";
    }

    /* ══════════════════════════════════════════════════════════════════
     *  INSIGHTS & ANALYSES PROACTIVES
     * ══════════════════════════════════════════════════════════════════ */

    private String generateTaxpayerInsight(DashboardSummary s) {
        if (s.taxpayerCount() == 0) {
            return "Aucun contribuable enregistré. Commencez par enregistrer vos contribuables.";
        }
        if (s.newTaxpayers() == 0) {
            return "Aucun nouveau contribuable ce mois. Vérifiez les demandes d'inscription en attente.";
        }
        double newRate = (double) s.newTaxpayers() / s.taxpayerCount() * 100;
        if (newRate > 10) return "Forte croissance des inscriptions (+ " + s.newTaxpayers() + " ce mois) !";
        return "Croissance stable des inscriptions. Le parc contribuables est en bon état.";
    }

    private String generateDeclarationInsight(DashboardSummary s) {
        if (s.declarationsToProcess() == 0) return "Toutes les déclarations sont à jour. Bravo !";
        double ratio = s.declarationCount() > 0 ? (double) s.declarationsToProcess() / s.declarationCount() * 100 : 0;
        if (ratio > 30) return "Attention : plus d'un tiers des déclarations sont en attente. Un effort de traitement est nécessaire.";
        if (ratio > 10) return "L'arriéré de déclarations est gérable. Priorisez les plus anciennes.";
        return "Quelques déclarations en attente, situation normale.";
    }

    private String generateDebtInsight(DashboardSummary s) {
        if (s.overdueCount() == 0) return "Aucune créance en retard, excellent !";
        double overduePct = s.debtCount() > 0 ? (double) s.overdueCount() / s.debtCount() * 100 : 0;
        if (overduePct > 30) return "Alerte : plus de 30% des créances sont en retard. Des actions de recouvrement urgentes sont nécessaires.";
        if (overduePct > 10) return "Les retards sont contenus. Renforcez les relances pour les créances les plus anciennes.";
        return "Quelques retards mineurs, situation sous contrôle.";
    }

    private String generatePaymentInsight(DashboardSummary s) {
        if (s.paymentCount() == 0) return "Aucun paiement enregistré. Vérifiez que les encaissements sont bien saisis.";
        if (s.currentMonthPayments() != null && s.currentMonthPayments().compareTo(BigDecimal.ZERO) > 0) {
            return "L'activité de paiement est en cours ce mois. Montant : " + fmt(s.currentMonthPayments()) + " MGA.";
        }
        return "Derniers paiements enregistrés. Consultez le détail dans le module Paiements.";
    }

    private String generateGlobalInsight(DashboardSummary s) {
        List<String> insights = new ArrayList<>();

        if (s.collectionRate() >= 80) {
            insights.add("Le taux de recouvrement est excellent (" + pct(s.collectionRate()) + "%)");
        } else if (s.collectionRate() < 50) {
            insights.add("⚠️ Le taux de recouvrement est faible (" + pct(s.collectionRate()) + "%) — des mesures correctives sont nécessaires");
        }

        if (s.overdueCount() > 10) {
            insights.add(s.overdueCount() + " créances en retard nécessitent une attention immédiate");
        }

        if (s.declarationsToProcess() > 20) {
            insights.add(s.declarationsToProcess() + " déclarations en attente — l'arriéré augmente");
        }

        if (insights.isEmpty()) {
            return "La situation globale est sous contrôle. Continuez vos efforts !";
        }
        return String.join(". ", insights) + ".";
    }

    private String generateComparisonInsight(DashboardSummary s) {
        if (s.paymentsByMonth() == null || s.paymentsByMonth().size() < 2) {
            return "Pas assez de données pour une comparaison historique.";
        }
        Map<String, Object> current = s.paymentsByMonth().get(s.paymentsByMonth().size() - 1);
        Map<String, Object> previous = s.paymentsByMonth().get(s.paymentsByMonth().size() - 2);
        BigDecimal cur = (BigDecimal) current.getOrDefault("amount", BigDecimal.ZERO);
        BigDecimal prev = (BigDecimal) previous.getOrDefault("amount", BigDecimal.ZERO);

        if (prev.signum() == 0) return "Pas de données du mois précédent pour comparer.";
        double change = cur.subtract(prev).divide(prev, 4, RoundingMode.HALF_UP).doubleValue() * 100;

        if (change > 20) return "Forte hausse des paiements (+ " + String.format("%.1f", change) + "%). Excellente dynamique !";
        if (change > 0) return "Légère hausse des paiements (+ " + String.format("%.1f", change) + "%). Tendance positive.";
        if (change > -20) return "Légère baisse des paiements (" + String.format("%.1f", change) + "%). Surveillez l'évolution.";
        return "Baisse significative des paiements (" + String.format("%.1f", change) + "%). Des actions correctives sont recommandées.";
    }

    private String generateTrendInsight(DashboardSummary s) {
        if (s.paymentsByMonth() == null || s.paymentsByMonth().isEmpty()) {
            return "Pas encore de données suffisantes pour analyser les tendances.";
        }
        List<Map<String, Object>> months = s.paymentsByMonth();
        if (months.size() < 3) return "Données insuffisantes pour une analyse de tendance fiable.";

        // Calculer la tendance sur les 3 derniers mois
        BigDecimal last3 = BigDecimal.ZERO;
        int count = Math.min(3, months.size());
        for (int i = months.size() - count; i < months.size(); i++) {
            last3 = last3.add((BigDecimal) months.get(i).getOrDefault("amount", BigDecimal.ZERO));
        }
        BigDecimal prev3 = BigDecimal.ZERO;
        int prevCount = Math.min(3, months.size() - count);
        for (int i = Math.max(0, months.size() - count - prevCount); i < months.size() - count; i++) {
            prev3 = prev3.add((BigDecimal) months.get(i).getOrDefault("amount", BigDecimal.ZERO));
        }

        if (prev3.signum() == 0) return "Tendance en hausse sur la période récente.";

        double trendPct = last3.subtract(prev3).divide(prev3, 4, RoundingMode.HALF_UP).doubleValue() * 100;
        if (trendPct > 10) return "📈 Tendance à la hausse sur les 3 derniers mois (+ " + String.format("%.1f", trendPct) + "%).";
        if (trendPct < -10) return "📉 Tendance à la baisse (- " + String.format("%.1f", Math.abs(trendPct)) + "%). Analysez les causes.";
        return "➡️ Tendance stable sur les 3 derniers mois.";
    }

    /* ══════════════════════════════════════════════════════════════════
     *  UTILITAIRES
     * ══════════════════════════════════════════════════════════════════ */

    private String fmt(BigDecimal v) {
        if (v == null) return "0";
        return v.setScale(0, RoundingMode.HALF_UP).toPlainString();
    }

    private String pct(double v) {
        return String.format("%.1f", v);
    }

    private String formatVariation(BigDecimal current, BigDecimal previous) {
        if (previous == null || previous.signum() == 0) return "N/A";
        double change = current.subtract(previous).divide(previous, 4, RoundingMode.HALF_UP).doubleValue() * 100;
        if (change > 0) return "↑ +" + String.format("%.1f", change) + "%";
        if (change < 0) return "↓ " + String.format("%.1f", change) + "%";
        return "→ stable";
    }

    private String formatTopTaxpayers(List<Map<String, Object>> taxpayers, int limit) {
        if (taxpayers == null || taxpayers.isEmpty()) return "aucun";
        StringBuilder sb = new StringBuilder();
        int count = 0;
        for (Map<String, Object> t : taxpayers) {
            if (count >= limit) break;
            if (count > 0) sb.append(", ");
            sb.append(t.get("taxpayerName")).append(" (").append(fmt((BigDecimal) t.get("collected"))).append(" MGA)");
            count++;
        }
        return sb.toString();
    }

    private String formatDebtsByStatus(List<Map<String, Object>> debts) {
        if (debts == null || debts.isEmpty()) return "aucune donnée";
        StringBuilder sb = new StringBuilder();
        for (Map<String, Object> row : debts) {
            if (sb.length() > 0) sb.append(", ");
            sb.append(row.get("status")).append(": ").append(row.get("count"));
        }
        return sb.toString();
    }

    private String formatPaymentsByType(List<Map<String, Object>> payments) {
        if (payments == null || payments.isEmpty()) return "aucune donnée";
        StringBuilder sb = new StringBuilder();
        for (Map<String, Object> row : payments) {
            if (sb.length() > 0) sb.append(", ");
            sb.append(row.get("taxType")).append(": ").append(fmt((BigDecimal) row.get("amount"))).append(" MGA");
        }
        return sb.toString();
    }

    private String generateBar(BigDecimal amount, List<Map<String, Object>> allMonths) {
        if (allMonths == null || allMonths.isEmpty()) return "";
        BigDecimal max = allMonths.stream()
                .map(m -> (BigDecimal) m.getOrDefault("amount", BigDecimal.ZERO))
                .max(BigDecimal::compareTo)
                .orElse(BigDecimal.ONE);
        if (max.signum() == 0) return "";
        int bars = amount.multiply(BigDecimal.valueOf(10)).divide(max, 0, RoundingMode.HALF_UP).intValue();
        bars = Math.max(1, Math.min(10, bars));
        return "█".repeat(bars);
    }
}
