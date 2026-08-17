package com.mnktax.declaration.repository;

import com.mnktax.declaration.entity.DeclarationHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DeclarationHistoryRepository extends JpaRepository<DeclarationHistory, Long> {
    List<DeclarationHistory> findByDeclarationIdOrderByCreatedAtAsc(Long declarationId);
}
