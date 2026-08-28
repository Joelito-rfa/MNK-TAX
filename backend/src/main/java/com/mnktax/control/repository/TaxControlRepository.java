package com.mnktax.control.repository;

import com.mnktax.control.entity.ControlStatus;
import com.mnktax.control.entity.TaxControl;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface TaxControlRepository extends JpaRepository<TaxControl, Long> {

    Optional<TaxControl> findByReference(String reference);

    @Query("SELECT tc FROM TaxControl tc " +
            "WHERE (:status IS NULL OR tc.status = :status) " +
            "AND (:taxpayerId IS NULL OR tc.taxpayer.id = :taxpayerId) " +
            "AND (:agentId IS NULL OR tc.agentId = :agentId) " +
            "AND (:q IS NULL OR LOWER(tc.reference) LIKE LOWER(CONCAT('%',:q,'%')) " +
            "OR LOWER(tc.reason) LIKE LOWER(CONCAT('%',:q,'%')))")
    Page<TaxControl> search(@Param("status") ControlStatus status,
                            @Param("taxpayerId") Long taxpayerId,
                            @Param("agentId") Long agentId,
                            @Param("q") String q,
                            Pageable pageable);
}
