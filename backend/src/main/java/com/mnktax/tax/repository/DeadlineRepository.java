package com.mnktax.tax.repository;

import com.mnktax.tax.entity.Deadline;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface DeadlineRepository extends JpaRepository<Deadline, Long> {

    Optional<Deadline> findByTaxTypeIdAndPeriod(Long taxTypeId, String period);

    @Query("SELECT d FROM Deadline d LEFT JOIN FETCH d.taxType WHERE d.declarationDeadline >= :from ORDER BY d.declarationDeadline ASC")
    List<Deadline> findUpcoming(@Param("from") LocalDate from);

    @Query("SELECT d FROM Deadline d LEFT JOIN FETCH d.taxType ORDER BY d.declarationDeadline ASC")
    List<Deadline> findAllFetchTaxType();
}
