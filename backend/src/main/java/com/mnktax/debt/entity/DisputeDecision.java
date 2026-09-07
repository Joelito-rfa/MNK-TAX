package com.mnktax.debt.entity;

/**
 * Décision rendue par un agent autorisé sur un litige.
 * SUSTAINED : contestation admise (une régularisation / annulation de la
 * part contestée doit ensuite être effectuée par une action explicite) ;
 * REJECTED : contestation écartée ; WITHDRAWN : retirée par le contribuable.
 */
public enum DisputeDecision {
    SUSTAINED,
    REJECTED,
    WITHDRAWN
}
