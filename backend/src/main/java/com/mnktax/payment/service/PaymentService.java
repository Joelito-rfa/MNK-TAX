package com.mnktax.payment.service;

import com.mnktax.payment.dto.PaymentDtos.CancelPaymentRequest;
import com.mnktax.payment.dto.PaymentDtos.CreatePaymentRequest;
import com.mnktax.payment.dto.PaymentDtos.PaymentDto;
import com.mnktax.payment.entity.PaymentStatus;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

@Service
public class PaymentService {

    private final PaymentRecordingService recordingService;
    private final PaymentQueryService queryService;
    private final PaymentCancellationService cancellationService;

    public PaymentService(PaymentRecordingService recordingService, PaymentQueryService queryService,
                          PaymentCancellationService cancellationService) {
        this.recordingService = recordingService;
        this.queryService = queryService;
        this.cancellationService = cancellationService;
    }

    @Transactional
    public PaymentDto record(CreatePaymentRequest request, HttpServletRequest http) {
        return recordingService.record(request, http);
    }

    @Transactional
    public PaymentDto cancel(Long paymentId, CancelPaymentRequest request, HttpServletRequest http) {
        return cancellationService.cancel(paymentId, request, http);
    }

    @Transactional(readOnly = true)
    public Page<PaymentDto> search(PaymentStatus status, Long taxpayerId, String method,
                                   LocalDate from, LocalDate to, String q,
                                   Long debtId, String taxTypeCode, Long declarationId,
                                   String center, Pageable pageable) {
        return queryService.search(status, taxpayerId, method, from, to, q,
                debtId, taxTypeCode, declarationId, center, pageable);
    }
}
