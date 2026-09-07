package com.mnktax.debt.repository;

import com.mnktax.debt.entity.DebtDispute;
import com.mnktax.debt.entity.DisputeDecision;
import com.mnktax.debt.entity.DisputeStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface DebtDisputeRepository extends JpaRepository<DebtDispute, Long> {

    Optional<DebtDispute> findByReference(String reference);

    List<DebtDispute> findByDebtIdOrderByContestationDateDescCreatedAtDesc(Long debtId);

    boolean existsByDebtIdAndStatus(Long debtId, DisputeStatus status);

    @Query("""
            SELECT d FROM DebtDispute d
            LEFT JOIN d.debt t
            WHERE (:debtId IS NULL OR d.debt.id = :debtId)
              AND (:status IS NULL OR d.status = :status)
              AND (:decision IS NULL OR d.decision = :decision)
              AND (:q IS NULL OR LOWER(d.reference) LIKE LOWER(CONCAT('%', :q, '%'))
                    OR LOWER(d.reason) LIKE LOWER(CONCAT('%', :q, '%'))
                    OR LOWER(d.debt.reference) LIKE LOWER(CONCAT('%', :q, '%'))
                    OR LOWER(d.debt.taxpayer.nif) LIKE LOWER(CONCAT('%', :q, '%'))
                    OR LOWER(d.debt.taxpayer.name) LIKE LOWER(CONCAT('%', :q, '%')))
            """)
    Page<DebtDispute> search(@Param("debtId") Long debtId,
                             @Param("status") DisputeStatus status,
                             @Param("decision") DisputeDecision decision,
                             @Param("q") String q,
                             Pageable pageable);
}
