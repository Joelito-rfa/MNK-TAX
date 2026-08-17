package com.mnktax.common.validation;

import com.mnktax.common.util.NifValidator;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

public class NifValidatorImpl implements ConstraintValidator<ValidNif, String> {

    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        return NifValidator.isValid(value);
    }
}
