package com.mnktax.assessment.repository;

import com.mnktax.assessment.entity.AssessmentHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AssessmentHistoryRepository extends JpaRepository<AssessmentHistory, Long> {
    List<AssessmentHistory> findByAssessmentIdOrderByCreatedAtAsc(Long assessmentId);
}
