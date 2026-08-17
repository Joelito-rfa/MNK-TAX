package com.mnktax.tax.engine;

import com.mnktax.taxpayer.entity.Taxpayer;
import com.mnktax.taxpayer.entity.TaxpayerType;
import com.mnktax.tax.entity.TaxType;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Contexte utilisé par le moteur fiscal pour résoudre la règle applicable
 * et calculer l'impôt.
 */
public record TaxContext(
        Taxpayer taxpayer,
        TaxType taxType,
        String period,
        LocalDate effectDate,
        BigDecimal baseAmount,
        String activityCode
) {

    public TaxpayerType taxpayerType() {
        return taxpayer == null ? null : taxpayer.getType();
    }

    public Long regimeId() {
        return taxpayer == null || taxpayer.getTaxRegime() == null ? null : taxpayer.getTaxRegime().getId();
    }
}
