package com.mnktax.auth.repository;

import com.mnktax.auth.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    @EntityGraph(attributePaths = "roles.permissions")
    Optional<User> findByUsername(String username);

    @EntityGraph(attributePaths = "roles.permissions")
    Optional<User> findByEmail(String email);

    boolean existsByUsername(String username);

    boolean existsByEmail(String email);

    @Modifying
    @Query("UPDATE User u SET u.lastLoginAt = :now WHERE u.id = :id")
    void updateLastLogin(@Param("id") Long id, @Param("now") Instant now);

    @EntityGraph(attributePaths = "roles.permissions")
    @Query("SELECT u FROM User u WHERE " +
           "(:q IS NULL OR :q = '' OR " +
           "LOWER(u.username) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
           "LOWER(u.firstName) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
           "LOWER(u.lastName) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
           "LOWER(u.email) LIKE LOWER(CONCAT('%', :q, '%')))")
    Page<User> search(@Param("q") String q, Pageable pageable);
}
