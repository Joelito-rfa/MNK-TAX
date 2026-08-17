package com.mnktax.auth.security;

/**
 * Autorités Spring Security exposées par les contrôleurs.
 * Les permissions en base portent le code nu (ex : TAXPAYER_READ) et sont
 * exposées comme autorité SPRING avec le préfixe PERMISSION_ (ex :
 * PERMISSION_TAXPAYER_READ) par CustomUserDetails.
 */
public final class Permissions {

    private Permissions() {
    }

    public static final String TAXPAYER_READ = "PERMISSION_TAXPAYER_READ";
    public static final String TAXPAYER_WRITE = "PERMISSION_TAXPAYER_WRITE";
    public static final String TAXPAYER_DELETE = "PERMISSION_TAXPAYER_DELETE";

    public static final String DECLARATION_READ = "PERMISSION_DECLARATION_READ";
    public static final String DECLARATION_WRITE = "PERMISSION_DECLARATION_WRITE";
    public static final String DECLARATION_VALIDATE = "PERMISSION_DECLARATION_VALIDATE";

    public static final String DEBT_READ = "PERMISSION_DEBT_READ";
    public static final String DEBT_WRITE = "PERMISSION_DEBT_WRITE";

    public static final String PAYMENT_READ = "PERMISSION_PAYMENT_READ";
    public static final String PAYMENT_WRITE = "PERMISSION_PAYMENT_WRITE";

    public static final String RECEIPT_READ = "PERMISSION_RECEIPT_READ";
    public static final String RECEIPT_GENERATE = "PERMISSION_RECEIPT_GENERATE";

    public static final String COLLECTION_READ = "PERMISSION_COLLECTION_READ";
    public static final String COLLECTION_WRITE = "PERMISSION_COLLECTION_WRITE";

    public static final String RULE_READ = "PERMISSION_RULE_READ";
    public static final String RULE_WRITE = "PERMISSION_RULE_WRITE";

    public static final String USER_READ = "PERMISSION_USER_READ";
    public static final String USER_WRITE = "PERMISSION_USER_WRITE";

    public static final String ROLE_READ = "PERMISSION_ROLE_READ";
    public static final String ROLE_WRITE = "PERMISSION_ROLE_WRITE";

    public static final String PARAMETER_READ = "PERMISSION_PARAMETER_READ";
    public static final String PARAMETER_WRITE = "PERMISSION_PARAMETER_WRITE";

    public static final String REPORT_READ = "PERMISSION_REPORT_READ";
    public static final String AUDIT_READ = "PERMISSION_AUDIT_READ";

    public static final String TAXONOMY_READ = "PERMISSION_TAXONOMY_READ";
    public static final String TAXONOMY_WRITE = "PERMISSION_TAXONOMY_WRITE";

    public static final String ASSESSMENT_READ = "PERMISSION_ASSESSMENT_READ";
    public static final String ASSESSMENT_WRITE = "PERMISSION_ASSESSMENT_WRITE";

    public static final String MESSAGE_READ = "PERMISSION_MESSAGE_READ";
    public static final String MESSAGE_WRITE = "PERMISSION_MESSAGE_WRITE";
}
