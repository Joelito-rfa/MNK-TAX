package com.mnktax.debt.repository;

import com.mnktax.debt.entity.Penalty;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PenaltyRepository extends JpaRepository<Penalty, Long> {

    Optional<Penalty> findByCode(String code);
}
