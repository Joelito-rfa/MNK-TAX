package com.mnktax.payment.repository;

import com.mnktax.payment.entity.Payment;
import com.mnktax.payment.entity.PaymentStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface PaymentRepository extends JpaRepository<Payment, Long> {

    Optional<Payment> findByReference(String reference);

    @Query("""
            SELECT p FROM Payment p
            LEFT JOIN p.taxpayer t
            WHERE (:status IS NULL OR p.status = :status)
              AND (:taxpayerId IS NULL OR p.taxpayer.id = :taxpayerId)
              AND (:method IS NULL OR p.method = :method)
              AND (:from IS NULL OR p.paymentDate >= :from)
              AND (:to IS NULL OR p.paymentDate <= :to)
              AND (:q IS NULL OR LOWER(p.reference) LIKE LOWER(CONCAT('%', :q, '%'))
                    OR LOWER(t.nif) LIKE LOWER(CONCAT('%', :q, '%'))
                    OR LOWER(t.name) LIKE LOWER(CONCAT('%', :q, '%')))
            """)
    Page<Payment> search(@Param("status") PaymentStatus status,
                         @Param("taxpayerId") Long taxpayerId,
                         @Param("method") String method,
                         @Param("from") LocalDate from,
                         @Param("to") LocalDate to,
                         @Param("q") String q,
                         Pageable pageable);

    List<Payment> findByTaxpayerIdOrderByIdDesc(Long taxpayerId);

    long countByTaxpayerId(Long taxpayerId);

    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM Payment p WHERE p.status <> 'CANCELLED' " +
            "AND p.paymentDate BETWEEN :from AND :to")
    java.math.BigDecimal sumAllocatedBetween(@Param("from") LocalDate from, @Param("to") LocalDate to);
}
