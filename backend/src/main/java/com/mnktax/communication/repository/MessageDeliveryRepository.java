package com.mnktax.communication.repository;

import com.mnktax.communication.entity.DeliveryChannel;
import com.mnktax.communication.entity.DeliveryStatus;
import com.mnktax.communication.entity.MessageDelivery;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.Instant;
import java.util.List;

public interface MessageDeliveryRepository extends JpaRepository<MessageDelivery, Long> {

    List<MessageDelivery> findByMessageId(Long messageId);

    List<MessageDelivery> findByMessageIdAndChannel(
            Long messageId, com.mnktax.communication.entity.DeliveryChannel channel);

    /** Livraisons à traiter : en attente (jamais tentées ou retry échu), par lot. */
    @Query("SELECT d FROM MessageDelivery d WHERE d.status = :pending "
            + "AND (d.nextRetryAt IS NULL OR d.nextRetryAt <= :now) ORDER BY d.createdAt ASC")
    List<MessageDelivery> findDue(DeliveryStatus pending, Instant now, Pageable pageable);

    @Query("SELECT d FROM MessageDelivery d WHERE d.messageId IN "
            + "(SELECT m.id FROM com.mnktax.message.entity.Message m WHERE m.senderId = :senderId) "
            + "AND (:status IS NULL OR d.status = :status) ORDER BY d.createdAt DESC")
    org.springframework.data.domain.Page<MessageDelivery> findBySender(
            Long senderId, DeliveryStatus status,
            org.springframework.data.domain.Pageable pageable);

    long countByStatus(DeliveryStatus status);

    long countByChannelAndStatusIn(DeliveryChannel channel, java.util.List<DeliveryStatus> statuses);
}
