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
@Table(name = "declaration_histories", indexes = {
        @Index(name = "idx_hist_decl", columnList = "declaration_id")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DeclarationHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "declaration_id", nullable = false)
    private Declaration declaration;

    @Column(name = "user_id")
    private Long userId;

    @Column(length = 100)
    private String username;

    @Column(nullable = false, length = 50)
    private String action;

    @Column(name = "ancien_statut", length = 30)
    private String ancienStatut;

    @Column(name = "nouveau_statut", length = 30)
    private String nouveauStatut;

    @Column(columnDefinition = "TEXT")
    private String commentaire;

    @Column(name = "anciennes_donnees", columnDefinition = "TEXT")
    private String anciennesDonnees;

    @Column(name = "nouvelles_donnees", columnDefinition = "TEXT")
    private String nouvellesDonnees;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
}
