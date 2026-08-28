package com.mnktax.complaint.repository;

import com.mnktax.complaint.entity.Complaint;
import com.mnktax.complaint.entity.ComplaintStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface ComplaintRepository extends JpaRepository<Complaint, Long> {

    Optional<Complaint> findByReference(String reference);

    @Query("SELECT c FROM Complaint c " +
            "WHERE (:status IS NULL OR c.status = :status) " +
            "AND (:taxpayerId IS NULL OR c.taxpayer.id = :taxpayerId) " +
            "AND (:contextType IS NULL OR c.contextType = :contextType) " +
            "AND (:q IS NULL OR LOWER(c.subject) LIKE LOWER(CONCAT('%',:q,'%')) " +
            "OR LOWER(c.reference) LIKE LOWER(CONCAT('%',:q,'%')))")
    Page<Complaint> search(@Param("status") ComplaintStatus status,
                           @Param("taxpayerId") Long taxpayerId,
                           @Param("contextType") String contextType,
                           @Param("q") String q,
                           Pageable pageable);

    long countByStatus(ComplaintStatus status);
}
