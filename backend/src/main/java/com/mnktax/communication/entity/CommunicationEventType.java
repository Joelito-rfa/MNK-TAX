package com.mnktax.communication.entity;

/**
 * Événements métier déclencheurs de communications automatiques.
 * Le moteur lit les règles (communication_event_rules) activées pour
 * chaque événement et génère les envois correspondants.
 */
public enum CommunicationEventType {
    DECLARATION_CREATED,
    DECLARATION_VALIDATED,
    DECLARATION_DUE_SOON,
    DECLARATION_OVERDUE,
    PAYMENT_RECEIVED,
    PAYMENT_FAILED,
    DEBT_CREATED,
    DEBT_OVERDUE,
    DEBT_OVERDUE_RELANCE,
    DEBT_OVERDUE_RELANCE_30,
    DEBT_OVERDUE_RELANCE_60,
    FORMAL_NOTICE,
    RECEIPT_GENERATED,
    INSTALLMENT_OVERDUE_J1,
    INSTALLMENT_OVERDUE_J3,
    INSTALLMENT_OVERDUE_J7
}
