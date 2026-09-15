package com.mnktax.communication.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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

/**
 * Règle d'automatisation configurable : événement métier → modèle → canaux.
 * dayOffset permet les relances échelonnées (J-3, J+1, J+7, J+15…).
 * Configuration métier — ces délais ne vivent jamais dans le frontend.
 */
@Entity
@Table(name = "communication_event_rules", indexes = {
        @Index(name = "idx_event_rule_type", columnList = "event_type, enabled")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CommunicationEventRule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", nullable = false, length = 60)
    private CommunicationEventType eventType;

    @Column(name = "template_code", nullable = false, length = 60)
    private String templateCode;

    /** Canaux cibles : "IN_APP,EMAIL,SMS". */
    @Column(nullable = false, length = 100)
    private String channels;

    /** LOW | NORMAL | HIGH | URGENT */
    @Column(nullable = false, length = 20)
    @Builder.Default
    private String priority = "NORMAL";

    /** Décalage en jours (J-3 → -3, J+7 → 7), null = immédiat. */
    @Column(name = "day_offset")
    private Integer dayOffset;

    @Column(nullable = false)
    private boolean enabled;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
