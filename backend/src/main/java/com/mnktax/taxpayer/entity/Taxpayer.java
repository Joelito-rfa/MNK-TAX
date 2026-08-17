package com.mnktax.taxpayer.entity;

import com.mnktax.tax.entity.TaxCenter;
import com.mnktax.tax.entity.TaxRegime;
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

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "taxpayers", indexes = {
        @Index(name = "idx_taxpayer_nif", columnList = "nif"),
        @Index(name = "idx_taxpayer_name", columnList = "name"),
        @Index(name = "idx_taxpayer_status", columnList = "status")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Taxpayer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 10)
    private String nif;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TaxpayerType type;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(name = "business_name", length = 200)
    private String businessName;

    @Column(name = "first_name", length = 80)
    private String firstName;

    @Column(name = "last_name", length = 80)
    private String lastName;

    @Column(length = 30)
    private String phone;

    @Column(length = 120)
    private String email;

    @Column(length = 255)
    private String address;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TaxpayerStatus status;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tax_center_id")
    private TaxCenter taxCenter;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tax_regime_id")
    private TaxRegime taxRegime;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Version
    private Long version;

    @OneToMany(mappedBy = "taxpayer", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<TaxpayerAddress> addresses = new ArrayList<>();

    @OneToMany(mappedBy = "taxpayer", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<TaxpayerActivity> activities = new ArrayList<>();
}
