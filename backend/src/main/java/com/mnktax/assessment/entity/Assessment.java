package com.mnktax.assessment.entity;

import com.mnktax.declaration.entity.Declaration;
import com.mnktax.tax.entity.TaxType;
import com.mnktax.taxpayer.entity.Taxpayer;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "assessments", indexes = {
        @Index(name = "idx_assessment_taxpayer", columnList = "taxpayer_id"),
        @Index(name = "idx_assessment_tax_type", columnList = "tax_type_id"),
        @Index(name = "idx_assessment_period", columnList = "period")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Assessment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 40)
    private String reference;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "declaration_id", nullable = false, unique = true)
    private Declaration declaration;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "taxpayer_id", nullable = false)
    private Taxpayer taxpayer;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tax_type_id", nullable = false)
    private TaxType taxType;

    @Column(nullable = false, length = 10)
    private String period;

    @Column(name = "tax_base", precision = 19, scale = 2)
    private BigDecimal taxBase;

    @Column(name = "gross_tax", precision = 19, scale = 2)
    private BigDecimal grossTax;

    @Column(precision = 19, scale = 2)
    private BigDecimal deduction;

    @Column(precision = 19, scale = 2)
    private BigDecimal credit;

    @Column(precision = 19, scale = 2)
    private BigDecimal adjustment;

    @Column(name = "net_tax", precision = 19, scale = 2)
    private BigDecimal netTax;

    @Column(name = "calculation_date", nullable = false)
    private LocalDate calculationDate;

    @Column(name = "rule_code", length = 40)
    private String ruleCode;

    @Column(name = "rule_version")
    private Integer ruleVersion;

    @Column(name = "computed_by", length = 100)
    private String computedBy;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Version
    private Long version;

    @OneToMany(mappedBy = "assessment", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<AssessmentLine> lines = new ArrayList<>();
}
