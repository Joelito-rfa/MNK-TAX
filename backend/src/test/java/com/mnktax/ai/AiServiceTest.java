package com.mnktax.ai;

import com.mnktax.ai.dto.AiDtos.ChatMessage;
import com.mnktax.ai.service.AiDataService;
import com.mnktax.ai.service.AiService;
import com.mnktax.reporting.dto.ReportDtos.DashboardSummary;
import com.mnktax.reporting.service.DashboardService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Vérifie que M-TAX AI comprend les formulations variées : accents absents,
 * fautes de frappe, salutation suivie d'une question, etc.
 */
class AiServiceTest {

    private DashboardService dashboard;
    private AiDataService aiDataService;
    private AiService ai;

    @BeforeEach
    void setUp() {
        dashboard = mock(DashboardService.class);
        when(dashboard.summary(anyInt())).thenReturn(sampleSummary());
        aiDataService = mock(AiDataService.class);
        ai = new AiService(dashboard, aiDataService);
    }

    @Test
    @DisplayName("« combien de contribuables » → compte des contribuables")
    void countsTaxpayers() {
        String reply = ai.chat("combien de contribuables ?", List.of());
        assertTrue(reply.contains("3"));
        assertTrue(reply.toLowerCase().contains("contribuable"));
    }

    @Test
    @DisplayName("Sans accent, la question reste comprise")
    void understandsMissingAccents() {
        String reply = ai.chat("montre moi le taux de recouvrement", List.of());
        assertTrue(reply.contains("recouvrement"));
    }

    @Test
    @DisplayName("Une faute de frappe n'empêche pas la compréhension")
    void understandsTypos() {
        String reply = ai.chat("quel est le recouvremnt actuel ?", List.of());
        assertTrue(reply.contains("recouvrement"));
    }

    @Test
    @DisplayName("« échéances » sans accent est reconnu comme « échéance »")
    void understandsUnaccentedDeadline() {
        String reply = ai.chat("mes echeances en retard", List.of());
        assertTrue(reply.toLowerCase().contains("retard"));
    }

    @Test
    @DisplayName("Une salutation pure renvoie l'accueil")
    void pureGreeting() {
        String reply = ai.chat("bonjour", List.of());
        assertTrue(reply.contains("M-TAX AI"));
        assertFalse(reply.contains("**3** contribuables enregistrés au total"));
    }

    @Test
    @DisplayName("« bonjour » suivi d'une vraie question répond à la question")
    void greetingFollowedByQuestion() {
        String reply = ai.chat("bonjour, combien de contribuables ?", List.of());
        assertTrue(reply.contains("3"));
        assertTrue(reply.toLowerCase().contains("contribuable"));
    }

    @Test
    @DisplayName("Un mot contenant « the » ne fait pas basculer en anglais")
    void doesNotMistakeWordsForEnglishMarkers() {
        // Français, sans marqueur de langue explicite : « theatre » contient « the ».
        String reply = ai.chat("apercu general du theatre", List.of());
        assertTrue(reply.toUpperCase().contains("M-TAX AI"));
    }

    @Test
    @DisplayName("La mémoire reprend le sujet de l'échange précédent")
    void followsTopicAcrossTurns() {
        List<ChatMessage> history = List.of(
                new ChatMessage("user", "resume des creances"),
                new ChatMessage("bot", "## Créances — 5 créances enregistrées"));
        String reply = ai.chat("et ensuite ?", history);
        assertTrue(reply.contains("créances"));
    }

    @Test
    @DisplayName("La mémoire retient les entités citées (NIF)")
    void remembersEntities() {
        List<ChatMessage> history = List.of(
                new ChatMessage("user", "je cherche la creance du NIF 1234567890"));
        String reply = ai.chat("et ensuite ?", history);
        assertTrue(reply.contains("1234567890"));
        assertTrue(reply.contains("Contexte retenu"));
    }

    @Test
    @DisplayName("Un message qui a son propre sujet n'est pas détourné par la mémoire")
    void ownTopicWinsOverMemory() {
        List<ChatMessage> history = List.of(new ChatMessage("user", "resume des creances"));
        String reply = ai.chat("et les paiements ?", history);
        assertTrue(reply.contains("Paiements"));
        assertFalse(reply.contains("Plus de détails sur les **créances**"));
    }

    @Test
    @DisplayName("La mémoire ne fuit pas d'une conversation à l'autre")
    void memoryIsPerConversation() {
        String withMemory = ai.chat("et ensuite ?",
                List.of(new ChatMessage("user", "combien de contribuables")));
        assertTrue(withMemory.contains("complémentaires"));

        String withoutMemory = ai.chat("et ensuite ?", List.of());
        assertFalse(withoutMemory.contains("complémentaires"));
    }

