package com.mnktax.receipt.repository;

import com.mnktax.receipt.entity.Receipt;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ReceiptRepository extends JpaRepository<Receipt, Long> {

    Optional<Receipt> findByReference(String reference);

    Optional<Receipt> findByReceiptNumber(String receiptNumber);

    Optional<Receipt> findByPaymentId(Long paymentId);

    @Query("""
            SELECT r FROM Receipt r
            LEFT JOIN r.taxpayer t
            WHERE (:taxpayerId IS NULL OR r.taxpayer.id = :taxpayerId)
              AND (:q IS NULL OR LOWER(r.reference) LIKE LOWER(CONCAT('%', :q, '%'))
                    OR LOWER(r.receiptNumber) LIKE LOWER(CONCAT('%', :q, '%'))
                    OR LOWER(t.nif) LIKE LOWER(CONCAT('%', :q, '%')))
            """)
    Page<Receipt> search(@Param("taxpayerId") Long taxpayerId,
                         @Param("q") String q,
                         Pageable pageable);

    List<Receipt> findByTaxpayerIdOrderByIdDesc(Long taxpayerId);

    long countByTaxpayerId(Long taxpayerId);
}
