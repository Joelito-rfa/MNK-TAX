package com.mnktax.message.repository;

import com.mnktax.message.entity.MessageAttachment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MessageAttachmentRepository extends JpaRepository<MessageAttachment, Long> {

    List<MessageAttachment> findByMessageIdOrderByCreatedAtAsc(Long messageId);

    long countByMessageId(Long messageId);
}
