package com.mnktax.receipt.repository;

import com.mnktax.payment.entity.PaymentMethod;
import com.mnktax.receipt.entity.Receipt;
import com.mnktax.receipt.entity.ReceiptStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface ReceiptRepository extends JpaRepository<Receipt, Long> {

    Optional<Receipt> findByReference(String reference);

    Optional<Receipt> findByReceiptNumber(String receiptNumber);

    Optional<Receipt> findByPaymentId(Long paymentId);

    Optional<Receipt> findByVerificationToken(String token);

    @Query("""
            SELECT r FROM Receipt r
            LEFT JOIN r.taxpayer t
            LEFT JOIN r.payment p
            LEFT JOIN r.declaration decl
            LEFT JOIN r.debt d
            WHERE (:status IS NULL OR r.status = :status)
              AND (:taxpayerId IS NULL OR r.taxpayer.id = :taxpayerId)
              AND (:taxTypeCode IS NULL OR r.taxType.code = :taxTypeCode)
              AND (:method IS NULL OR r.method = :method)
              AND (:fromDate IS NULL OR r.issuedAt >= :fromDate)
              AND (:toDate IS NULL OR r.issuedAt <= :toDate)
              AND (:center IS NULL OR r.centerCode = :center)
              AND (:q IS NULL OR :q = '' OR
                    LOWER(r.reference) LIKE LOWER(CONCAT('%', :q, '%'))
                    OR LOWER(r.receiptNumber) LIKE LOWER(CONCAT('%', :q, '%'))
                    OR LOWER(r.verificationToken) LIKE LOWER(CONCAT('%', :q, '%'))
                    OR LOWER(t.nif) LIKE LOWER(CONCAT('%', :q, '%'))
                    OR LOWER(t.name) LIKE LOWER(CONCAT('%', :q, '%'))
                    OR LOWER(t.businessName) LIKE LOWER(CONCAT('%', :q, '%'))
                    OR LOWER(p.reference) LIKE LOWER(CONCAT('%', :q, '%'))
                    OR LOWER(p.transactionReference) LIKE LOWER(CONCAT('%', :q, '%'))
                    OR LOWER(d.reference) LIKE LOWER(CONCAT('%', :q, '%'))
                    OR LOWER(decl.reference) LIKE LOWER(CONCAT('%', :q, '%'))
              )
            """)
    Page<Receipt> search(@Param("status") ReceiptStatus status,
                         @Param("taxpayerId") Long taxpayerId,
                         @Param("taxTypeCode") String taxTypeCode,
                         @Param("method") PaymentMethod method,
                         @Param("fromDate") java.time.Instant fromDate,
                         @Param("toDate") java.time.Instant toDate,
                         @Param("center") String center,
                         @Param("q") String q,
                         Pageable pageable);

    List<Receipt> findByTaxpayerIdOrderByIdDesc(Long taxpayerId);

    long countByTaxpayerId(Long taxpayerId);

    List<Receipt> findTop10ByOrderByCreatedAtDesc();

    @Query("SELECT COUNT(r) FROM Receipt r WHERE r.status = :status")
    long countByStatus(@Param("status") ReceiptStatus status);

    @Query("SELECT COUNT(r) FROM Receipt r WHERE r.issuedAt >= :from AND r.issuedAt <= :to")
    long countIssuedBetween(@Param("from") java.time.Instant from, @Param("to") java.time.Instant to);

    @Query("SELECT COUNT(r) FROM Receipt r WHERE r.createdAt >= :from AND r.createdAt < :to")
    long countCreatedBetween(@Param("from") java.time.Instant from, @Param("to") java.time.Instant to);

    @Query("SELECT COALESCE(SUM(r.amount), 0) FROM Receipt r WHERE r.status NOT IN ('CANCELLED', 'VOID', 'REFUNDED', 'REPLACED')")
    BigDecimal sumTotalAmount();

    @Query("SELECT COALESCE(SUM(r.amount), 0) FROM Receipt r WHERE r.issuedAt >= :from AND r.issuedAt <= :to AND r.status NOT IN ('CANCELLED', 'VOID', 'REFUNDED', 'REPLACED')")
    BigDecimal sumAmountBetween(@Param("from") java.time.Instant from, @Param("to") java.time.Instant to);

    @Query("SELECT COALESCE(SUM(r.amount), 0) FROM Receipt r WHERE r.issuedAt >= :from AND r.issuedAt <= :to AND r.status = :status")
    BigDecimal sumAmountByStatusBetween(@Param("from") java.time.Instant from, @Param("to") java.time.Instant to,
                                        @Param("status") ReceiptStatus status);

    @Query("SELECT r.taxType.code, COUNT(r), COALESCE(SUM(r.amount), 0) FROM Receipt r WHERE r.status NOT IN ('CANCELLED', 'VOID', 'REFUNDED', 'REPLACED') GROUP BY r.taxType.code")
    List<Object[]> countByTaxType();

    @Query("SELECT r.method, COUNT(r), COALESCE(SUM(r.amount), 0) FROM Receipt r WHERE r.status NOT IN ('CANCELLED', 'VOID', 'REFUNDED', 'REPLACED') GROUP BY r.method")
    List<Object[]> countByMethod();
}
