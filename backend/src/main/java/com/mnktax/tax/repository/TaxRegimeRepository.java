package com.mnktax.tax.repository;

import com.mnktax.tax.entity.TaxRegime;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface TaxRegimeRepository extends JpaRepository<TaxRegime, Long> {

    Optional<TaxRegime> findByCode(String code);

    boolean existsByCode(String code);
}
