package com.mnktax.control.repository;

import com.mnktax.control.entity.ControlDocument;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ControlDocumentRepository extends JpaRepository<ControlDocument, Long> {
    List<ControlDocument> findByControlIdOrderByCreatedAt(Long controlId);
}
