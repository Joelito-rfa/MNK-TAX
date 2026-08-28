package com.mnktax.control;

import com.mnktax.common.exception.BusinessException;
import com.mnktax.control.dto.ControlDtos.ControlDetailDto;
import com.mnktax.control.dto.ControlDtos.CreateControlRequest;
import com.mnktax.control.dto.ControlDtos.DocumentRequest;
import com.mnktax.control.dto.ControlDtos.TaxControlDto;
import com.mnktax.control.dto.ControlDtos.UpdateControlRequest;
import com.mnktax.control.entity.ControlStatus;
import com.mnktax.control.entity.ControlType;
import com.mnktax.control.service.TaxControlService;
import com.mnktax.tax.entity.TaxCenter;
import com.mnktax.tax.entity.TaxRegime;
import com.mnktax.tax.repository.TaxCenterRepository;
import com.mnktax.tax.repository.TaxRegimeRepository;
import com.mnktax.taxpayer.dto.TaxpayerDtos.CreateTaxpayerRequest;
import com.mnktax.taxpayer.entity.TaxpayerType;
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
 * Tests du module Contrôles fiscaux : création avec documents, transitions de
 * statut, redressement, recherche filtrée.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class TaxControlModuleIntegrationTest {

    @Autowired private TaxpayerService taxpayerService;
    @Autowired private TaxCenterRepository centerRepository;
    @Autowired private TaxRegimeRepository regimeRepository;
    @Autowired private TaxControlService controlService;

    private Long taxpayerId;
    private int seq = 5000;

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
        Long centerId = centerRepository.findAll().get(0).getId();
        Long regimeId = regimeRepository.findAll().get(0).getId();
        taxpayerId = taxpayerService.create(new CreateTaxpayerRequest(
                String.format("%010d", seq++), TaxpayerType.COMPANY, "Société Contrôlée SARL",
                "Nom commercial", null, null, "034 00 000 01", "ctrl@test.mg", "Adresse test",
                LocalDate.of(1980, 1, 1), "Représentant Légal", LocalDate.of(2024, 3, 1),
                centerId, regimeId, null, List.of()), null).id();
    }

    private CreateControlRequest controlRequest() {
        return new CreateControlRequest(taxpayerId, ControlType.ON_SITE,
                LocalDate.of(2025, 1, 1), LocalDate.of(2025, 6, 30),
                "Vérification des déclarations TVA", null,
                List.of(new DocumentRequest("Registre des ventes", "REGISTRE"),
                        new DocumentRequest("Factures d'achat", "FACTURE")));
    }

    @Test
    @DisplayName("Création d'un contrôle : référence, statut OPEN, documents demandés")
    void createControl() {
        TaxControlDto c = controlService.create(controlRequest(), null);
        assertNotNull(c.id());
        assertTrue(c.reference().startsWith("CTRL-"));
        assertEquals(ControlStatus.OPEN, c.status());
        assertEquals(ControlType.ON_SITE, c.controlType());
        assertEquals(taxpayerId, c.taxpayerId());

        ControlDetailDto detail = controlService.get(c.id());
        assertEquals(2, detail.documents().size());
        assertEquals("Registre des ventes", detail.documents().get(0).title());
        assertEquals(false, detail.documents().get(0).received());
    }

    @Test
    @DisplayName("Transition OPEN → IN_PROGRESS → ANOMALY_DETECTED")
    void controlLifecycle() {
        TaxControlDto c = controlService.create(controlRequest(), null);
        TaxControlDto inProgress = controlService.update(c.id(),
                new UpdateControlRequest(ControlStatus.IN_PROGRESS, "Début des vérifications", null, null, null), null);
        assertEquals(ControlStatus.IN_PROGRESS, inProgress.status());
        assertNotNull(inProgress.startedAt());

        TaxControlDto anomaly = controlService.update(c.id(),
                new UpdateControlRequest(ControlStatus.ANOMALY_DETECTED, null, "Écarts constatés sur les déclarations", null, null), null);
        assertEquals(ControlStatus.ANOMALY_DETECTED, anomaly.status());
        assertEquals("Écarts constatés sur les déclarations", anomaly.anomalies());
    }

    @Test
    @DisplayName("Transition invalide rejetée : OPEN → REDRESSEMENT impossible")
    void invalidTransitionRejected() {
        TaxControlDto c = controlService.create(controlRequest(), null);
        BusinessException ex = assertThrows(BusinessException.class, () -> controlService.update(c.id(),
                new UpdateControlRequest(ControlStatus.REDRESSEMENT, null, null, null, null), null));
        assertEquals("INVALID_STATUS_TRANSITION", ex.getCode());
    }

    @Test
    @DisplayName("Clôture avec redressement : statut REDRESSEMENT + montant")
    void closeWithRedressement() {
        TaxControlDto c = controlService.create(controlRequest(), null);
        controlService.update(c.id(), new UpdateControlRequest(ControlStatus.IN_PROGRESS, null, null, null, null), null);
        controlService.update(c.id(), new UpdateControlRequest(ControlStatus.ANOMALY_DETECTED, null, "Anomalie", null, null), null);

        TaxControlDto closed = controlService.closeWithRedressement(c.id(),
                new BigDecimal("250000"), null, null);
        assertEquals(ControlStatus.REDRESSEMENT, closed.status());
        assertEquals(0, new BigDecimal("250000").compareTo(closed.redressement()));
        assertNotNull(closed.completedAt());
    }

    @Test
    @DisplayName("Recherche par contribuable et par statut")
    void searchControls() {
        TaxControlDto c1 = controlService.create(controlRequest(), null);
        TaxControlDto c2 = controlService.create(
                new CreateControlRequest(taxpayerId, ControlType.DOCUMENTARY,
                        LocalDate.of(2025, 1, 1), LocalDate.of(2025, 3, 31),
                        "Contrôle documentaire", null, List.of()), null);
        controlService.update(c2.id(), new UpdateControlRequest(ControlStatus.IN_PROGRESS, null, null, null, null), null);

        var byTaxpayer = controlService.search(null, taxpayerId, null, null, PageRequest.of(0, 20));
        assertTrue(byTaxpayer.getTotalElements() >= 2);
        assertTrue(byTaxpayer.getContent().stream().allMatch(c -> c.taxpayerId().equals(taxpayerId)));

        var byStatus = controlService.search(ControlStatus.IN_PROGRESS, null, null, null, PageRequest.of(0, 20));
        assertTrue(byStatus.getContent().stream().allMatch(c -> c.status() == ControlStatus.IN_PROGRESS));

        var byQ = controlService.search(null, null, null, "documentaire", PageRequest.of(0, 20));
        assertTrue(byQ.getContent().stream().anyMatch(c -> c.id().equals(c2.id())));
    }
}
