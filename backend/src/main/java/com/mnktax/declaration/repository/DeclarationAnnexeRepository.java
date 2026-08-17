package com.mnktax.declaration.repository;

import com.mnktax.declaration.entity.DeclarationAnnexe;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DeclarationAnnexeRepository extends JpaRepository<DeclarationAnnexe, Long> {
    List<DeclarationAnnexe> findByDeclarationIdOrderByIdAsc(Long declarationId);
    long countByDeclarationIdAndObligatoireTrue(Long declarationId);
    long countByDeclarationId(Long declarationId);
}
