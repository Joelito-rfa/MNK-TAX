package com.mnktax.refund.repository;

import com.mnktax.refund.entity.Refund;
import com.mnktax.refund.entity.RefundStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface RefundRepository extends JpaRepository<Refund, Long> {

    Optional<Refund> findByReference(String reference);

    @Query("SELECT r FROM Refund r " +
            "WHERE (:status IS NULL OR r.status = :status) " +
            "AND (:taxpayerId IS NULL OR r.taxpayer.id = :taxpayerId) " +
            "AND (:q IS NULL OR LOWER(r.reference) LIKE LOWER(CONCAT('%',:q,'%')) " +
            "OR LOWER(r.description) LIKE LOWER(CONCAT('%',:q,'%')))")
    Page<Refund> search(@Param("status") RefundStatus status,
                        @Param("taxpayerId") Long taxpayerId,
                        @Param("q") String q,
                        Pageable pageable);

    long countByStatus(RefundStatus status);
}
