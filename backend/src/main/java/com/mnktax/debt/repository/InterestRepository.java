package com.mnktax.debt.repository;

import com.mnktax.debt.entity.Interest;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface InterestRepository extends JpaRepository<Interest, Long> {

    Optional<Interest> findByCode(String code);
}
