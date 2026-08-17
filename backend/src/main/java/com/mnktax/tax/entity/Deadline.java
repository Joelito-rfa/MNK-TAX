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
import java.time.LocalDate;

@Entity
@Table(name = "deadlines", indexes = {
        @Index(name = "idx_deadline_tax_type", columnList = "tax_type_id"),
        @Index(name = "idx_deadline_period", columnList = "period")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Deadline {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tax_type_id", nullable = false)
    private TaxType taxType;

    @Column(nullable = false, length = 10)
    private String period;

    @Column(name = "declaration_deadline", nullable = false)
    private LocalDate declarationDeadline;

    @Column(name = "payment_deadline", nullable = false)
    private LocalDate paymentDeadline;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
}
