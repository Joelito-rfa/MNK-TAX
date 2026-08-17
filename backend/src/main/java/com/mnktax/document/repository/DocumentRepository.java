package com.mnktax.document.repository;

import com.mnktax.document.entity.Document;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DocumentRepository extends JpaRepository<Document, Long> {

    List<Document> findByTaxpayerIdOrderByIdDesc(Long taxpayerId);
}
