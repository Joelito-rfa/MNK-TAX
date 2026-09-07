package com.mnktax.paymentplan.entity;

/**
 * Statut d'un échéancier (plan de paiement).
 * COMPLETED et CANCELLED sont les états terminaux.
 */
public enum PaymentPlanStatus {
    ACTIVE,
    COMPLETED,
    CANCELLED
}
