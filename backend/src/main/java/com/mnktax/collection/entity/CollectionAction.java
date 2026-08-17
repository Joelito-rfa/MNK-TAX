package com.mnktax.collection.entity;

import com.mnktax.debt.entity.TaxDebt;
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

import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "collection_actions", indexes = {
        @Index(name = "idx_collection_debt", columnList = "debt_id"),
        @Index(name = "idx_collection_date", columnList = "action_date")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CollectionAction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "debt_id", nullable = false)
    private TaxDebt debt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private CollectionActionType type;

    @Column(nullable = false, length = 1000)
    private String description;

    @Column(name = "action_date", nullable = false)
    private LocalDate actionDate;

    @Column(length = 500)
    private String outcome;

    @Column(name = "responsible_user_id")
    private Long responsibleUserId;

    @Column(nullable = false, length = 20)
    private String status;

    @Column(name = "next_action", length = 500)
    private String nextAction;

    @Column(name = "next_action_date")
    private LocalDate nextActionDate;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
}
