package com.mnktax.control.entity;

import com.mnktax.debt.entity.TaxDebt;
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
@Table(name = "tax_controls", indexes = {
        @Index(name = "idx_tc_taxpayer", columnList = "taxpayer_id"),
        @Index(name = "idx_tc_status", columnList = "status"),
        @Index(name = "idx_tc_agent", columnList = "agent_id")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TaxControl {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 40)
    private String reference;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "taxpayer_id", nullable = false)
    private Taxpayer taxpayer;

    @Column(name = "agent_id")
    private Long agentId;

    @Enumerated(EnumType.STRING)
    @Column(name = "control_type", nullable = false, length = 30)
    private ControlType controlType;

    @Column(name = "period_start", nullable = false)
    private LocalDate periodStart;

    @Column(name = "period_end", nullable = false)
    private LocalDate periodEnd;

    @Column(nullable = false, length = 500)
    private String reason;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ControlStatus status;

    @Column(name = "started_at")
    private Instant startedAt;

    @Column(name = "completed_at")
    private Instant completedAt;

    private String observations;

    private String anomalies;

    @Column(precision = 19, scale = 2)
    private BigDecimal redressement;

    @Column(name = "penalty_amount", precision = 19, scale = 2)
    private BigDecimal penaltyAmount;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "debt_id")
    private TaxDebt debt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Version
    private Long version;
}
