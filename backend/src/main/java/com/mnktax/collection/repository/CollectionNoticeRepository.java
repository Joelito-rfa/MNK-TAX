package com.mnktax.collection.repository;

import com.mnktax.collection.entity.CollectionNotice;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface CollectionNoticeRepository extends JpaRepository<CollectionNotice, Long> {

    List<CollectionNotice> findByDebtIdOrderByNoticeDateDesc(Long debtId);

    @Query("""
            SELECT n FROM CollectionNotice n
            LEFT JOIN n.debt d
            LEFT JOIN d.taxpayer t
            WHERE (:debtId IS NULL OR n.debt.id = :debtId)
              AND (:noticeType IS NULL OR UPPER(n.noticeType) = UPPER(:noticeType))
              AND (:q IS NULL OR LOWER(n.noticeNumber) LIKE LOWER(CONCAT('%', :q, '%'))
                    OR LOWER(d.reference) LIKE LOWER(CONCAT('%', :q, '%'))
                    OR LOWER(t.nif) LIKE LOWER(CONCAT('%', :q, '%'))
                    OR LOWER(t.name) LIKE LOWER(CONCAT('%', :q, '%')))
            """)
    Page<CollectionNotice> search(@Param("debtId") Long debtId,
                                  @Param("noticeType") String noticeType,
                                  @Param("q") String q,
                                  Pageable pageable);
}
