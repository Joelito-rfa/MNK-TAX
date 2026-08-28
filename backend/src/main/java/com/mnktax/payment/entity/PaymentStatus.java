package com.mnktax.payment.entity;

public enum PaymentStatus {
    PENDING,
    CONFIRMED,
    ALLOCATED,
    PARTIALLY_ALLOCATED,
    REJECTED,
    CANCELLED,
    REFUNDED
}
