package com.mnktax.paymentplan.entity;

/**
 * Statut d'une tranche d'échéancier.
 * Le passage en OVERDUE résulte de la détection quotidienne d'une tranche
 * échue non soldée — jamais d'un seuil juridique inventé.
 */
public enum InstallmentStatus {
    PENDING,
    PARTIALLY_PAID,
    PAID,
    OVERDUE,
    CANCELLED
}
