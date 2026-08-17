package com.mnktax.administration.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "system_parameters", uniqueConstraints = @UniqueConstraint(name = "uk_parameter_key", columnNames = "param_key"),
        indexes = @Index(name = "idx_parameter_category", columnList = "category"))
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SystemParameter {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "param_key", nullable = false, length = 100)
    private String key;

    @Column(name = "param_value", nullable = false, length = 500)
    private String value;

    @Column(length = 500)
    private String description;

    @Column(length = 50)
    private String category;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
