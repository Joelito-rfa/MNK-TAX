package com.mnktax.tax.entity;

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
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "tax_obligations", indexes = {
        @Index(name = "idx_obligation_taxpayer", columnList = "taxpayer_id"),
        @Index(name = "idx_obligation_status", columnList = "status")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TaxObligation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "taxpayer_id", nullable = false)
    private Taxpayer taxpayer;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tax_type_id", nullable = false)
    private TaxType taxType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tax_regime_id")
    private TaxRegime taxRegime;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tax_center_id")
    private TaxCenter taxCenter;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Periodicity periodicity;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Column(length = 10)
    private String period;

    @Column(name = "declaration_deadline")
    private LocalDate declarationDeadline;

    @Column(name = "payment_deadline")
    private LocalDate paymentDeadline;

    @Column(name = "expected_amount", precision = 19, scale = 2)
    private BigDecimal expectedAmount;

    @Enumerated(EnumType.STRING)
    @Column(name = "declaration_status", nullable = false, length = 20)
    private DeclarationObligationStatus declarationStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_status", nullable = false, length = 20)
    private PaymentObligationStatus paymentStatus;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ObligationStatus status;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;
}
