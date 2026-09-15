package com.mnktax.communication.entity;

/**
 * Cycle de vie réel d'une livraison, par canal.
 * PENDING → SENDING → SENT → DELIVERED → READ, ou FAILED (→ retry) / BOUNCED / CANCELLED.
 */
public enum DeliveryStatus {
    PENDING,
    SENDING,
    SENT,
    DELIVERED,
    READ,
    FAILED,
    BOUNCED,
    CANCELLED
}
