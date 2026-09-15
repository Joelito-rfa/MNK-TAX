package com.mnktax.communication.entity;

/**
 * Statut d'envoi agrégé d'un message (calculé depuis ses deliveries).
 */
public enum MessageStatus {
    DRAFT,
    SCHEDULED,
    QUEUED,
    SENDING,
    SENT,
    PARTIAL,
    FAILED,
    CANCELLED
}
