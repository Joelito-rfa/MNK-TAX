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

    @Query("SELECT m FROM Message m WHERE m.recipientId = :userId AND m.archivedAt IS NULL AND " +
           "(:search IS NULL OR :search = '' OR LOWER(m.subject) LIKE LOWER(CONCAT('%',:search,'%')) OR " +
           "LOWER(m.content) LIKE LOWER(CONCAT('%',:search,'%')) OR " +
           "LOWER(m.contextRef) LIKE LOWER(CONCAT('%',:search,'%')) OR " +
           "LOWER(m.senderName) LIKE LOWER(CONCAT('%',:search,'%'))) AND " +
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

    @Query("SELECT m FROM Message m WHERE m.senderId = :userId AND m.archivedAt IS NULL AND " +
           "(:search IS NULL OR :search = '' OR LOWER(m.subject) LIKE LOWER(CONCAT('%',:search,'%')) OR " +
           "LOWER(m.content) LIKE LOWER(CONCAT('%',:search,'%')) OR " +
           "LOWER(m.contextRef) LIKE LOWER(CONCAT('%',:search,'%')) OR " +
           "LOWER(m.senderName) LIKE LOWER(CONCAT('%',:search,'%'))) AND " +
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
}
