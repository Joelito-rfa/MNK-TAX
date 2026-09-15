package com.mnktax.tax.repository;

import com.mnktax.tax.entity.ObligationStatus;
import com.mnktax.tax.entity.TaxObligation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface TaxObligationRepository extends JpaRepository<TaxObligation, Long> {

    List<TaxObligation> findByTaxpayerIdOrderByIdAsc(Long taxpayerId);

    List<TaxObligation> findByTaxpayerIdAndStatus(Long taxpayerId, ObligationStatus status);

    long countByTaxpayerId(Long taxpayerId);

    long countByStatus(ObligationStatus status);

    boolean existsByTaxpayerIdAndTaxTypeCode(Long taxpayerId, String taxTypeCode);

    Optional<TaxObligation> findByTaxpayerIdAndTaxTypeCodeAndPeriod(Long taxpayerId, String taxTypeCode, String period);

    @Query("SELECT o FROM TaxObligation o WHERE o.status = 'ACTIVE' AND o.paymentStatus IN ('UNPAID', 'PARTIALLY_PAID') AND o.paymentDeadline < :today")
    List<TaxObligation> findOverduePaymentObligations(@Param("today") LocalDate today);

    @Query("SELECT o FROM TaxObligation o WHERE o.status = 'ACTIVE' AND o.declarationStatus = 'NOT_SUBMITTED' AND o.declarationDeadline < :today")
    List<TaxObligation> findMissedDeclarationObligations(@Param("today") LocalDate today);

    @Query("SELECT o FROM TaxObligation o WHERE o.status = 'ACTIVE' AND o.endDate IS NOT NULL AND o.endDate < :today")
    List<TaxObligation> findExpiredObligations(@Param("today") LocalDate today);

    /** Obligations dont l'échéance de déclaration approche (fenêtre J+x / J-x). */
    @Query("SELECT o FROM TaxObligation o WHERE o.status = 'ACTIVE' AND o.declarationStatus = 'NOT_SUBMITTED' " +
            "AND o.declarationDeadline >= :from AND o.declarationDeadline <= :to")
    List<TaxObligation> findDueBetween(@Param("from") LocalDate from, @Param("to") LocalDate to);
}
