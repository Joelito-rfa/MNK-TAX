package com.mnktax.common.util;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** Tests du formateur centralisé de numéros de téléphone (+261). */
class PhoneUtilTest {

    @Test
    @DisplayName("Normalise les formats locaux malgaches 03X XXX XXX")
    void normalizeLocalFormat() {
        assertEquals("+261341234567", PhoneUtil.normalize("034 12 345 67"));
        assertEquals("+261321234567", PhoneUtil.normalize("0321234567"));
        assertEquals("+261331234567", PhoneUtil.normalize("033-12-345-67"));
    }

    @Test
    @DisplayName("Normalise les formats internationaux +261")
    void normalizeInternationalFormat() {
        assertEquals("+261341234567", PhoneUtil.normalize("+261 34 12 345 67"));
        assertEquals("+261341234567", PhoneUtil.normalize("261341234567"));
    }

    @Test
    @DisplayName("Format lisible +261 XX XX XXX XX")
    void readableFormat() {
        assertEquals("+261 34 12 345 67", PhoneUtil.format("0341234567"));
    }

    @Test
    @DisplayName("Numéros invalides → null")
    void invalidNumbers() {
        assertNull(PhoneUtil.normalize(null));
        assertNull(PhoneUtil.normalize(""));
        assertNull(PhoneUtil.normalize("abc"));
        assertNull(PhoneUtil.normalize("12345"));
    }

    @Test
    @DisplayName("isValid reflète la normalisation")
    void validity() {
        assertTrue(PhoneUtil.isValid("0341234567"));
        assertFalse(PhoneUtil.isValid("0341234"));
    }

    @Test
    @DisplayName("Indicatif pays extrait du numéro normalisé")
    void countryExtraction() {
        assertEquals("+261", PhoneUtil.countryOf("+261341234567"));
        assertNull(PhoneUtil.countryOf("0341234567"));
    }
}
