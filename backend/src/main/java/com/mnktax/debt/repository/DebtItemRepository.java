package com.mnktax.debt.repository;

import com.mnktax.debt.entity.DebtItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DebtItemRepository extends JpaRepository<DebtItem, Long> {

    List<DebtItem> findByDebtIdOrderByIdAsc(Long debtId);
}