    @Test
    @DisplayName("Un message vague reprend le dernier sujet mémorisé")
    void vagueMessageCarriesOverTopic() {
        List<ChatMessage> history = List.of(new ChatMessage("user", "les paiements du mois"));
        String reply = ai.chat("donne moi plus", history);
        assertTrue(reply.contains("paiements"));
    }

    @Test
    @DisplayName("Un NIF mémorisé filtre réellement la réponse (fiche contribuable)")
    void nifFilterReturnsTaxpayerCard() {
        when(aiDataService.findByNif("1234567890")).thenReturn(Optional.of(
                new AiDataService.TaxpayerSnapshot("1234567890", "Rakoto SARL", "COMPANY", "ACTIVE",
                        4, 2, bd(1_500_000), bd(500_000), bd(1_000_000))));

        List<ChatMessage> history = List.of(
                new ChatMessage("user", "la creance du NIF 1234567890"));
        String reply = ai.chat("et les creances ?", history);

        assertTrue(reply.contains("Rakoto SARL"));
        assertTrue(reply.contains("1234567890"));
        assertTrue(reply.contains("1000000"));
    }

    @Test
    @DisplayName("Une période mémorisée change la fenêtre du résumé")
    void periodFilterSelectsWindow() {
        List<ChatMessage> history = List.of(new ChatMessage("user", "le bilan de cette annee"));
        String reply = ai.chat("et le total ?", history);

        // "cette année" -> fenêtre de 12 mois passée à DashboardService.
        verify(dashboard).summary(12);
        assertTrue(reply.contains("Filtres actifs"));
    }

    @Test
    @DisplayName("Un type d'impôt mémorisé filtre le détail par impôt")
    void taxTypeFilterIsApplied() {
        List<ChatMessage> history = List.of(new ChatMessage("user", "les paiements TVA"));
        String reply = ai.chat("et le total ?", history);

        assertTrue(reply.contains("type d'impôt"));
        assertTrue(reply.contains("TVA : 400000"));
    }

    @Test
    @DisplayName("Une période fiscale explicite filtre les créances")
    void fiscalPeriodFilterIsApplied() {
        when(aiDataService.debtAggregate(null, "2026-03", null, null)).thenReturn(
                new AiDataService.DebtAggregate(7, bd(1_500_000), bd(500_000), bd(1_000_000)));

        String reply = ai.chat("le total pour la periode 2026-03", List.of());

        assertTrue(reply.contains("période fiscale 2026-03"));
        assertTrue(reply.contains("1000000"));
    }

    @Test
    @DisplayName("Une plage de dates filtre créances et paiements")
    void dateRangeFilterIsApplied() {
        LocalDate from = LocalDate.of(2026, 1, 1);
        LocalDate to = LocalDate.of(2026, 3, 31);
        when(aiDataService.debtAggregate(null, null, from, to)).thenReturn(
                new AiDataService.DebtAggregate(4, bd(800_000), bd(300_000), bd(500_000)));
        when(aiDataService.paymentsBetween(from, to)).thenReturn(
                new AiDataService.PaymentAggregate(3, bd(300_000)));

        String reply = ai.chat("les creances du 01/01/2026 au 31/03/2026", List.of());

        assertTrue(reply.contains("01/01/2026"));
        assertTrue(reply.contains("31/03/2026"));
        assertTrue(reply.contains("500000"));
        assertTrue(reply.contains("Paiements encaissés"));
    }

    @Test
    @DisplayName("Une période fiscale mémorisée est réutilisée")
    void fiscalPeriodCarriedOverFromMemory() {
        when(aiDataService.debtAggregate(null, "2026-05", null, null)).thenReturn(
                new AiDataService.DebtAggregate(2, bd(400_000), bd(100_000), bd(300_000)));

        List<ChatMessage> history = List.of(new ChatMessage("user", "bilan de la periode 2026-05"));
        String reply = ai.chat("et le total ?", history);

        assertTrue(reply.contains("période fiscale 2026-05"));
        assertTrue(reply.contains("300000"));
    }

    private static BigDecimal bd(long value) {
        return BigDecimal.valueOf(value);
    }

    private static DashboardSummary sampleSummary() {
        return new DashboardSummary(
                3, 10, 2, 5, 2, 4,
                bd(1_000_000), bd(400_000), bd(600_000), bd(250_000), bd(120_000),
                40.0,
                List.of(Map.of("month", "2026-01", "amount", bd(120_000)),
                        Map.of("month", "2026-02", "amount", bd(150_000))),
                List.of(Map.of("status", "OVERDUE", "count", 2, "total", bd(250_000))),
                List.of(),
                List.of(Map.of("taxType", "TVA", "amount", bd(400_000)),
                        Map.of("taxType", "IRSA", "amount", bd(200_000))),
                List.of(),
                1, 3, 4,
                List.of(), List.of(),
                bd(400_000), 4, 10, 3,
                List.of(), List.of(),
                4, bd(400_000), 1,
                List.of(), List.of(), List.of()
        );
    }
}
