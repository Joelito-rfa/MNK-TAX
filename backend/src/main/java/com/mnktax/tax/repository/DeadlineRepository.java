package com.mnktax.tax.repository;

import com.mnktax.tax.entity.Deadline;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface DeadlineRepository extends JpaRepository<Deadline, Long> {

    Optional<Deadline> findByTaxTypeIdAndPeriod(Long taxTypeId, String period);

    List<Deadline> findByDeclarationDeadlineGreaterThanEqualOrderByDeclarationDeadlineAsc(LocalDate from);

    List<Deadline> findByPaymentDeadlineGreaterThanEqualOrderByPaymentDeadlineAsc(LocalDate from);

    List<Deadline> findAllByOrderByDeclarationDeadlineAsc();
}
