package com.mnktax.auth.repository;

import com.mnktax.auth.entity.RegistrationRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface RegistrationRequestRepository extends JpaRepository<RegistrationRequest, Long> {

    boolean existsByEmailAndStatus(String email, String status);

    Optional<RegistrationRequest> findByEmailAndStatus(String email, String status);

    Page<RegistrationRequest> findByStatus(String status, Pageable pageable);
}
