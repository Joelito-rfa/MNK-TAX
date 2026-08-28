package com.mnktax.complaint.repository;

import com.mnktax.complaint.entity.ComplaintResponse;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ComplaintResponseRepository extends JpaRepository<ComplaintResponse, Long> {
    List<ComplaintResponse> findByComplaintIdOrderByCreatedAt(Long complaintId);
}
