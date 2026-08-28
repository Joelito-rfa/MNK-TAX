package com.mnktax.debt.repository;

import com.mnktax.debt.entity.DebtHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DebtHistoryRepository extends JpaRepository<DebtHistory, Long> {

    List<DebtHistory> findByDebtIdOrderByEventDateDesc(Long debtId);

    long countByDebtId(Long debtId);
}
