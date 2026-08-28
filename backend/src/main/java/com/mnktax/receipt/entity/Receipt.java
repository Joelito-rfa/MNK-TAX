package com.mnktax.receipt.entity;

import com.mnktax.declaration.entity.Declaration;
import com.mnktax.debt.entity.TaxDebt;
import com.mnktax.payment.entity.Payment;
import com.mnktax.payment.entity.PaymentMethod;
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
import jakarta.persistence.OneToOne;
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
@Table(name = "receipts", indexes = {
        @Index(name = "idx_receipt_taxpayer", columnList = "taxpayer_id"),
        @Index(name = "idx_receipt_number", columnList = "receipt_number"),
        @Index(name = "idx_receipt_created", columnList = "issued_at"),
        @Index(name = "idx_receipt_verification_token", columnList = "verification_token"),
        @Index(name = "idx_receipt_payment", columnList = "payment_id"),
        @Index(name = "idx_receipt_declaration", columnList = "declaration_id"),
        @Index(name = "idx_receipt_debt", columnList = "debt_id"),
        @Index(name = "idx_receipt_status", columnList = "status")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Receipt {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 40)
    private String reference;

    @Column(name = "verification_token", nullable = false, unique = true, length = 64)
    private String verificationToken;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "payment_id", nullable = false)
    private Payment payment;

    @Column(name = "receipt_number", nullable = false, length = 40)
    private String receiptNumber;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "taxpayer_id", nullable = false)
    private Taxpayer taxpayer;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tax_type_id", nullable = false)
    private TaxType taxType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "declaration_id")
    private Declaration declaration;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "debt_id")
    private TaxDebt debt;

    @Column(nullable = false, length = 10)
    private String period;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal amount;

    @Column(length = 3)
    private String currency;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PaymentMethod method;

    @Column(name = "transaction_reference", length = 100)
    private String transactionReference;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ReceiptStatus status;

    @Column(name = "qr_code_path", length = 255)
    private String qrCodePath;

    @Column(name = "pdf_path", length = 500)
    private String pdfPath;

    @Column(name = "download_count")
    @Builder.Default
    private int downloadCount = 0;

    @Column(name = "payment_date")
    private LocalDate paymentDate;

    @Column(name = "center_code", length = 40)
    private String centerCode;

    @Column(name = "created_by", length = 100)
    private String createdBy;

    @Column(name = "issued_at", nullable = false)
    private Instant issuedAt;

    @Column(name = "verified_at")
    private Instant verifiedAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    /* ── Annulation ── */
    @Column(name = "cancelled_reason", length = 1000)
    private String cancelledReason;

    @Column(name = "cancelled_by", length = 100)
    private String cancelledBy;

    @Column(name = "cancelled_at")
    private Instant cancelledAt;

    /* ── Remplacement ── */
    @Column(name = "replaced_by_reference", length = 40)
    private String replacedByReference;

    @Column(name = "replaced_at")
    private Instant replacedAt;

    /* ── Remboursement ── */
    @Column(name = "refund_reference", length = 40)
    private String refundReference;
}
