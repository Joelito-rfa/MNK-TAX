package com.mnktax.collection.repository;

import com.mnktax.collection.entity.CollectionAction;
import com.mnktax.collection.entity.CollectionActionType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
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
              AND (:q IS NULL OR LOWER(d.reference) LIKE LOWER(CONCAT('%', :q, '%'))
                    OR LOWER(t.nif) LIKE LOWER(CONCAT('%', :q, '%'))
                    OR LOWER(t.name) LIKE LOWER(CONCAT('%', :q, '%')))
            """)
    Page<CollectionAction> search(@Param("debtId") Long debtId,
                                  @Param("taxpayerId") Long taxpayerId,
                                  @Param("type") CollectionActionType type,
                                  @Param("q") String q,
                                  Pageable pageable);

    long countByDebtId(Long debtId);

    long countByType(CollectionActionType type);

    @Query("SELECT COUNT(a) FROM CollectionAction a")
    long countAll();

    Optional<CollectionAction> findTopByDebtIdOrderByActionDateDescCreatedAtDesc(Long debtId);

    /**
     * Dernière action (date puis id) de chaque créance d'une liste.
     * Retourne au plus une ligne par créance.
     */
    @Query("""
            SELECT a FROM CollectionAction a
            WHERE a.debt.id IN :debtIds
              AND NOT EXISTS (
                    SELECT a2 FROM CollectionAction a2
                    WHERE a2.debt = a.debt
                      AND (a2.actionDate > a.actionDate
                           OR (a2.actionDate = a.actionDate AND a2.id > a.id))
              )
            """)
    List<CollectionAction> findLatestByDebtIds(@Param("debtIds") java.util.Collection<Long> debtIds);

    /**
     * Dernière relance amiable (type REMINDER) de chaque créance d'une liste.
     * Sert au suivi fiscal : délai écoulé depuis la relance et alerte sur la
     * prochaine relance prévue. Au plus une ligne par créance.
     */
    @Query("""
            SELECT a FROM CollectionAction a
            WHERE a.debt.id IN :debtIds
              AND a.type = com.mnktax.collection.entity.CollectionActionType.REMINDER
              AND NOT EXISTS (
                    SELECT a2 FROM CollectionAction a2
                    WHERE a2.debt = a.debt
                      AND a2.type = com.mnktax.collection.entity.CollectionActionType.REMINDER
                      AND (a2.actionDate > a.actionDate
                           OR (a2.actionDate = a.actionDate AND a2.id > a.id))
              )
            """)
    List<CollectionAction> findLatestRemindersByDebtIds(@Param("debtIds") java.util.Collection<Long> debtIds);

    /**
     * Nombre de créances non soldées dont la dernière relance amiable prévoit une
     * prochaine relance déjà dépassée : alimente l'alerte « relances en retard ».
     */
    @Query("""
            SELECT COUNT(DISTINCT a.debt.id) FROM CollectionAction a
            WHERE a.type = com.mnktax.collection.entity.CollectionActionType.REMINDER
              AND a.nextActionDate IS NOT NULL
              AND a.nextActionDate < :today
              AND a.debt.balance > 0
              AND a.debt.status NOT IN (com.mnktax.debt.entity.DebtStatus.PAID,
                                        com.mnktax.debt.entity.DebtStatus.CANCELLED,
                                        com.mnktax.debt.entity.DebtStatus.CLOSED)
              AND NOT EXISTS (
                    SELECT a2 FROM CollectionAction a2
                    WHERE a2.debt = a.debt
                      AND a2.type = com.mnktax.collection.entity.CollectionActionType.REMINDER
                      AND (a2.actionDate > a.actionDate
                           OR (a2.actionDate = a.actionDate AND a2.id > a.id))
              )
            """)
    long countOverdueReminders(@Param("today") LocalDate today);

    @Query("""
            SELECT a FROM CollectionAction a
            LEFT JOIN FETCH a.debt d
            LEFT JOIN FETCH d.taxpayer
            WHERE a.nextAction IS NOT NULL AND a.nextActionDate IS NOT NULL
              AND a.nextActionDate >= CURRENT_DATE
              AND d.status NOT IN (com.mnktax.debt.entity.DebtStatus.PAID, com.mnktax.debt.entity.DebtStatus.CANCELLED)
            ORDER BY a.nextActionDate ASC
            """)
    List<CollectionAction> findWithPendingNextActions();

    List<CollectionAction> findTop10ByOrderByCreatedAtDesc();
}
