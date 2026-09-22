package com.mnktax.ai.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Vérifie la normalisation et la correspondance de mots-clés tolérante aux fautes
 * qui alimente la compréhension de M-TAX AI.
 */
class AiTextMatcherTest {

    @Test
    @DisplayName("La normalisation retire accents, casse et ponctuation")
    void normalizeStripsAccentsAndPunctuation() {
        assertEquals("echeances d octobre", AiTextMatcher.normalize("Échéances d'Octobre !"));
        assertEquals("", AiTextMatcher.normalize(null));
    }

    @Test
    @DisplayName("Un mot-clé accentué matche un texte sans accent (et inversement)")
    void matchesAccentVariants() {
        assertTrue(AiTextMatcher.contains(AiTextMatcher.normalize("Régler mes impots"), "impôt"));
        assertTrue(AiTextMatcher.contains(AiTextMatcher.normalize("les créances"), "créance"));
    }

    @Test
    @DisplayName("Le pluriel est reconnu comme le singulier")
    void matchesPlurals() {
        assertTrue(AiTextMatcher.contains(AiTextMatcher.normalize("les contribuables"), "contribuable"));
        assertTrue(AiTextMatcher.contains(AiTextMatcher.normalize("les paiements"), "paiement"));
    }

    @Test
    @DisplayName("Les fautes de frappe sont tolérées")
    void toleratesTypos() {
        assertTrue(AiTextMatcher.contains(AiTextMatcher.normalize("le recouvremnt est faible"), "recouvrement"));
        assertTrue(AiTextMatcher.contains(AiTextMatcher.normalize("les paiemants recents"), "paiement"));
    }

    @Test
    @DisplayName("Les radicaux volontaires matchent leurs dérivés")
    void matchesStems() {
        assertTrue(AiTextMatcher.contains(AiTextMatcher.normalize("activites recentes"), "activit"));
        assertTrue(AiTextMatcher.contains(AiTextMatcher.normalize("les declarations"), "declar"));
    }

    @Test
    @DisplayName("Aucune correspondance en sous-chaîne : « th » ne matche pas « the »")
    void noSubstringFalsePositives() {
        assertFalse(AiTextMatcher.contains(AiTextMatcher.normalize("theatre"), "the"));
        assertFalse(AiTextMatcher.contains(AiTextMatcher.normalize("mathematiques"), "th"));
        assertFalse(AiTextMatcher.contains(AiTextMatcher.normalize("television"), "tv"));
    }

    @Test
    @DisplayName("La négation « pas » ne matche pas « passé »")
    void negationIsWordScoped() {
        assertFalse(AiTextMatcher.contains(AiTextMatcher.normalize("le mois passé"), "pas"));
        assertTrue(AiTextMatcher.contains(AiTextMatcher.normalize("il n'y a pas de paiement"), "pas"));
    }

    @Test
    @DisplayName("Une faute ne crée pas de match si l'initiale change")
    void firstLetterGuard() {
        assertFalse(AiTextMatcher.contains(AiTextMatcher.normalize("beaucoup de trosa"), "créance"));
    }

    @Test
    @DisplayName("Les expressions multi-mots sont comparées à l'identique")
    void matchesMultiWordPhrases() {
        assertTrue(AiTextMatcher.contains(AiTextMatcher.normalize("le mois dernier etait bon"), "mois dernier"));
        assertFalse(AiTextMatcher.contains(AiTextMatcher.normalize("le mois de janvier"), "mois dernier"));
    }

    @Test
    @DisplayName("Les expressions multi-mots tolèrent une faute de frappe")
    void matchesPhraseTypos() {
        assertTrue(AiTextMatcher.contains(AiTextMatcher.normalize("le mois derner etait bon"), "mois dernier"));
        assertTrue(AiTextMatcher.contains(AiTextMatcher.normalize("vos echeances sont en retrad"), "en retard"));
        assertFalse(AiTextMatcher.contains(AiTextMatcher.normalize("les paiements sont bons"), "en retard"));
    }

    @Test
    @DisplayName("startsWith respecte les limites de mot")
    void startsWithRespectsWordBoundaries() {
        assertTrue(AiTextMatcher.startsWith(AiTextMatcher.normalize("mais oui"), "mais"));
        assertFalse(AiTextMatcher.startsWith(AiTextMatcher.normalize("maison"), "mais"));
        assertFalse(AiTextMatcher.startsWith(AiTextMatcher.normalize("bonjour"), "bon"));
    }

    @Test
    @DisplayName("Les mots très courts ne tolèrent aucune faute")
    void shortKeywordsAreExact() {
        assertTrue(AiTextMatcher.contains(AiTextMatcher.normalize("tps"), "tps"));
        assertFalse(AiTextMatcher.contains(AiTextMatcher.normalize("tpsa"), "tps"));
    }

    @Test
    @DisplayName("La distance de Levenshtein est correcte")
    void levenshteinDistance() {
        assertEquals(0, AiTextMatcher.levenshtein("impot", "impot"));
        assertEquals(1, AiTextMatcher.levenshtein("impot", "impots"));
        assertEquals(3, AiTextMatcher.levenshtein("kitten", "sitting"));
    }
}
