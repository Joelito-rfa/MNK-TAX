package com.mnktax.complaint;

import com.mnktax.common.exception.BusinessException;
import com.mnktax.complaint.dto.ComplaintDtos.AddResponseRequest;
import com.mnktax.complaint.dto.ComplaintDtos.ComplaintDetailDto;
import com.mnktax.complaint.dto.ComplaintDtos.ComplaintDto;
import com.mnktax.complaint.dto.ComplaintDtos.CreateComplaintRequest;
import com.mnktax.complaint.dto.ComplaintDtos.UpdateComplaintRequest;
import com.mnktax.complaint.entity.ComplaintStatus;
import com.mnktax.complaint.entity.ContextType;
import com.mnktax.complaint.service.ComplaintService;
import com.mnktax.refund.dto.RefundDtos.CreateRefundRequest;
import com.mnktax.refund.dto.RefundDtos.PayRefundRequest;
import com.mnktax.refund.dto.RefundDtos.RefundDto;
import com.mnktax.refund.dto.RefundDtos.ReviewRefundRequest;
import com.mnktax.refund.entity.RefundReason;
import com.mnktax.refund.entity.RefundStatus;
import com.mnktax.refund.service.RefundService;
import com.mnktax.tax.entity.TaxCenter;
import com.mnktax.tax.entity.TaxRegime;
import com.mnktax.tax.repository.TaxCenterRepository;
import com.mnktax.tax.repository.TaxRegimeRepository;
import com.mnktax.taxpayer.dto.TaxpayerDtos.CreateTaxpayerRequest;
import com.mnktax.taxpayer.dto.TaxpayerDtos.TaxpayerDetailDto;
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
 * Tests des modules Réclamations et Remboursements : cycle de vie complet,
 * transitions de statut et garde-fous métier.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class ComplaintRefundModuleIntegrationTest {

    @Autowired private TaxpayerService taxpayerService;
    @Autowired private TaxCenterRepository centerRepository;
    @Autowired private TaxRegimeRepository regimeRepository;
    @Autowired private ComplaintService complaintService;
    @Autowired private RefundService refundService;

    private Long taxpayerId;
    private int seq = 4000;

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
                String.format("%010d", seq++), TaxpayerType.COMPANY, "Société Réclamations SARL",
                "Nom commercial", null, null, "034 00 000 01", "recl@test.mg", "Adresse test",
                LocalDate.of(1980, 1, 1), "Représentant Légal", LocalDate.of(2024, 3, 1),
                centerId, regimeId, null, List.of()), null).id();
    }

    private CreateComplaintRequest complaintRequest(String subject) {
        return new CreateComplaintRequest(taxpayerId, subject, "Description de la réclamation",
                ContextType.DECLARATION, "DEC-2026-001", null, null, null, null);
    }

    @Test
    @DisplayName("Création d'une réclamation : référence, statut OPEN, contexte")
    void createComplaint() {
        ComplaintDto c = complaintService.create(complaintRequest("Montant contesté"), null);
        assertNotNull(c.id());
        assertTrue(c.reference().startsWith("REC-"));
        assertEquals(ComplaintStatus.OPEN, c.status());
        assertEquals(ContextType.DECLARATION, c.contextType());
        assertEquals("DEC-2026-001", c.contextRef());
        assertEquals(taxpayerId, c.taxpayerId());
    }

    @Test
    @DisplayName("Ajout d'une réponse : passe la réclamation en UNDER_REVIEW")
    void addResponseMovesToUnderReview() {
        ComplaintDto c = complaintService.create(complaintRequest("Demande de rectification"), null);
        complaintService.addResponse(c.id(), new AddResponseRequest("Dossier transmis au service concerné."), null);
        ComplaintDetailDto detail = complaintService.get(c.id());
        assertEquals(ComplaintStatus.UNDER_REVIEW, detail.complaint().status());
        assertEquals(1, detail.responses().size());
        assertEquals("Dossier transmis au service concerné.", detail.responses().get(0).content());
    }

    @Test
    @DisplayName("Transition de statut valide : UNDER_REVIEW → ACCEPTED avec résolution")
    void acceptComplaint() {
        ComplaintDto c = complaintService.create(complaintRequest("Trop-perçu sur TVA"), null);
        complaintService.addResponse(c.id(), new AddResponseRequest("Examen en cours"), null);
        ComplaintDto updated = complaintService.update(c.id(),
                new UpdateComplaintRequest(ComplaintStatus.ACCEPTED, "Crédit accepté, remboursement engagé.", null), null);
        assertEquals(ComplaintStatus.ACCEPTED, updated.status());
        assertEquals("Crédit accepté, remboursement engagé.", updated.resolution());
        assertNotNull(updated.resolvedAt());
    }

    @Test
    @DisplayName("Transition invalide rejetée : OPEN → ACCEPTED impossible")
    void invalidTransitionRejected() {
        ComplaintDto c = complaintService.create(complaintRequest("Cas invalide"), null);
        BusinessException ex = assertThrows(BusinessException.class, () -> complaintService.update(c.id(),
                new UpdateComplaintRequest(ComplaintStatus.ACCEPTED, null, null), null));
        assertEquals("INVALID_STATUS_TRANSITION", ex.getCode());
    }

    @Test
    @DisplayName("Recherche par contribuable et par statut")
    void searchComplaints() {
        complaintService.create(complaintRequest("Recherche 1"), null);
        ComplaintDto c2 = complaintService.create(complaintRequest("Recherche 2"), null);
        complaintService.update(c2.id(), new UpdateComplaintRequest(ComplaintStatus.CLOSED, null, null), null);

        var byTaxpayer = complaintService.search(null, taxpayerId, null, null, PageRequest.of(0, 20));
        assertTrue(byTaxpayer.getTotalElements() >= 2);
        assertTrue(byTaxpayer.getContent().stream().allMatch(c -> c.taxpayerId().equals(taxpayerId)));

        var byStatus = complaintService.search(ComplaintStatus.CLOSED, null, null, null, PageRequest.of(0, 20));
        assertTrue(byStatus.getContent().stream().allMatch(c -> c.status() == ComplaintStatus.CLOSED));
    }

    @Test
    @DisplayName("Création d'une demande de remboursement : PENDING avec montant et motif")
    void createRefund() {
        RefundDto r = refundService.create(new CreateRefundRequest(taxpayerId, RefundReason.VAT_CREDIT,
                "Crédit de TVA non utilisé", null, null, new BigDecimal("500000")), null);
        assertNotNull(r.id());
        assertTrue(r.reference().startsWith("REM-"));
        assertEquals(RefundStatus.PENDING, r.status());
        assertEquals(RefundReason.VAT_CREDIT, r.reason());
        assertEquals(0, new BigDecimal("500000").compareTo(r.amount()));
        assertEquals(taxpayerId, r.taxpayerId());
    }

    @Test
    @DisplayName("Examen : approbation puis paiement")
    void approveAndPayRefund() {
        RefundDto created = refundService.create(new CreateRefundRequest(taxpayerId, RefundReason.OVERPAYMENT,
                "Trop-perçu déclaration", null, null, new BigDecimal("750000")), null);

        RefundDto approved = refundService.review(created.id(),
                new ReviewRefundRequest(true, new BigDecimal("750000"), null), null);
        assertEquals(RefundStatus.APPROVED, approved.status());
        assertEquals(0, new BigDecimal("750000").compareTo(approved.approvedAmount()));

        RefundDto paid = refundService.pay(approved.id(),
                new PayRefundRequest("BANK_TRANSFER", "VIR-2026-0042"), null);
        assertEquals(RefundStatus.PAID, paid.status());
        assertEquals("BANK_TRANSFER", paid.paymentMethod());
        assertEquals("VIR-2026-0042", paid.paymentReference());
        assertNotNull(paid.paidAt());
    }

    @Test
    @DisplayName("Rejet avec motif")
    void rejectRefund() {
        RefundDto created = refundService.create(new CreateRefundRequest(taxpayerId, RefundReason.OTHER,
                "Demande incomplète", null, null, new BigDecimal("100000")), null);
        RefundDto rejected = refundService.review(created.id(),
                new ReviewRefundRequest(false, null, "Pièces justificatives manquantes"), null);
        assertEquals(RefundStatus.REJECTED, rejected.status());
        assertEquals("Pièces justificatives manquantes", rejected.rejectionReason());
    }

    @Test
    @DisplayName("Paiement refusé tant que le remboursement n'est pas approuvé")
    void payNonApprovedRefundRejected() {
        RefundDto created = refundService.create(new CreateRefundRequest(taxpayerId, RefundReason.VAT_CREDIT,
                null, null, null, new BigDecimal("200000")), null);
        BusinessException ex = assertThrows(BusinessException.class, () -> refundService.pay(created.id(),
                new PayRefundRequest("CASH", null), null));
        assertEquals("INVALID_STATUS", ex.getCode());
    }
}
