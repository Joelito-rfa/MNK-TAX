package com.mnktax.paymentplan.repository;

import com.mnktax.paymentplan.entity.PaymentPlan;
import com.mnktax.paymentplan.entity.PaymentPlanStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface PaymentPlanRepository extends JpaRepository<PaymentPlan, Long> {

    Optional<PaymentPlan> findByReference(String reference);

    /**
     * Plans d'une créance dans l'ordre de création (le plus ancien d'abord) :
     * l'argent reçu solde d'abord l'échéancier le plus ancien (FIFO).
     */
    List<PaymentPlan> findByDebtIdAndStatusInOrderByCreatedAtAsc(Long debtId, Collection<PaymentPlanStatus> statuses);

    long countByDebtIdAndStatus(Long debtId, PaymentPlanStatus status);

    long countByStatus(PaymentPlanStatus status);

    @Query("""
            SELECT COUNT(i) FROM PaymentPlan p
            JOIN p.installments i
            WHERE p.status = :status
              AND (i.status = com.mnktax.paymentplan.entity.InstallmentStatus.OVERDUE
                   OR (i.status IN (com.mnktax.paymentplan.entity.InstallmentStatus.PENDING,
                                    com.mnktax.paymentplan.entity.InstallmentStatus.PARTIALLY_PAID)
                       AND i.dueDate < :today))
            """)
    long countOverdueInstallments(@Param("status") PaymentPlanStatus status,
                                  @Param("today") LocalDate today);

    @Query("""
            SELECT COUNT(DISTINCT p) FROM PaymentPlan p
            JOIN p.installments i
            WHERE p.status = :status
              AND (i.status = com.mnktax.paymentplan.entity.InstallmentStatus.OVERDUE
                   OR (i.status IN (com.mnktax.paymentplan.entity.InstallmentStatus.PENDING,
                                    com.mnktax.paymentplan.entity.InstallmentStatus.PARTIALLY_PAID)
                       AND i.dueDate < :today))
            """)
    long countPlansWithOverdueInstallments(@Param("status") PaymentPlanStatus status,
                                           @Param("today") LocalDate today);

    @Query("""
            SELECT p FROM PaymentPlan p
            LEFT JOIN p.debt d
            LEFT JOIN d.taxpayer t
            WHERE (:status IS NULL OR p.status = :status)
              AND (:debtId IS NULL OR p.debt.id = :debtId)
              AND (:q IS NULL OR LOWER(p.reference) LIKE LOWER(CONCAT('%', :q, '%'))
                    OR LOWER(p.label) LIKE LOWER(CONCAT('%', :q, '%'))
                    OR LOWER(d.reference) LIKE LOWER(CONCAT('%', :q, '%'))
                    OR LOWER(t.nif) LIKE LOWER(CONCAT('%', :q, '%'))
                    OR LOWER(t.name) LIKE LOWER(CONCAT('%', :q, '%')))
            """)
    Page<PaymentPlan> search(@Param("status") PaymentPlanStatus status,
                             @Param("debtId") Long debtId,
                             @Param("q") String q,
                             Pageable pageable);

    /**
     * Plans actifs comportant au moins une tranche échue non soldée
     * (pour la détection quotidienne des retards d'échéancier).
     */
    @Query("""
            SELECT DISTINCT p FROM PaymentPlan p
            LEFT JOIN FETCH p.installments i
            WHERE p.status = :status
              AND i.status IN (com.mnktax.paymentplan.entity.InstallmentStatus.PENDING,
                               com.mnktax.paymentplan.entity.InstallmentStatus.PARTIALLY_PAID)
              AND i.dueDate < :today
            """)
    List<PaymentPlan> findActiveWithOverdueInstallments(@Param("status") PaymentPlanStatus status,
                                                        @Param("today") LocalDate today);

    @Query("""
            SELECT COUNT(DISTINCT p) FROM PaymentPlan p
            JOIN p.installments i
            WHERE p.status = :status
              AND i.status IN (com.mnktax.paymentplan.entity.InstallmentStatus.PENDING,
                               com.mnktax.paymentplan.entity.InstallmentStatus.PARTIALLY_PAID)
              AND i.dueDate < :today
            """)
    long countActiveWithOverdueInstallments(@Param("status") PaymentPlanStatus status,
                                            @Param("today") LocalDate today);
}
