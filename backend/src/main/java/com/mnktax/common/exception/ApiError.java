package com.mnktax.common.exception;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApiError {

    private Instant timestamp;
    private int status;
    private String code;
    private String message;
    private String path;
    private Map<String, String> fieldErrors;

    public static ApiError of(int status, String code, String message, String path) {
        return ApiError.builder()
                .timestamp(Instant.now())
                .status(status)
                .code(code)
                .message(message)
                .path(path)
                .build();
    }
}
