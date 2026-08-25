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

    // ─── Contribuables ──────────────────────────────────────────
    public static final String TAXPAYER_READ = "PERMISSION_TAXPAYER_READ";
    public static final String TAXPAYER_WRITE = "PERMISSION_TAXPAYER_WRITE";
    public static final String TAXPAYER_DELETE = "PERMISSION_TAXPAYER_DELETE";
    public static final String TAXPAYER_EXPORT = "PERMISSION_TAXPAYER_EXPORT";
    public static final String TAXPAYER_VIEW_HISTORY = "PERMISSION_TAXPAYER_VIEW_HISTORY";
    public static final String TAXPAYER_SUSPEND = "PERMISSION_TAXPAYER_SUSPEND";
    public static final String TAXPAYER_CLOSE = "PERMISSION_TAXPAYER_CLOSE";

    // ─── Déclarations ───────────────────────────────────────────
    public static final String DECLARATION_READ = "PERMISSION_DECLARATION_READ";
    public static final String DECLARATION_WRITE = "PERMISSION_DECLARATION_WRITE";
    public static final String DECLARATION_VALIDATE = "PERMISSION_DECLARATION_VALIDATE";
    public static final String DECLARATION_CREATE = "PERMISSION_DECLARATION_CREATE";
    public static final String DECLARATION_UPDATE = "PERMISSION_DECLARATION_UPDATE";
    public static final String DECLARATION_SUBMIT = "PERMISSION_DECLARATION_SUBMIT";
    public static final String DECLARATION_REVIEW = "PERMISSION_DECLARATION_REVIEW";
    public static final String DECLARATION_REJECT = "PERMISSION_DECLARATION_REJECT";
    public static final String DECLARATION_CORRECT = "PERMISSION_DECLARATION_CORRECT";
    public static final String DECLARATION_CANCEL = "PERMISSION_DECLARATION_CANCEL";
    public static final String DECLARATION_EXPORT = "PERMISSION_DECLARATION_EXPORT";
    public static final String DECLARATION_ATTACH = "PERMISSION_DECLARATION_ATTACH";

    // ─── Créances ───────────────────────────────────────────────
    public static final String DEBT_READ = "PERMISSION_DEBT_READ";
    public static final String DEBT_WRITE = "PERMISSION_DEBT_WRITE";
    public static final String DEBT_CREATE = "PERMISSION_DEBT_CREATE";
    public static final String DEBT_DELETE = "PERMISSION_DEBT_DELETE";
    public static final String DEBT_RECALCULATE = "PERMISSION_DEBT_RECALCULATE";
    public static final String DEBT_SUSPEND = "PERMISSION_DEBT_SUSPEND";
    public static final String DEBT_CLOSE = "PERMISSION_DEBT_CLOSE";
    public static final String DEBT_EXPORT = "PERMISSION_DEBT_EXPORT";
    public static final String DEBT_DETECT_ARREARS = "PERMISSION_DEBT_DETECT_ARREARS";
    public static final String DEBT_ASSIGN_RECOVERY = "PERMISSION_DEBT_ASSIGN_RECOVERY";
    public static final String DEBT_VIEW_HISTORY = "PERMISSION_DEBT_VIEW_HISTORY";

    // ─── Paiements ──────────────────────────────────────────────
    public static final String PAYMENT_READ = "PERMISSION_PAYMENT_READ";
    public static final String PAYMENT_WRITE = "PERMISSION_PAYMENT_WRITE";
    public static final String PAYMENT_CONFIRM = "PERMISSION_PAYMENT_CONFIRM";
    public static final String PAYMENT_ALLOCATE = "PERMISSION_PAYMENT_ALLOCATE";
    public static final String PAYMENT_CANCEL = "PERMISSION_PAYMENT_CANCEL";
    public static final String PAYMENT_REFUND = "PERMISSION_PAYMENT_REFUND";
    public static final String PAYMENT_EXPORT = "PERMISSION_PAYMENT_EXPORT";
    public static final String PAYMENT_RECONCILE = "PERMISSION_PAYMENT_RECONCILE";
    public static final String PAYMENT_VIEW_HISTORY = "PERMISSION_PAYMENT_VIEW_HISTORY";

    // ─── Quittances ─────────────────────────────────────────────
    public static final String RECEIPT_READ = "PERMISSION_RECEIPT_READ";
    public static final String RECEIPT_GENERATE = "PERMISSION_RECEIPT_GENERATE";
    public static final String RECEIPT_DOWNLOAD = "PERMISSION_RECEIPT_DOWNLOAD";
    public static final String RECEIPT_VERIFY = "PERMISSION_RECEIPT_VERIFY";
    public static final String RECEIPT_CANCEL = "PERMISSION_RECEIPT_CANCEL";
    public static final String RECEIPT_REPLACE = "PERMISSION_RECEIPT_REPLACE";
    public static final String RECEIPT_REFUND = "PERMISSION_RECEIPT_REFUND";
    public static final String RECEIPT_EXPORT = "PERMISSION_RECEIPT_EXPORT";
    public static final String RECEIPT_VIEW_HISTORY = "PERMISSION_RECEIPT_VIEW_HISTORY";

    // ─── Recouvrement ───────────────────────────────────────────
    public static final String COLLECTION_READ = "PERMISSION_COLLECTION_READ";
    public static final String COLLECTION_WRITE = "PERMISSION_COLLECTION_WRITE";

    // ─── Messages ───────────────────────────────────────────────
    public static final String MESSAGE_READ = "PERMISSION_MESSAGE_READ";
    public static final String MESSAGE_WRITE = "PERMISSION_MESSAGE_WRITE";
    public static final String MESSAGE_MANAGE = "PERMISSION_MESSAGE_MANAGE";
    public static final String MESSAGE_DELETE = "PERMISSION_MESSAGE_DELETE";

    // ─── Contrôles fiscaux ──────────────────────────────────────
    public static final String CONTROL_READ = "PERMISSION_CONTROL_READ";
    public static final String CONTROL_WRITE = "PERMISSION_CONTROL_WRITE";

    // ─── Réclamations ───────────────────────────────────────────
    public static final String COMPLAINT_READ = "PERMISSION_COMPLAINT_READ";
    public static final String COMPLAINT_WRITE = "PERMISSION_COMPLAINT_WRITE";

    // ─── Remboursements ─────────────────────────────────────────
    public static final String REFUND_READ = "PERMISSION_REFUND_READ";
    public static final String REFUND_WRITE = "PERMISSION_REFUND_WRITE";

    // ─── Calendrier / Obligations ───────────────────────────────
    public static final String DEADLINE_READ = "PERMISSION_DEADLINE_READ";
    public static final String DEADLINE_WRITE = "PERMISSION_DEADLINE_WRITE";
    public static final String OBLIGATION_READ = "PERMISSION_OBLIGATION_READ";
    public static final String OBLIGATION_WRITE = "PERMISSION_OBLIGATION_WRITE";

    // ─── Règles fiscales ────────────────────────────────────────
    public static final String RULE_READ = "PERMISSION_RULE_READ";
    public static final String RULE_WRITE = "PERMISSION_RULE_WRITE";
    public static final String TAX_RULE_HISTORY = "PERMISSION_TAX_RULE_HISTORY";

    // ─── Référentiels ───────────────────────────────────────────
    public static final String TAXONOMY_READ = "PERMISSION_TAXONOMY_READ";
    public static final String TAXONOMY_WRITE = "PERMISSION_TAXONOMY_WRITE";

    // ─── Impositions ────────────────────────────────────────────
    public static final String ASSESSMENT_READ = "PERMISSION_ASSESSMENT_READ";
    public static final String ASSESSMENT_WRITE = "PERMISSION_ASSESSMENT_WRITE";

    // ─── Rapports ───────────────────────────────────────────────
    public static final String REPORT_READ = "PERMISSION_REPORT_READ";
    public static final String REPORT_EXPORT = "PERMISSION_REPORT_EXPORT";
    public static final String REPORT_FINANCIAL = "PERMISSION_REPORT_FINANCIAL";
    public static final String REPORT_TAX = "PERMISSION_REPORT_TAX";
    public static final String REPORT_RECOVERY = "PERMISSION_REPORT_RECOVERY";

    // ─── Administration ─────────────────────────────────────────
    public static final String USER_READ = "PERMISSION_USER_READ";
    public static final String USER_WRITE = "PERMISSION_USER_WRITE";
    public static final String USER_DISABLE = "PERMISSION_USER_DISABLE";
    public static final String USER_RESET_PASSWORD = "PERMISSION_USER_RESET_PASSWORD";
    public static final String ROLE_READ = "PERMISSION_ROLE_READ";
    public static final String ROLE_WRITE = "PERMISSION_ROLE_WRITE";
    public static final String ROLE_ASSIGN = "PERMISSION_ROLE_ASSIGN";
    public static final String PERMISSION_READ = "PERMISSION_PERMISSION_READ";
    public static final String PARAMETER_READ = "PERMISSION_PARAMETER_READ";
    public static final String PARAMETER_WRITE = "PERMISSION_PARAMETER_WRITE";
    public static final String SYSTEM_SETTINGS_READ = "PERMISSION_SYSTEM_SETTINGS_READ";
    public static final String SYSTEM_SETTINGS_UPDATE = "PERMISSION_SYSTEM_SETTINGS_UPDATE";

    // ─── Audit ──────────────────────────────────────────────────
    public static final String AUDIT_READ = "PERMISSION_AUDIT_READ";
    public static final String NOTIFICATION_READ = "PERMISSION_NOTIFICATION_READ";
}
