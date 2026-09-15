package com.mnktax.message.repository;

import com.mnktax.message.entity.Message;
import com.mnktax.message.entity.MessageContextType;
import com.mnktax.message.entity.MessagePriority;
import com.mnktax.message.entity.MessageProcessingStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface MessageRepository extends JpaRepository<Message, Long> {

    Page<Message> findByRecipientIdOrderByCreatedAtDesc(Long recipientId, Pageable pageable);

    List<Message> findByRecipientIdAndReadFalse(Long recipientId);

    long countByRecipientIdAndReadFalse(Long recipientId);

    long countByRecipientIdAndArchivedAtIsNull(Long recipientId);

    long countByRecipientIdAndProcessingStatus(Long recipientId, MessageProcessingStatus status);

    long countByRecipientIdAndPriority(Long recipientId, MessagePriority priority);

    long countBySenderId(Long senderId);

    long countBySenderIdAndReadFalse(Long senderId);

    Page<Message> findBySenderIdOrderByCreatedAtDesc(Long senderId, Pageable pageable);

    List<Message> findByThreadIdOrderByCreatedAtAsc(Long threadId);

    long countByThreadId(Long threadId);

    long countByThreadIdAndReadFalse(Long threadId);

    Page<Message> findByRecipientIdAndArchivedAtIsNullOrderByCreatedAtDesc(Long recipientId, Pageable pageable);

    Page<Message> findByRecipientIdAndArchivedAtIsNotNullOrderByArchivedAtDesc(Long recipientId, Pageable pageable);

    @Modifying
    @Query("UPDATE Message m SET m.read = true, m.readAt = :now WHERE m.recipientId = :userId AND m.read = false")
    int markAllAsRead(@Param("userId") Long userId, @Param("now") java.time.Instant now);

    @Modifying
    @Query("UPDATE Message m SET m.read = true, m.readAt = :now WHERE m.threadId = :threadId AND m.recipientId = :userId AND m.read = false")
    int markThreadAsRead(@Param("threadId") Long threadId, @Param("userId") Long userId, @Param("now") java.time.Instant now);

    @Query("SELECT m FROM Message m LEFT JOIN com.mnktax.taxpayer.entity.Taxpayer tp ON tp.id = m.taxpayerId " +
           "WHERE m.recipientId = :userId AND m.archivedAt IS NULL AND " +
           "(:search IS NULL OR :search = '' OR " +
           "LOWER(m.subject) LIKE LOWER(CONCAT('%',:search,'%')) OR " +
           "LOWER(m.content) LIKE LOWER(CONCAT('%',:search,'%')) OR " +
           "LOWER(m.contextRef) LIKE LOWER(CONCAT('%',:search,'%')) OR " +
           "LOWER(m.senderName) LIKE LOWER(CONCAT('%',:search,'%')) OR " +
           "LOWER(tp.name) LIKE LOWER(CONCAT('%',:search,'%')) OR " +
           "LOWER(tp.nif) LIKE LOWER(CONCAT('%',:search,'%'))) AND " +
           "(:readStatus IS NULL OR :readStatus = '' OR " +
           "((:readStatus = 'UNREAD' AND m.read = false) OR (:readStatus = 'READ' AND m.read = true))) AND " +
           "(:processingStatus IS NULL OR :processingStatus = '' OR m.processingStatus = :processingStatus) AND " +
           "(:priority IS NULL OR m.priority = :priority) AND " +
           "(:contextType IS NULL OR m.contextType = :contextType) AND " +
           "(:taxpayerId IS NULL OR m.taxpayerId = :taxpayerId) " +
           "ORDER BY m.createdAt DESC")
    Page<Message> findByFilters(@Param("userId") Long userId,
                                @Param("search") String search,
                                @Param("readStatus") String readStatus,
                                @Param("processingStatus") String processingStatus,
                                @Param("priority") MessagePriority priority,
                                @Param("contextType") MessageContextType contextType,
                                @Param("taxpayerId") Long taxpayerId,
                                Pageable pageable);

    @Query("SELECT m FROM Message m LEFT JOIN com.mnktax.taxpayer.entity.Taxpayer tp ON tp.id = m.taxpayerId " +
           "WHERE m.senderId = :userId AND m.archivedAt IS NULL AND " +
           "(:search IS NULL OR :search = '' OR " +
           "LOWER(m.subject) LIKE LOWER(CONCAT('%',:search,'%')) OR " +
           "LOWER(m.content) LIKE LOWER(CONCAT('%',:search,'%')) OR " +
           "LOWER(m.contextRef) LIKE LOWER(CONCAT('%',:search,'%')) OR " +
           "LOWER(m.senderName) LIKE LOWER(CONCAT('%',:search,'%')) OR " +
           "LOWER(tp.name) LIKE LOWER(CONCAT('%',:search,'%')) OR " +
           "LOWER(tp.nif) LIKE LOWER(CONCAT('%',:search,'%'))) AND " +
           "(:processingStatus IS NULL OR :processingStatus = '' OR m.processingStatus = :processingStatus) AND " +
           "(:priority IS NULL OR m.priority = :priority) AND " +
           "(:contextType IS NULL OR m.contextType = :contextType) " +
           "ORDER BY m.createdAt DESC")
    Page<Message> findSentByFilters(@Param("userId") Long userId,
                                     @Param("search") String search,
                                     @Param("processingStatus") String processingStatus,
                                     @Param("priority") MessagePriority priority,
                                     @Param("contextType") MessageContextType contextType,
                                     Pageable pageable);

    List<Message> findBySenderIdAndRecipientIdAndThreadIdOrderByCreatedAtAsc(Long senderId, Long recipientId, Long threadId);

    // ─── Centre de communication (V29/V30) ──────────────────────

    Page<Message> findByStatusOrderByCreatedAtDesc(com.mnktax.communication.entity.MessageStatus status, Pageable pageable);

    long countByStatus(com.mnktax.communication.entity.MessageStatus status);

    long countByStatusIn(java.util.List<com.mnktax.communication.entity.MessageStatus> statuses);

    /** Envois du centre de communication (statuts agrégés), recherche plein texte simple. */
    @Query("SELECT m FROM Message m LEFT JOIN com.mnktax.taxpayer.entity.Taxpayer tp ON tp.id = m.taxpayerId " +
           "WHERE m.status IN (com.mnktax.communication.entity.MessageStatus.QUEUED, " +
           "com.mnktax.communication.entity.MessageStatus.SENDING, " +
           "com.mnktax.communication.entity.MessageStatus.SENT, " +
           "com.mnktax.communication.entity.MessageStatus.FAILED) " +
           "AND (:status IS NULL OR m.status = :status) " +
           "AND (:search IS NULL OR :search = '' OR " +
           "LOWER(m.subject) LIKE LOWER(CONCAT('%',:search,'%')) OR " +
           "LOWER(m.content) LIKE LOWER(CONCAT('%',:search,'%')) OR " +
           "LOWER(m.senderName) LIKE LOWER(CONCAT('%',:search,'%')) OR " +
           "LOWER(tp.name) LIKE LOWER(CONCAT('%',:search,'%')) OR " +
           "LOWER(tp.nif) LIKE LOWER(CONCAT('%',:search,'%'))) " +
           "ORDER BY m.createdAt DESC")
    Page<Message> findSentCommunication(@Param("status") com.mnktax.communication.entity.MessageStatus status,
                                        @Param("search") String search, Pageable pageable);

    /** Dernière communication automatique d'un contribuable (anti-doublon relances). */
    @Query("SELECT m FROM Message m WHERE m.taxpayerId = :taxpayerId " +
           "AND m.messageType = :messageType " +
           "AND m.status <> com.mnktax.communication.entity.MessageStatus.CANCELLED " +
           "AND m.createdAt >= :since " +
           "ORDER BY m.createdAt DESC")
    List<Message> findRecentAutomatic(@Param("taxpayerId") Long taxpayerId,
                                      @Param("messageType") String messageType,
                                      @Param("since") java.time.Instant since,
                                      Pageable pageable);
}
