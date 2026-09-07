package com.mnktax.auth.repository;

import com.mnktax.auth.entity.RegistrationRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface RegistrationRequestRepository extends JpaRepository<RegistrationRequest, Long> {

    boolean existsByEmailAndStatus(String email, String status);

    Optional<RegistrationRequest> findByEmailAndStatus(String email, String status);

    Page<RegistrationRequest> findByStatus(String status, Pageable pageable);

    Optional<RegistrationRequest> findByReference(String reference);

    long countByStatus(String status);

    @Query("""
            SELECT r FROM RegistrationRequest r
            WHERE (:status IS NULL OR r.status = :status)
              AND (:type IS NULL OR r.requestType = :type)
              AND (:q IS NULL OR :q = '' OR
                    LOWER(r.reference) LIKE LOWER(CONCAT('%', :q, '%'))
                    OR LOWER(r.name) LIKE LOWER(CONCAT('%', :q, '%'))
                    OR LOWER(r.firstName) LIKE LOWER(CONCAT('%', :q, '%'))
                    OR LOWER(r.lastName) LIKE LOWER(CONCAT('%', :q, '%'))
                    OR LOWER(r.email) LIKE LOWER(CONCAT('%', :q, '%'))
                    OR LOWER(r.phone) LIKE LOWER(CONCAT('%', :q, '%'))
                    OR LOWER(r.nif) LIKE LOWER(CONCAT('%', :q, '%'))
                    OR LOWER(r.organization) LIKE LOWER(CONCAT('%', :q, '%'))
              )
            ORDER BY r.createdAt DESC
            """)
    Page<RegistrationRequest> search(
            @Param("status") String status,
            @Param("type") String type,
            @Param("q") String q,
            Pageable pageable);
}
