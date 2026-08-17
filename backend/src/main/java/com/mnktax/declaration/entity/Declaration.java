package com.mnktax.declaration.entity;

import com.mnktax.tax.entity.TaxCenter;
import com.mnktax.tax.entity.TaxType;
import com.mnktax.taxpayer.entity.Taxpayer;
import jakarta.persistence.CascadeType;
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
import jakarta.persistence.OneToMany;
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
@Table(name = "declarations", indexes = {
        @Index(name = "idx_declaration_taxpayer", columnList = "taxpayer_id"),
        @Index(name = "idx_declaration_tax_type", columnList = "tax_type_id"),
        @Index(name = "idx_declaration_status", columnList = "status"),
        @Index(name = "idx_declaration_period", columnList = "period")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Declaration {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 40)
    private String reference;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "taxpayer_id", nullable = false)
    private Taxpayer taxpayer;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tax_type_id", nullable = false)
    private TaxType taxType;

    @Column(nullable = false, length = 10)
    private String period;

    @Column(length = 10)
    private String exercice;

    @Column(length = 30)
    private String regime;

    @Column(name = "submission_date")
    private LocalDate submissionDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private DeclarationStatus status;

    @Column(name = "tax_base", precision = 19, scale = 2)
    private BigDecimal taxBase;

    @Column(name = "declared_amount", precision = 19, scale = 2)
    private BigDecimal declaredAmount;

    @Column(precision = 19, scale = 6)
    private BigDecimal taux;

    @Column(name = "calculated_tax", precision = 19, scale = 2)
    private BigDecimal calculatedTax;

    @Column(precision = 19, scale = 2)
    private BigDecimal penalites;

    @Column(name = "total_a_payer", precision = 19, scale = 2)
    private BigDecimal totalAPayer;

    @Column(name = "montant_paye", precision = 19, scale = 2)
    @Builder.Default
    private BigDecimal montantPaye = BigDecimal.ZERO;

    @Column(name = "reste_a_payer", precision = 19, scale = 2)
    private BigDecimal resteAPayer;

    @Column(name = "date_echeance")
    private LocalDate dateEcheance;

    @Column(name = "due_date")
    private LocalDate dueDate;

    @Column(nullable = false)
    @Builder.Default
    private boolean rectificative = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "declaration_origine_id")
    private Declaration declarationOrigine;

    @Column(name = "motif_correction", columnDefinition = "TEXT")
    private String motifCorrection;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tax_center_id")
    private TaxCenter taxCenter;

    @Column(name = "submitted_by", length = 100)
    private String submittedBy;

    @Column(name = "submitted_at")
    private Instant submittedAt;

    @Column(name = "validated_by", length = 100)
    private String validatedBy;

    @Column(name = "validated_at")
    private Instant validatedAt;

    @Column(name = "validation_comment", length = 500)
    private String validationComment;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Version
    private Long version;

    @OneToMany(mappedBy = "declaration", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<DeclarationLine> lines = new ArrayList<>();

    @OneToMany(mappedBy = "declaration", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<DeclarationAnnexe> annexes = new ArrayList<>();

    @OneToMany(mappedBy = "declaration", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<DeclarationHistory> history = new ArrayList<>();
}
