package com.mnktax.taxpayer;

import com.mnktax.common.exception.BusinessException;
import com.mnktax.declaration.dto.DeclarationDtos.CreateDeclarationRequest;
import com.mnktax.declaration.service.DeclarationService;
import com.mnktax.tax.dto.ObligationDtos.CreateObligationRequest;
import com.mnktax.tax.entity.Periodicity;
import com.mnktax.tax.entity.TaxCenter;
import com.mnktax.tax.entity.TaxRegime;
import com.mnktax.tax.entity.TaxType;
import com.mnktax.tax.repository.TaxCenterRepository;
import com.mnktax.tax.repository.TaxRegimeRepository;
import com.mnktax.tax.repository.TaxTypeRepository;
import com.mnktax.tax.service.TaxObligationService;
import com.mnktax.taxpayer.dto.TaxpayerDtos.CreateTaxpayerRequest;
import com.mnktax.taxpayer.dto.TaxpayerDtos.TaxpayerDetailDto;
import com.mnktax.taxpayer.dto.TaxpayerDtos.TaxpayerStatsDto;
import com.mnktax.taxpayer.dto.TaxpayerDtos.UpdateTaxpayerRequest;
import com.mnktax.taxpayer.entity.TaxpayerStatus;
import com.mnktax.taxpayer.entity.TaxpayerType;
import com.mnktax.taxpayer.repository.TaxpayerRepository;
import com.mnktax.taxpayer.service.TaxpayerService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Tests du registre des contribuables : création, NIF (validité et unicité),
 * modification, statuts, recherche filtrée et statistiques.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class TaxpayerModuleIntegrationTest {

    @Autowired private TaxpayerService taxpayerService;
    @Autowired private TaxpayerRepository taxpayerRepository;
    @Autowired private TaxCenterRepository centerRepository;
    @Autowired private TaxRegimeRepository regimeRepository;
    @Autowired private TaxTypeRepository taxTypeRepository;
    @Autowired private TaxObligationService obligationService;
    @Autowired private DeclarationService declarationService;

    private Long centerId;
    private Long regimeId;

    @BeforeEach
    void setUp() {
        if (centerRepository.count() == 0) {
            centerRepository.save(TaxCenter.builder().code("CEN-TEST").name("Centre test")
                    .address("Test").createdAt(Instant.now()).build());
        }
        if (regimeRepository.count() == 0) {
            regimeRepository.save(TaxRegime.builder().code("REG-TEST").name("Régime test")
                    .vatApplicable(true).build());
        }
        if (taxTypeRepository.findByCode("TVA").isEmpty()) {
            taxTypeRepository.save(TaxType.builder().code("TVA").name("TVA test")
                    .category("DEMO").active(true).build());
        }
        centerId = centerRepository.findAll().get(0).getId();
        regimeId = regimeRepository.findAll().get(0).getId();
    }

    private CreateTaxpayerRequest companyRequest(String nif) {
        return new CreateTaxpayerRequest(nif, TaxpayerType.COMPANY, "Société Test SARL",
                "Nom commercial", null, null, "034 00 000 01", "contact@test.mg", "Adresse test",
                LocalDate.of(1980, 1, 1), "Représentant Légal", LocalDate.of(2024, 3, 1),
                centerId, regimeId, null, List.of());
    }

    private CreateTaxpayerRequest personRequest(String nif) {
        return new CreateTaxpayerRequest(nif, TaxpayerType.PERSON, "Jean RAKOTO",
                null, "Jean", "RAKOTO", "033 00 000 02", "jean@test.mg", "Antananarivo",
                LocalDate.of(1985, 6, 15), null, LocalDate.of(2024, 5, 10),
                centerId, regimeId, null, List.of());
    }

    @Test
    @DisplayName("Création d'une entreprise : identité complète persistée")
    void createCompanyTaxpayer() {
        TaxpayerDetailDto dto = taxpayerService.create(companyRequest("1000000002"), null);
        assertNotNull(dto.id());
        assertEquals("1000000002", dto.nif());
        assertEquals(TaxpayerType.COMPANY, dto.type());
        assertEquals("Représentant Légal", dto.legalRepresentative());
        assertEquals(LocalDate.of(2024, 3, 1), dto.registrationDate());
        assertEquals(TaxpayerStatus.ACTIVE, dto.status());
        assertEquals("CEN-TEST", dto.taxCenterCode());
        assertEquals("REG-TEST", dto.taxRegimeCode());
    }

    @Test
    @DisplayName("Création d'un particulier : type PERSON et date de naissance")
    void createPersonTaxpayer() {
        TaxpayerDetailDto dto = taxpayerService.create(personRequest("1000000003"), null);
        assertEquals(TaxpayerType.PERSON, dto.type());
        assertEquals("Jean", dto.firstName());
        assertEquals(LocalDate.of(1985, 6, 15), dto.birthDate());
        assertEquals("Jean RAKOTO", dto.name());
    }

    @Test
    @DisplayName("NIF invalide rejeté par la validation backend")
    void invalidNifRejected() {
        CreateTaxpayerRequest bad = companyRequest("12345");
        assertThrows(BusinessException.class, () -> taxpayerService.create(bad, null));
    }

    @Test
    @DisplayName("NIF en double rejeté (unicité)")
    void duplicateNifRejected() {
        taxpayerService.create(companyRequest("1000000004"), null);
        BusinessException ex = assertThrows(BusinessException.class,
                () -> taxpayerService.create(companyRequest("1000000004"), null));
        assertEquals("DUPLICATE", ex.getCode());
    }

    @Test
    @DisplayName("Modification : nom, régime et identité mis à jour + statut conservé")
    void updateTaxpayer() {
        TaxpayerDetailDto created = taxpayerService.create(companyRequest("1000000005"), null);
        UpdateTaxpayerRequest req = new UpdateTaxpayerRequest(TaxpayerType.COMPANY,
                "Société Test SARL (nouveau)", "Nom commercial v2", null, null,
                "034 00 000 09", "nouveau@test.mg", "Nouvelle adresse",
                LocalDate.of(1981, 2, 2), "Nouveau Représentant", LocalDate.of(2025, 1, 1),
                centerId, regimeId, TaxpayerStatus.ACTIVE);
        TaxpayerDetailDto updated = taxpayerService.update(created.id(), req, null);
        assertEquals("Société Test SARL (nouveau)", updated.name());
        assertEquals("Nouveau Représentant", updated.legalRepresentative());
        assertEquals("034 00 000 09", updated.phone());
        assertEquals(TaxpayerStatus.ACTIVE, updated.status());
    }

    @Test
    @DisplayName("Changement de statut : CLOSED supporté")
    void changeStatusToClosed() {
        TaxpayerDetailDto created = taxpayerService.create(companyRequest("1000000006"), null);
        taxpayerService.changeStatus(created.id(), TaxpayerStatus.CLOSED, null);
        TaxpayerDetailDto closed = taxpayerService.get(created.id());
        assertEquals(TaxpayerStatus.CLOSED, closed.status());
    }

    @Test
    @DisplayName("Recherche filtrée : par type et par téléphone")
    void searchWithFilters() {
        taxpayerService.create(companyRequest("1000000007"), null);
        taxpayerService.create(personRequest("1000000008"), null);

        var companies = taxpayerService.search(null, TaxpayerType.COMPANY, null, null, null, null, null,
                PageRequest.of(0, 20));
        assertTrue(companies.getTotalElements() >= 1);
        assertTrue(companies.getContent().stream().allMatch(t -> t.type() == TaxpayerType.COMPANY));

        var byPhone = taxpayerService.search("033 00 000 02", null, null, null, null, null, null,
                PageRequest.of(0, 20));
        assertTrue(byPhone.getTotalElements() >= 1);
        assertTrue(byPhone.getContent().stream().allMatch(t -> t.nif().equals("1000000008")));
    }

    @Test
    @DisplayName("Statistiques du registre cohérentes après création")
    void statsReflectRegistry() {
        taxpayerService.create(companyRequest("1000000009"), null);
        TaxpayerStatsDto stats = taxpayerService.stats();
        assertTrue(stats.total() >= 1);
        assertTrue(stats.active() >= 1);
        assertTrue(stats.overdueDebts() >= 0);
    }

    @Test
    @DisplayName("Création de déclaration refusée pour un contribuable clôturé")
    void createDeclarationForClosedTaxpayerRejected() {
        TaxpayerDetailDto created = taxpayerService.create(companyRequest("1000000010"), null);
        taxpayerService.changeStatus(created.id(), TaxpayerStatus.CLOSED, null);

        BusinessException ex = assertThrows(BusinessException.class, () -> declarationService.create(
                new CreateDeclarationRequest(created.id(), "TVA", "2026-08",
                        null, null, new BigDecimal("1000000"), new BigDecimal("200000"), null,
                        null, null, null, List.of()), null));
        assertEquals("TAXPAYER_CLOSED", ex.getCode());
    }

    @Test
    @DisplayName("Création de déclaration autorisée pour un contribuable actif")
    void createDeclarationForActiveTaxpayerOk() {
        TaxpayerDetailDto created = taxpayerService.create(companyRequest("1000000011"), null);
        var declaration = declarationService.create(
                new CreateDeclarationRequest(created.id(), "TVA", "2026-08",
                        null, null, new BigDecimal("1000000"), new BigDecimal("200000"), null,
                        null, null, null, List.of()), null);
        assertNotNull(declaration.id());
    }

    @Test
    @DisplayName("Création d'obligation refusée pour un contribuable clôturé")
    void createObligationForClosedTaxpayerRejected() {
        TaxpayerDetailDto created = taxpayerService.create(companyRequest("1000000012"), null);
        taxpayerService.changeStatus(created.id(), TaxpayerStatus.CLOSED, null);

        BusinessException ex = assertThrows(BusinessException.class, () -> obligationService.create(
                new CreateObligationRequest(created.id(), "TVA", Periodicity.MONTHLY, LocalDate.now(), null,
                        null, null, null, null, null, null), null));
        assertEquals("TAXPAYER_CLOSED", ex.getCode());
    }

    @Test
    @DisplayName("Création d'obligation autorisée pour un contribuable actif")
    void createObligationForActiveTaxpayerOk() {
        TaxpayerDetailDto created = taxpayerService.create(companyRequest("1000000013"), null);
        var obligation = obligationService.create(
                new CreateObligationRequest(created.id(), "TVA", Periodicity.MONTHLY, LocalDate.now(), null,
                        null, null, null, null, null, null), null);
        assertNotNull(obligation.id());
    }
}
