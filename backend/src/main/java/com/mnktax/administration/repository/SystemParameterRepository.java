package com.mnktax.administration.repository;

import com.mnktax.administration.entity.SystemParameter;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SystemParameterRepository extends JpaRepository<SystemParameter, Long> {

    Optional<SystemParameter> findByKey(String key);

    boolean existsByKey(String key);

    List<SystemParameter> findAllByOrderByCategoryAscKeyAsc();
}
