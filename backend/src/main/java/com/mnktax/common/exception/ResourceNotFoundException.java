package com.mnktax.common.exception;

public class ResourceNotFoundException extends BusinessException {

    public ResourceNotFoundException(String message) {
        super("RESOURCE_NOT_FOUND", message);
    }

    public ResourceNotFoundException(String entity, Object id) {
        super("RESOURCE_NOT_FOUND", entity + " introuvable : " + id);
    }
}
