package com.mnktax.refund.entity;

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

@Entity
@Table(name = "refunds", indexes = {
        @Index(name = "idx_ref_taxpayer", columnList = "taxpayer_id"),
        @Index(name = "idx_ref_status", columnList = "status")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Refund {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 40)
    private String reference;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "taxpayer_id", nullable = false)
    private Taxpayer taxpayer;

    @Column(name = "debt_id")
    private Long debtId;

    @Column(name = "declaration_id")
    private Long declarationId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private RefundReason reason;

    private String description;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal amount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private RefundStatus status;

    @Column(name = "requested_by", length = 100)
    private String requestedBy;

    @Column(name = "reviewed_by", length = 100)
    private String reviewedBy;

    @Column(name = "reviewed_at")
    private Instant reviewedAt;

    @Column(name = "approved_amount", precision = 19, scale = 2)
    private BigDecimal approvedAmount;

    @Column(name = "payment_method", length = 20)
    private String paymentMethod;

    @Column(name = "payment_reference", length = 100)
    private String paymentReference;

    @Column(name = "paid_at")
    private Instant paidAt;

    @Column(name = "rejection_reason", length = 500)
    private String rejectionReason;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Version
    private Long version;
}
