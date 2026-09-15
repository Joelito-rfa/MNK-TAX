package com.mnktax.communication.repository;

import com.mnktax.communication.entity.CommunicationEventRule;
import com.mnktax.communication.entity.CommunicationEventType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CommunicationEventRuleRepository extends JpaRepository<CommunicationEventRule, Long> {

    List<CommunicationEventRule> findByEventTypeAndEnabledTrue(CommunicationEventType eventType);

    List<CommunicationEventRule> findAllByOrderByEventTypeAsc();
}
