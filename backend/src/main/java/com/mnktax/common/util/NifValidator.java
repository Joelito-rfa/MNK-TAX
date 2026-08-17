package com.mnktax.common.util;

import com.mnktax.common.exception.BusinessException;

import java.util.regex.Pattern;

public final class NifValidator {

    public static final Pattern NIF_PATTERN = Pattern.compile("^[0-9]{10}$");

    private NifValidator() {
    }

    public static boolean isValid(String nif) {
        return nif != null && NIF_PATTERN.matcher(nif).matches();
    }

    public static void validate(String nif) {
        if (!isValid(nif)) {
            throw new BusinessException("INVALID_NIF", "Le NIF doit contenir exactement 10 chiffres.");
        }
    }
}
