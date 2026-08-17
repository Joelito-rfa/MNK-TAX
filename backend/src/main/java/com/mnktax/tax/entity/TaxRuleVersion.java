package com.mnktax.tax.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "tax_rule_versions", indexes = {
        @Index(name = "idx_rule_version_rule", columnList = "rule_id"),
        @Index(name = "idx_rule_version_number", columnList = "rule_id, version_number")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TaxRuleVersion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "rule_id", nullable = false)
    private TaxRule rule;

    @Column(name = "version_number", nullable = false)
    private int versionNumber;

    @Column(name = "snapshot", columnDefinition = "TEXT", nullable = false)
    private String snapshot;

    @Column(length = 500)
    private String reason;

    @Column(name = "changed_by", length = 100)
    private String changedBy;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
}
