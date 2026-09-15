package com.mnktax.communication.repository;

import com.mnktax.communication.entity.CampaignRecipient;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CampaignRecipientRepository extends JpaRepository<CampaignRecipient, Long> {

    List<CampaignRecipient> findByCampaignId(Long campaignId);

    long countByCampaignIdAndStatus(Long campaignId, String status);

    long countByCampaignId(Long campaignId);
}
