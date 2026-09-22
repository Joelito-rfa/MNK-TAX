package com.mnktax.ai.service;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * Normalisation de texte et correspondance de mots-clés tolérante aux fautes
 * pour l'assistant M-TAX AI.
 *
 * Le moteur d'origine utilisait {@code text.contains(keyword)}, ce qui ratait les
 * accents/fautes de frappe et provoquait des faux positifs (ex. « th » matchait le
 * mot anglais « the », ou le français « du » déclenchait l'intention « dette »).
 *
 * Ce helper :
 * <ul>
 *   <li>normalise la casse, les accents et la ponctuation ({@link #normalize}) ;</li>
 *   <li>compare au niveau des mots, avec limites de mot ;</li>
 *   <li>tolère les fautes de frappe via une distance de Levenshtein bornée ;</li>
 *   <li>reconnaît les radicaux volontaires (ex. « declar » → « déclarations »).</li>
 * </ul>
 */
public final class AiTextMatcher {

    /** Longueur minimale d'un mot-clé pour une correspondance par préfixe (radical). */
    private static final int MIN_PREFIX_LENGTH = 5;

    private AiTextMatcher() {
    }

    /**
     * Normalise un texte : minuscules, accents supprimés, ponctuation remplacée par
     * des espaces, espaces multiples compactés. Renvoie une chaîne vide pour {@code null}.
     */
    public static String normalize(String input) {
        if (input == null) return "";
        String decomposed = Normalizer.normalize(input, Normalizer.Form.NFD);
        String noAccents = decomposed.replaceAll("\\p{M}+", "").toLowerCase(Locale.ROOT);
        StringBuilder sb = new StringBuilder(noAccents.length());
        boolean previousWasSpace = true;
        for (int i = 0; i < noAccents.length(); i++) {
            char c = noAccents.charAt(i);
            if (Character.isLetterOrDigit(c)) {
                sb.append(c);
                previousWasSpace = false;
            } else if (!previousWasSpace) {
                sb.append(' ');
                previousWasSpace = true;
            }
        }
        return sb.toString().trim();
    }

    /** Découpe un texte déjà normalisé en mots. */
    public static List<String> tokens(String normalizedText) {
        if (normalizedText == null || normalizedText.isEmpty()) return List.of();
        return List.of(normalizedText.split(" "));
    }

    /**
     * Vrai si le texte (déjà normalisé) contient le mot-clé, au niveau du mot.
     * Les mots-clés multi-mots sont comparés comme une expression exacte.
     */
    public static boolean contains(String normalizedText, String rawKeyword) {
        String keyword = normalize(rawKeyword);
        if (keyword.isEmpty()) return false;

        String haystack = " " + normalizedText + " ";

        if (keyword.indexOf(' ') >= 0) {
            // Expression multi-mots : tolérante aux fautes via une fenêtre glissante.
            return containsPhrase(normalizedText, keyword);
        }
        if (haystack.contains(" " + keyword + " ")) return true;

        for (String token : tokens(normalizedText)) {
            if (tokenMatches(token, keyword)) return true;
        }
        return false;
    }

    /**
     * Correspondance d'une expression multi-mots tolérante aux fautes : une fenêtre
     * glissante de la taille de l'expression doit aligner chaque mot. Les connecteurs
     * courts (« de », « en », « et ») restent comparés exactement, seul les mots
     * porteurs de sens acceptent une faute de frappe.
     */
    private static boolean containsPhrase(String normalizedText, String keyword) {
        String[] keywordWords = keyword.split(" ");
        List<String> words = tokens(normalizedText);
        int span = keywordWords.length;
        if (words.size() < span) return false;
        for (int start = 0; start + span <= words.size(); start++) {
            boolean matches = true;
            for (int i = 0; i < span; i++) {
                if (!tokenMatches(words.get(start + i), keywordWords[i])) {
                    matches = false;
                    break;
                }
            }
            if (matches) return true;
        }
        return false;
    }

    /** Vrai si le texte normalisé commence par le mot-clé (bonus de scoring). */
    public static boolean startsWith(String normalizedText, String rawKeyword) {
        String keyword = normalize(rawKeyword);
        if (keyword.isEmpty()) return false;
        return normalizedText.equals(keyword) || normalizedText.startsWith(keyword + " ");
    }

    /**
     * Compare un mot au mot-clé : égalité exacte, puis radical (préfixe) pour les
     * mots-clés longs, puis tolérance aux fautes de frappe.
     */
    private static boolean tokenMatches(String token, String keyword) {
        if (token.equals(keyword)) return true;
        if (token.isEmpty() || keyword.length() < 4) return false;
        // Garde-fou : une faute de frappe conserve (presque toujours) l'initiale.
        if (token.charAt(0) != keyword.charAt(0)) return false;

        // Radical explicite : « recouvr » doit matcher « recouvrement ».
        if (keyword.length() >= MIN_PREFIX_LENGTH && token.startsWith(keyword)) return true;

        // Une différence de longueur de plus d'un caractère est trop risquée
        // (évite par ex. « vola » ≈ « volana »).
        if (Math.abs(token.length() - keyword.length()) > 1) return false;

        int maxDistance = keyword.length() >= 6 ? 2 : 1;
        return levenshtein(token, keyword) <= maxDistance;
    }

    /** Distance d'édition (Levenshtein) classique, mémoire O(min(n, m)). */
    static int levenshtein(String a, String b) {
        if (a.equals(b)) return 0;
        int n = a.length();
        int m = b.length();
        if (n == 0) return m;
        if (m == 0) return n;

        List<Integer> previous = new ArrayList<>(m + 1);
        List<Integer> current = new ArrayList<>(m + 1);
        for (int j = 0; j <= m; j++) previous.add(j);

        for (int i = 1; i <= n; i++) {
            current.clear();
            current.add(i);
            for (int j = 1; j <= m; j++) {
                int cost = a.charAt(i - 1) == b.charAt(j - 1) ? 0 : 1;
                int deletion = current.get(j - 1) + 1;
                int insertion = previous.get(j) + 1;
                int substitution = previous.get(j - 1) + cost;
                current.add(Math.min(Math.min(deletion, insertion), substitution));
            }
            List<Integer> swap = previous;
            previous = current;
            current = swap;
        }
        return previous.get(m);
    }
}
