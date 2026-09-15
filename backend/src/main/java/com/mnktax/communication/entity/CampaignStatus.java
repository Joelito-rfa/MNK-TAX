package com.mnktax.communication.entity;

/** Cycle de vie d'une campagne. */
public enum CampaignStatus {
    QUEUED,
    SENDING,
    COMPLETED,
    FAILED,
    CANCELLED
}
