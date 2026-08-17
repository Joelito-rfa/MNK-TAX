package com.mnktax.notification.repository;

import com.mnktax.notification.entity.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.Optional;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    Page<Notification> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);

    long countByUserIdAndReadFalse(Long userId);

    Optional<Notification> findByUserIdAndEntityTypeAndEntityIdAndTypeAndCreatedAtAfter(
            Long userId, String entityType, String entityId, com.mnktax.notification.entity.NotificationType type,
            Instant after);
}
