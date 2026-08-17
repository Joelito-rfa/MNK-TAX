package com.mnktax.audit.service;

import com.mnktax.audit.repository.AuditLogRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

/**
 * Conservation des logs : les logs antérieurs à la durée de rétention
 * configurée sont purgés automatiquement (les utilisateurs normaux ne
 * peuvent jamais les supprimer via l'API).
 */
@Service
public class AuditRetentionService {

    private static final Logger log = LoggerFactory.getLogger(AuditRetentionService.class);

    private final AuditLogRepository auditLogRepository;

    public AuditRetentionService(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    @Scheduled(cron = "${mnk-tax.audit.retention-cron:0 30 2 * * *}")
    @Transactional
    public void purgeOldLogs() {
        Instant cutoff = Instant.now().minusSeconds(365L * 5 * 24 * 3600);
        long removed = auditLogRepository.deleteByCreatedAtBefore(cutoff);
        if (removed > 0) {
            log.info("{} logs d'audit purgés (antérieurs à {})", removed, cutoff);
        }
    }
}
