package com.mnktax.auth.service;

import com.mnktax.auth.entity.Role;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

/**
 * Normalisation du rôle demandé avant approbation.
 *
 * Le formulaire public envoie des codes (TAXPAYER, TAX_AGENT…), mais les
 * demandes antérieures portent des libellés (« Agent fiscal ») ou des valeurs
 * de type (« INDIVIDUAL ») : sans aliases, l'approbation échouait avec
 * « Rôle inconnu : AGENT_FISCAL ».
 */
class RegistrationRoleResolveTest {

    @Test
    @DisplayName("Les codes de rôle sont repris tels quels")
    void keepsRoleCodes() {
        assertEquals(Role.TAXPAYER, RegistrationService.resolveRoleCode("TAXPAYER"));
        assertEquals(Role.TAX_AGENT, RegistrationService.resolveRoleCode("TAX_AGENT"));
        assertEquals(Role.COLLECTION_AGENT, RegistrationService.resolveRoleCode("COLLECTION_AGENT"));
        assertEquals(Role.ACCOUNTANT, RegistrationService.resolveRoleCode("ACCOUNTANT"));
    }

    @Test
    @DisplayName("Les libellés du formulaire public sont convertis en code")
    void mapsDisplayedLabelsToCodes() {
        assertEquals(Role.TAX_AGENT, RegistrationService.resolveRoleCode("Agent fiscal"));
        assertEquals(Role.COLLECTION_AGENT, RegistrationService.resolveRoleCode("Agent de recouvrement"));
        assertEquals(Role.ACCOUNTANT, RegistrationService.resolveRoleCode("Comptable"));
        assertEquals(Role.TAXPAYER, RegistrationService.resolveRoleCode("Contribuable"));
        assertEquals(Role.TAXPAYER, RegistrationService.resolveRoleCode("Particulier"));
    }

    @Test
    @DisplayName("Les valeurs de type employées comme rôle ouvrent un compte contribuable")
    void mapsRequestTypesToTaxpayer() {
        assertEquals(Role.TAXPAYER, RegistrationService.resolveRoleCode("INDIVIDUAL"));
        assertEquals(Role.TAXPAYER, RegistrationService.resolveRoleCode("COMPANY"));
        assertEquals(Role.TAXPAYER, RegistrationService.resolveRoleCode("OTHER"));
        assertEquals(Role.TAXPAYER, RegistrationService.resolveRoleCode("AUTRE"));
    }

    @Test
    @DisplayName("Les rôles administratifs sont conservés pour déclencher le refus explicite")
    void keepsAdministrativeRolesForExplicitRefusal() {
        assertEquals(Role.ADMIN, RegistrationService.resolveRoleCode("ADMIN"));
        assertEquals(Role.ADMIN, RegistrationService.resolveRoleCode("Administrateur"));
        assertEquals(Role.SUPER_ADMIN, RegistrationService.resolveRoleCode("SUPER_ADMIN"));
    }

    @Test
    @DisplayName("Une valeur vide renvoie null (rôle obligatoire à l'approbation)")
    void blankValueReturnsNull() {
        assertNull(RegistrationService.resolveRoleCode(null));
        assertNull(RegistrationService.resolveRoleCode(""));
        assertNull(RegistrationService.resolveRoleCode("   "));
    }

    @Test
    @DisplayName("La casse et les espaces superflus sont ignorés")
    void normalizesCaseAndWhitespace() {
        assertEquals(Role.TAX_AGENT, RegistrationService.resolveRoleCode("  agent fiscal  "));
        assertEquals(Role.COLLECTION_AGENT, RegistrationService.resolveRoleCode("agent  de  recouvrement"));
        assertEquals(Role.TAXPAYER, RegistrationService.resolveRoleCode("individual"));
    }
}
