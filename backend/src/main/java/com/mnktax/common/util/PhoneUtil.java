package com.mnktax.common.util;

import java.util.HashMap;
import java.util.Map;
import java.util.regex.Pattern;

/**
 * Utilitaire centralisé de formatage / normalisation de numéros de téléphone.
 *
 * Madagascar : indicatif +261. Formats acceptés :
 *   034 12 345 67   → +261341234567
 *   +261 34 12 345 67 → +261341234567
 *   261341234567    → +261341234567
 *
 * Le numéro normalisé est stocké sans espaces ni caractères spéciaux,
 * avec indicatif pays : "+261341234567".
 */
public final class PhoneUtil {

    private PhoneUtil() {
    }

    public static final String DEFAULT_COUNTRY_CODE = "+261";
    private static final int MG_LOCAL_LENGTH = 9;  // 3 + 6 chiffres (ex : 341234567)
    private static final int MG_WITH_PREFIX_LENGTH = 12; // 261 + 9

    private static final Pattern NON_DIGITS = Pattern.compile("[^0-9]");

    private static final Map<String, String> COUNTRY_DIAL_CODES = new HashMap<>();

    static {
        COUNTRY_DIAL_CODES.put("MG", DEFAULT_COUNTRY_CODE);
        COUNTRY_DIAL_CODES.put("RE", "+262");
        COUNTRY_DIAL_CODES.put("YT", "+262");
        COUNTRY_DIAL_CODES.put("FR", "+33");
        COUNTRY_DIAL_CODES.put("MU", "+230");
        COUNTRY_DIAL_CODES.put("KM", "+269");
    }

    /**
     * Normalise un numéro vers la forme E.164 (+261XXXXXXXXX).
     * Retourne null si le numéro est vide ou invalide.
     */
    public static String normalize(String raw) {
        if (raw == null) return null;
        String digits = NON_DIGITS.matcher(raw.trim()).replaceAll("");
        if (digits.isEmpty()) return null;

        String country = DEFAULT_COUNTRY_CODE; // +261
        String local;
        if (digits.startsWith("261")) {
            local = digits.substring(3);
        } else if (digits.startsWith("0") && digits.length() == 10) {
            local = digits.substring(1);
        } else if (digits.length() == MG_LOCAL_LENGTH) {
            local = digits;
        } else if (digits.length() > MG_LOCAL_LENGTH) {
            // Numéro international d'un autre pays (composé) : on garde tel quel.
            return "+" + digits;
        } else {
            return null;
        }
        if (local.length() != MG_LOCAL_LENGTH) return null;
        return country + local;
    }

    /** Numéro formaté lisible : +261 34 12 345 67. Null si invalide. */
    public static String format(String raw) {
        String normalized = normalize(raw);
        if (normalized == null) return null;
        if (!normalized.startsWith(DEFAULT_COUNTRY_CODE) || normalized.length() != DEFAULT_COUNTRY_CODE.length() + MG_LOCAL_LENGTH) {
            return normalized;
        }
        String local = normalized.substring(DEFAULT_COUNTRY_CODE.length());
        return DEFAULT_COUNTRY_CODE + " " + local.substring(0, 2) + " "
                + local.substring(2, 4) + " " + local.substring(4, 7) + " " + local.substring(7);
    }

    /** true si le numéro peut être normalisé vers un format valide. */
    public static boolean isValid(String raw) {
        return normalize(raw) != null;
    }

    /** Indicatif pays d'un numéro normalisé (ex : "+261"), ou null. */
    public static String countryOf(String normalized) {
        if (normalized == null || !normalized.startsWith("+") || normalized.length() < 3) return null;
        return COUNTRY_DIAL_CODES.values().stream()
                .filter(normalized::startsWith)
                .reduce((a, b) -> a.length() >= b.length() ? a : b)
                .orElse(normalized.substring(0, 3));
    }

    /** Indicatif international d'un code pays ISO2 (ex : MG → +261). */
    public static String dialCodeOf(String iso2) {
        return iso2 == null ? null : COUNTRY_DIAL_CODES.get(iso2.toUpperCase());
    }
}
