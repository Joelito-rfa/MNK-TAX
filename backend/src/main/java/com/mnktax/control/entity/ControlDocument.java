package com.mnktax.control.entity;

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
@Table(name = "control_documents", indexes = {
        @Index(name = "idx_cd_control", columnList = "control_id")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ControlDocument {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "control_id", nullable = false)
    private TaxControl control;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(name = "document_type", length = 50)
    private String documentType;

    @Column(nullable = false)
    private Boolean requested;

    @Column(nullable = false)
    private Boolean received;

    @Column(length = 500)
    private String notes;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
}
