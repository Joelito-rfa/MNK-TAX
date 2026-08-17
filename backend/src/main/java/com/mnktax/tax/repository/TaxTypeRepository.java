package com.mnktax.tax.repository;

import com.mnktax.tax.entity.TaxType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TaxTypeRepository extends JpaRepository<TaxType, Long> {

    Optional<TaxType> findByCode(String code);

    boolean existsByCode(String code);

    List<TaxType> findByActiveTrueOrderByCodeAsc();
}
