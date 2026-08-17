package com.mnktax.payment.repository;

import com.mnktax.payment.entity.Payment;
import com.mnktax.payment.entity.PaymentAllocation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.math.BigDecimal;
import java.util.List;

public interface PaymentAllocationRepository extends JpaRepository<PaymentAllocation, Long> {

    List<PaymentAllocation> findByPaymentIdOrderByIdAsc(Long paymentId);

    List<PaymentAllocation> findByDebtIdOrderByIdAsc(Long debtId);

    /**
     * Total alloué à une composante donnée d'une créance (principal, pénalité, intérêt).
     */
    default BigDecimal sumByDebtAndComponent(Long debtId, PaymentAllocation.Component component) {
        return findByDebtIdOrderByIdAsc(debtId).stream()
                .filter(a -> a.getComponent() == component)
                .map(PaymentAllocation::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }
}
