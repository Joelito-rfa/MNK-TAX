package com.mnktax.common.util;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class NifValidatorTest {

    @ParameterizedTest
    @ValueSource(strings = {"0000409001", "1234567890", "9876543210", "0000000000", "9999999999"})
    @DisplayName("Accepte les NIF valides (10 chiffres, zéros non significatifs autorisés)")
    void acceptsValidNifs(String nif) {
        assertTrue(NifValidator.isValid(nif));
    }

    @ParameterizedTest
    @ValueSource(strings = {"000040900", "123456789", "12345678901", "000040900A", "12A4567890",
            " 0000409001", "0000409001 ", "", "   "})
    @DisplayName("Rejette les NIF invalides")
    void rejectsInvalidNifs(String nif) {
        assertFalse(NifValidator.isValid(nif));
    }

    @Test
    @DisplayName("Un NIF null est rejeté")
    void rejectsNull() {
        assertFalse(NifValidator.isValid(null));
    }

    @Test
    @DisplayName("Un NIF valide est traité comme chaîne, jamais comme nombre")
    void leadingZerosArePreserved() {
        assertTrue(NifValidator.isValid("0000409001"));
        assertFalse(NifValidator.isValid("409001"));
    }
}
