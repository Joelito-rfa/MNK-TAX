package com.mnktax.collection.entity;

import com.mnktax.debt.entity.TaxDebt;
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
@Table(name = "collection_notices", indexes = {
        @Index(name = "idx_notice_debt", columnList = "debt_id"),
        @Index(name = "idx_notice_number", columnList = "notice_number")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CollectionNotice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "debt_id", nullable = false)
    private TaxDebt debt;

    @Column(name = "notice_number", nullable = false, length = 40)
    private String noticeNumber;

    @Column(name = "notice_date", nullable = false)
    private LocalDate noticeDate;

    @Column(name = "notice_type", nullable = false, length = 30)
    private String noticeType;

    @Column(length = 2000)
    private String content;

    @Column(name = "sent_at")
    private Instant sentAt;

    @Column(nullable = false, length = 20)
    private String status;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
}
