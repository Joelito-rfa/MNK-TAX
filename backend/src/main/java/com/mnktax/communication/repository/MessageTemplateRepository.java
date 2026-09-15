package com.mnktax.communication.repository;

import com.mnktax.communication.entity.MessageTemplate;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface MessageTemplateRepository extends JpaRepository<MessageTemplate, Long> {

    Optional<MessageTemplate> findByCode(String code);

    List<MessageTemplate> findByEnabledTrueOrderByCategoryAscCodeAsc();
}
