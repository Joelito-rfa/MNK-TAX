package com.mnktax.debt.entity;

import com.mnktax.assessment.entity.Assessment;
import com.mnktax.tax.entity.TaxType;
import com.mnktax.taxpayer.entity.Taxpayer;
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
import jakarta.persistence.Version;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "tax_debts", indexes = {
        @Index(name = "idx_debt_taxpayer", columnList = "taxpayer_id"),
        @Index(name = "idx_debt_status", columnList = "status"),
        @Index(name = "idx_debt_due_date", columnList = "due_date"),
        @Index(name = "idx_debt_assessment", columnList = "assessment_id"),
        @Index(name = "idx_debt_origin", columnList = "origin"),
        @Index(name = "idx_debt_priority", columnList = "collection_priority"),
        @Index(name = "idx_debt_center", columnList = "taxpayer_center")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TaxDebt {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 40)
    private String reference;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "taxpayer_id", nullable = false)
    private Taxpayer taxpayer;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "assessment_id", nullable = false)
    private Assessment assessment;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tax_type_id", nullable = false)
    private TaxType taxType;

    @Column(nullable = false, length = 10)
    private String period;

    @Column(name = "principal_amount", nullable = false, precision = 19, scale = 2)
    private BigDecimal principalAmount;

    @Column(name = "penalty_amount", nullable = false, precision = 19, scale = 2)
    private BigDecimal penaltyAmount;

    @Column(name = "interest_amount", nullable = false, precision = 19, scale = 2)
    private BigDecimal interestAmount;

    @Column(name = "adjustments_amount", nullable = false, precision = 19, scale = 2)
    private BigDecimal adjustmentsAmount;

    @Column(name = "credits_amount", nullable = false, precision = 19, scale = 2)
    private BigDecimal creditsAmount;

    @Column(name = "total_amount", nullable = false, precision = 19, scale = 2)
    private BigDecimal totalAmount;

    @Column(name = "paid_amount", nullable = false, precision = 19, scale = 2)
    private BigDecimal paidAmount;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal balance;

    @Column(name = "issue_date", nullable = false)
    private LocalDate issueDate;

    @Column(name = "due_date", nullable = false)
    private LocalDate dueDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private DebtStatus status;

    @Enumerated(EnumType.STRING)
    @Column(name = "origin", nullable = false, length = 30)
    private DebtOrigin origin;

    @Enumerated(EnumType.STRING)
    @Column(name = "collection_priority", nullable = false, length = 15)
    private DebtCollectionPriority collectionPriority;

    @Column(name = "observations")
    private String observations;

    @Column(name = "created_by", length = 100)
    private String createdBy;

    @Column(name = "last_due_date")
    private LocalDate lastDueDate;

    @Column(name = "suspended_at")
    private Instant suspendedAt;

    @Column(name = "taxpayer_center", length = 40)
    private String taxpayerCenter;

    @Column(name = "closed_at")
    private Instant closedAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Version
    private Long version;
}
