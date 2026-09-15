package com.mnktax.communication.entity;

/**
 * Canaux du centre de communication. IN_APP est la lettre du message
 * MNK-TAX ; EMAIL et SMS sont des livraisons réelles tracées dans
 * message_deliveries.
 */
public enum CommunicationChannel {
    IN_APP,
    EMAIL,
    SMS
}
