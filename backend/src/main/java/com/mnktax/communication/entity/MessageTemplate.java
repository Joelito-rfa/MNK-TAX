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

/**
 * Modèle de message fiscal multilingue (FR / MG / EN — jamais de mélange).
 * Variables au format {{taxpayer_name}}, {{amount}}, …
 */
@Entity
@Table(name = "message_templates", indexes = {
        @Index(name = "idx_template_category", columnList = "category")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MessageTemplate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 60, unique = true)
    private String code;

    /** DECLARATION | COLLECTION | PAYMENT | GENERAL | … */
    @Column(nullable = false, length = 30)
    private String category;

    /** Canaux par défaut : "IN_APP,EMAIL,SMS". */
    @Column(nullable = false, length = 100)
    private String channels;

    @Column(name = "subject_fr", length = 200)
    private String subjectFr;

    @Column(name = "subject_mg", length = 200)
    private String subjectMg;

    @Column(name = "subject_en", length = 200)
    private String subjectEn;

    @Column(name = "body_fr", nullable = false, columnDefinition = "TEXT")
    private String bodyFr;

    @Column(name = "body_mg", nullable = false, columnDefinition = "TEXT")
    private String bodyMg;

    @Column(name = "body_en", nullable = false, columnDefinition = "TEXT")
    private String bodyEn;

    @Column(name = "sms_body_fr", length = 320)
    private String smsBodyFr;

    @Column(name = "sms_body_mg", length = 320)
    private String smsBodyMg;

    @Column(name = "sms_body_en", length = 320)
    private String smsBodyEn;

    @Column(nullable = false)
    private boolean enabled;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    /** Langue cible → sujet du modèle. */
    public String subjectFor(String language) {
        return switch (language == null ? "FR" : language.toUpperCase()) {
            case "MG" -> subjectMg != null ? subjectMg : subjectFr;
            case "EN" -> subjectEn != null ? subjectEn : subjectFr;
            default -> subjectFr;
        };
    }

    /** Langue cible → corps du modèle (email / notification). */
    public String bodyFor(String language) {
        return switch (language == null ? "FR" : language.toUpperCase()) {
            case "MG" -> bodyMg != null ? bodyMg : bodyFr;
            case "EN" -> bodyEn != null ? bodyEn : bodyFr;
            default -> bodyFr;
        };
    }

    /** Langue cible → version SMS courte (fallback : corps email tronqué). */
    public String smsBodyFor(String language) {
        String sms = switch (language == null ? "FR" : language.toUpperCase()) {
            case "MG" -> smsBodyMg != null ? smsBodyMg : (smsBodyFr != null ? smsBodyFr : bodyMg);
            case "EN" -> smsBodyEn != null ? smsBodyEn : (smsBodyFr != null ? smsBodyFr : bodyEn);
            default -> smsBodyFr != null ? smsBodyFr : bodyFr;
        };
        if (sms == null) return null;
        return sms.length() > 320 ? sms.substring(0, 317) + "..." : sms;
    }
}
