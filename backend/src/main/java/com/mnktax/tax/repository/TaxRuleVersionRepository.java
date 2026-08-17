package com.mnktax.tax.repository;

import com.mnktax.tax.entity.TaxRule;
import com.mnktax.tax.entity.TaxRuleVersion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TaxRuleVersionRepository extends JpaRepository<TaxRuleVersion, Long> {

    List<TaxRuleVersion> findByRuleOrderByVersionNumberAsc(TaxRule rule);

    List<TaxRuleVersion> findByRuleIdOrderByVersionNumberDesc(Long ruleId);

    int countByRule(TaxRule rule);
}
