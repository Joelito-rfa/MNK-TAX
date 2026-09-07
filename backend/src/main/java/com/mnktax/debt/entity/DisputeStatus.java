package com.mnktax.debt.entity;

/**
 * Statut d'un litige sur une créance.
 * Seul un agent autorisé peut rendre une décision : aucune résolution
 * automatique n'existe.
 */
public enum DisputeStatus {
    OPEN,
    RESOLVED
}
