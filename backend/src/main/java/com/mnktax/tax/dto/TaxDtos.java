package com.mnktax.tax.dto;

import com.mnktax.tax.entity.TaxCenter;
import com.mnktax.tax.entity.TaxRegime;
import com.mnktax.tax.entity.TaxType;

public final class TaxDtos {

    private TaxDtos() {
    }

    public record TaxTypeDto(Long id, String code, String name, String category, String description, boolean active) {
        public static TaxTypeDto from(TaxType t) {
            return new TaxTypeDto(t.getId(), t.getCode(), t.getName(), t.getCategory(), t.getDescription(), t.isActive());
        }
    }

    public record TaxRegimeDto(Long id, String code, String name, String description, String category) {
        public static TaxRegimeDto from(TaxRegime r) {
            return new TaxRegimeDto(r.getId(), r.getCode(), r.getName(), r.getDescription(), r.getCategory());
        }
    }

    public record TaxCenterDto(Long id, String code, String name, String address) {
        public static TaxCenterDto from(TaxCenter c) {
            return new TaxCenterDto(c.getId(), c.getCode(), c.getName(), c.getAddress());
        }
    }
}
