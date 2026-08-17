package com.mnktax.tax.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "tax_rules", uniqueConstraints = @UniqueConstraint(name = "uk_tax_rule_code", columnNames = "code"),
        indexes = {
                @Index(name = "idx_rule_tax_type", columnList = "tax_type_id"),
                @Index(name = "idx_rule_effective", columnList = "effective_from, effective_to"),
                @Index(name = "idx_rule_active", columnList = "is_active")
        })
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TaxRule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 40)
    private String code;

    @Column(nullable = false, length = 200)
    private String name;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tax_type_id", nullable = false)
    private TaxType taxType;

    @Column(name = "taxpayer_type", length = 20)
    private String taxpayerType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "regime_id")
    private TaxRegime regime;

    @Column(name = "activity_code", length = 40)
    private String activityCode;

    @Enumerated(EnumType.STRING)
    @Column(name = "calculation_method", nullable = false, length = 30)
    private CalculationMethod calculationMethod;

    @Column(precision = 19, scale = 6)
    private BigDecimal rate;

    @Column(precision = 19, scale = 2)
    private BigDecimal minimum;

    @Column(precision = 19, scale = 2)
    private BigDecimal maximum;

    @Column(precision = 19, scale = 2)
    private BigDecimal deduction;

    @Column(precision = 19, scale = 2)
    private BigDecimal exemption;

    @Column(name = "legal_reference", length = 255)
    private String legalReference;

    @Column(name = "brackets", columnDefinition = "TEXT")
    private String brackets;

    @Column(name = "is_demo", nullable = false)
    private boolean demo;

    @Column(name = "effective_from", nullable = false)
    private LocalDate effectiveFrom;

    @Column(name = "effective_to")
    private LocalDate effectiveTo;

    @Column(name = "is_active", nullable = false)
    private boolean active;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "created_by", length = 100)
    private String createdBy;
}
