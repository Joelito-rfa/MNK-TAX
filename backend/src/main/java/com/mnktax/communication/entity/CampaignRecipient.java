package com.mnktax.communication.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/** Destinataire individuel d'une campagne, avec son statut d'envoi. */
@Entity
@Table(name = "campaign_recipients", indexes = {
        @Index(name = "idx_campaign_recipient_campaign", columnList = "campaign_id"),
        @Index(name = "idx_campaign_recipient_taxpayer", columnList = "taxpayer_id")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CampaignRecipient {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "campaign_id", nullable = false)
    private Long campaignId;

    @Column(name = "taxpayer_id")
    private Long taxpayerId;

    @Column(name = "user_id")
    private Long userId;

    /** PENDING | SENT | READ | FAILED */
    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = "PENDING";

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
}
