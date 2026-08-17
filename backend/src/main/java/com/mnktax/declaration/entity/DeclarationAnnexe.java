package com.mnktax.declaration.entity;

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
@Table(name = "declaration_annexes", indexes = {
        @Index(name = "idx_annex_decl", columnList = "declaration_id")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DeclarationAnnexe {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "declaration_id", nullable = false)
    private Declaration declaration;

    @Column(nullable = false, length = 255)
    private String nom;

    @Column(nullable = false, length = 500)
    private String fichier;

    @Column(name = "type_mime", length = 100)
    private String typeMime;

    @Column
    private Long taille;

    @Column(length = 50)
    @Builder.Default
    private String categorie = "GENERAL";

    @Column(nullable = false)
    @Builder.Default
    private boolean obligatoire = false;

    @Column(name = "uploaded_by", length = 100)
    private String uploadedBy;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
}
