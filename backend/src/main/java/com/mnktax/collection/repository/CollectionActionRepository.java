package com.mnktax.collection.repository;

import com.mnktax.collection.entity.CollectionAction;
import com.mnktax.collection.entity.CollectionActionType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface CollectionActionRepository extends JpaRepository<CollectionAction, Long> {

    List<CollectionAction> findByDebtIdOrderByActionDateDesc(Long debtId);

    @Query("""
            SELECT a FROM CollectionAction a
            LEFT JOIN a.debt d
            LEFT JOIN d.taxpayer t
            WHERE (:debtId IS NULL OR a.debt.id = :debtId)
              AND (:taxpayerId IS NULL OR d.taxpayer.id = :taxpayerId)
              AND (:type IS NULL OR a.type = :type)
            """)
    Page<CollectionAction> search(@Param("debtId") Long debtId,
                                  @Param("taxpayerId") Long taxpayerId,
                                  @Param("type") CollectionActionType type,
                                  Pageable pageable);

    long countByDebtId(Long debtId);

    @Query("SELECT COUNT(a) FROM CollectionAction a")
    long countAll();

    @Query("""
            SELECT a FROM CollectionAction a
            WHERE a.debt.id = :debtId
            ORDER BY a.actionDate DESC, a.createdAt DESC
            """)
    Optional<CollectionAction> findLatestByDebtId(@Param("debtId") Long debtId);

    @Query("""
            SELECT a FROM CollectionAction a
            WHERE a.nextAction IS NOT NULL AND a.nextActionDate IS NOT NULL
            ORDER BY a.nextActionDate ASC
            """)
    List<CollectionAction> findWithPendingNextActions();
}
