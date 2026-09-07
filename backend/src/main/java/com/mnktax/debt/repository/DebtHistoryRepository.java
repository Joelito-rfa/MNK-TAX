package com.mnktax.debt.repository;

import com.mnktax.debt.entity.DebtHistory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface DebtHistoryRepository extends JpaRepository<DebtHistory, Long> {

    List<DebtHistory> findByDebtIdOrderByEventDateDesc(Long debtId);

    long countByDebtId(Long debtId);

    @Query("""
            SELECT h FROM DebtHistory h
            LEFT JOIN h.debt d
            LEFT JOIN d.taxpayer t
            WHERE (:debtId IS NULL OR h.debt.id = :debtId)
              AND (:eventType IS NULL OR UPPER(h.eventType) = UPPER(:eventType))
              AND (:q IS NULL OR LOWER(d.reference) LIKE LOWER(CONCAT('%', :q, '%'))
                    OR LOWER(t.nif) LIKE LOWER(CONCAT('%', :q, '%'))
                    OR LOWER(t.name) LIKE LOWER(CONCAT('%', :q, '%')))
            """)
    Page<DebtHistory> search(@Param("debtId") Long debtId,
                             @Param("eventType") String eventType,
                             @Param("q") String q,
                             Pageable pageable);
}
