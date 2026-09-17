package com.mnktax.refund.repository;

import com.mnktax.refund.entity.Refund;
import com.mnktax.refund.entity.RefundReason;
import com.mnktax.refund.entity.RefundStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Optional;

public interface RefundRepository extends JpaRepository<Refund, Long> {

    Optional<Refund> findByReference(String reference);

    @Query("SELECT r FROM Refund r " +
            "WHERE (:status IS NULL OR r.status = :status) " +
            "AND (:reason IS NULL OR r.reason = :reason) " +
            "AND (:taxpayerId IS NULL OR r.taxpayer.id = :taxpayerId) " +
            "AND (:from IS NULL OR r.createdAt >= :from) " +
            "AND (:to IS NULL OR r.createdAt < :to) " +
            "AND (:minAmount IS NULL OR r.amount >= :minAmount) " +
            "AND (:maxAmount IS NULL OR r.amount <= :maxAmount) " +
            "AND (:q IS NULL OR LOWER(r.reference) LIKE LOWER(CONCAT('%',:q,'%')) " +
            "OR LOWER(r.description) LIKE LOWER(CONCAT('%',:q,'%')) " +
            "OR LOWER(r.taxpayer.name) LIKE LOWER(CONCAT('%',:q,'%')) " +
            "OR LOWER(r.taxpayer.nif) LIKE LOWER(CONCAT('%',:q,'%'))) ")
    Page<Refund> search(@Param("status") RefundStatus status,
                        @Param("reason") RefundReason reason,
                        @Param("taxpayerId") Long taxpayerId,
                        @Param("q") String q,
                        @Param("from") Instant from,
                        @Param("to") Instant to,
                        @Param("minAmount") BigDecimal minAmount,
                        @Param("maxAmount") BigDecimal maxAmount,
                        Pageable pageable);

    long countByStatus(RefundStatus status);
}
