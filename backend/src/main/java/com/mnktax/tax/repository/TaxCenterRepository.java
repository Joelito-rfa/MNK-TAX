package com.mnktax.tax.repository;

import com.mnktax.tax.entity.TaxCenter;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface TaxCenterRepository extends JpaRepository<TaxCenter, Long> {

    Optional<TaxCenter> findByCode(String code);

    boolean existsByCode(String code);
}
