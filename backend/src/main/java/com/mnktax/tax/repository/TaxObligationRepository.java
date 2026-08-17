package com.mnktax.tax.repository;

import com.mnktax.tax.entity.TaxObligation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TaxObligationRepository extends JpaRepository<TaxObligation, Long> {

    List<TaxObligation> findByTaxpayerIdOrderByIdAsc(Long taxpayerId);

    List<TaxObligation> findByTaxpayerIdAndStatus(Long taxpayerId, com.mnktax.tax.entity.ObligationStatus status);

    long countByTaxpayerId(Long taxpayerId);
}
