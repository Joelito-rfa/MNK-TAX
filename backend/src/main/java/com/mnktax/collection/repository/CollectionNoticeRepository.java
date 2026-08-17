package com.mnktax.collection.repository;

import com.mnktax.collection.entity.CollectionNotice;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CollectionNoticeRepository extends JpaRepository<CollectionNotice, Long> {

    List<CollectionNotice> findByDebtIdOrderByNoticeDateDesc(Long debtId);
}
