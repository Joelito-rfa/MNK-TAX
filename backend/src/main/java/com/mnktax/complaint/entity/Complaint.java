package com.mnktax.complaint.entity;

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

import java.time.Instant;

@Entity
@Table(name = "complaints", indexes = {
        @Index(name = "idx_cmpl_taxpayer", columnList = "taxpayer_id"),
        @Index(name = "idx_cmpl_status", columnList = "status"),
        @Index(name = "idx_cmpl_context", columnList = "context_type, context_ref")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Complaint {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 40)
    private String reference;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "taxpayer_id", nullable = false)
    private Taxpayer taxpayer;

    @Column(nullable = false, length = 200)
    private String subject;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "context_type", nullable = false, length = 30)
    private ContextType contextType;

    @Column(name = "context_ref", length = 40)
    private String contextRef;

    @Column(name = "declaration_id")
    private Long declarationId;

    @Column(name = "debt_id")
    private Long debtId;

    @Column(name = "payment_id")
    private Long paymentId;

    @Column(name = "control_id")
    private Long controlId;

    @Column(name = "refund_id")
    private Long refundId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ComplaintStatus status;

    @Column(name = "assigned_to")
    private Long assignedTo;

    private String resolution;

    @Column(name = "resolved_at")
    private Instant resolvedAt;

    @Column(name = "closed_at")
    private Instant closedAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Version
    private Long version;
}
