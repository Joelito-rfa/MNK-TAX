package com.mnktax.common.config;

import com.mnktax.administration.entity.SystemParameter;
import com.mnktax.administration.repository.SystemParameterRepository;
import com.mnktax.auth.entity.Permission;
import com.mnktax.auth.entity.RegistrationRequest;
import com.mnktax.auth.repository.RegistrationRequestRepository;
import com.mnktax.auth.entity.Role;
import com.mnktax.auth.entity.User;
import com.mnktax.auth.repository.PermissionRepository;
import com.mnktax.auth.repository.RoleRepository;
import com.mnktax.auth.repository.UserRepository;
import com.mnktax.collection.entity.CollectionAction;
import com.mnktax.collection.entity.CollectionActionType;
import com.mnktax.collection.repository.CollectionActionRepository;
import com.mnktax.control.entity.ControlDocument;
import com.mnktax.control.entity.ControlStatus;
import com.mnktax.control.entity.ControlType;
import com.mnktax.control.entity.TaxControl;
import com.mnktax.control.repository.ControlDocumentRepository;
import com.mnktax.control.repository.TaxControlRepository;
import com.mnktax.debt.entity.DebtCollectionPriority;
import com.mnktax.debt.entity.DebtDispute;
import com.mnktax.debt.entity.DebtHistory;
import com.mnktax.debt.entity.DebtItem;
import com.mnktax.debt.entity.DebtOrigin;
import com.mnktax.debt.entity.DebtStatus;
import com.mnktax.debt.entity.DisputeStatus;
import com.mnktax.debt.entity.Interest;
import com.mnktax.debt.entity.Penalty;
import com.mnktax.debt.entity.TaxDebt;
import com.mnktax.debt.repository.DebtDisputeRepository;
import com.mnktax.debt.repository.DebtHistoryRepository;
import com.mnktax.debt.repository.InterestRepository;
import com.mnktax.debt.repository.PenaltyRepository;
import com.mnktax.debt.repository.TaxDebtRepository;
import com.mnktax.debt.service.DebtService;
import com.mnktax.declaration.dto.DeclarationDtos.CreateDeclarationRequest;
import com.mnktax.declaration.entity.DeclarationHistory;
import com.mnktax.tax.entity.DeclarationObligationStatus;
import com.mnktax.tax.entity.PaymentObligationStatus;
import com.mnktax.declaration.entity.DeclarationAnnexe;
import com.mnktax.message.entity.Message;
import com.mnktax.message.entity.MessageContextType;
import com.mnktax.message.entity.MessagePriority;
import com.mnktax.message.entity.MessageProcessingStatus;
import com.mnktax.message.repository.MessageRepository;
import com.mnktax.declaration.repository.DeclarationHistoryRepository;
import com.mnktax.declaration.repository.DeclarationAnnexeRepository;
import com.mnktax.declaration.repository.DeclarationRepository;
import com.mnktax.declaration.service.DeclarationService;
import com.mnktax.complaint.entity.Complaint;
import com.mnktax.complaint.entity.ComplaintResponse;
import com.mnktax.complaint.entity.ComplaintStatus;
import com.mnktax.complaint.entity.ContextType;
import com.mnktax.complaint.repository.ComplaintRepository;
import com.mnktax.complaint.repository.ComplaintResponseRepository;
import com.mnktax.refund.entity.Refund;
import com.mnktax.refund.entity.RefundReason;
import com.mnktax.refund.entity.RefundStatus;
import com.mnktax.refund.repository.RefundRepository;
import com.mnktax.notification.entity.Notification;
import com.mnktax.notification.entity.NotificationType;
import com.mnktax.notification.repository.NotificationRepository;
import com.mnktax.receipt.entity.Receipt;
import com.mnktax.receipt.entity.ReceiptStatus;
import com.mnktax.receipt.repository.ReceiptRepository;
import com.mnktax.document.entity.Document;
import com.mnktax.document.repository.DocumentRepository;
import com.mnktax.audit.entity.AuditLog;
import com.mnktax.audit.repository.AuditLogRepository;
import com.mnktax.assessment.repository.AssessmentRepository;
import com.mnktax.collection.entity.CollectionNotice;
import com.mnktax.collection.repository.CollectionNoticeRepository;
import com.mnktax.payment.dto.PaymentDtos.CreatePaymentRequest;
import com.mnktax.payment.entity.Payment;
import com.mnktax.payment.entity.PaymentMethod;
import com.mnktax.payment.repository.PaymentRepository;
import com.mnktax.payment.service.PaymentService;
import com.mnktax.paymentplan.entity.InstallmentStatus;
import com.mnktax.paymentplan.entity.PaymentPlan;
import com.mnktax.paymentplan.entity.PaymentPlanInstallment;
import com.mnktax.paymentplan.entity.PaymentPlanStatus;
import com.mnktax.paymentplan.repository.PaymentPlanRepository;
import com.mnktax.tax.entity.CalculationMethod;
import com.mnktax.tax.entity.CalculationMethod;
import com.mnktax.tax.entity.Deadline;
import com.mnktax.tax.entity.ObligationStatus;
import com.mnktax.tax.entity.Periodicity;
import com.mnktax.tax.entity.TaxCenter;
import com.mnktax.tax.entity.TaxObligation;
import com.mnktax.tax.entity.TaxRegime;
import com.mnktax.tax.entity.TaxRule;
import com.mnktax.tax.entity.TaxType;
import com.mnktax.tax.repository.DeadlineRepository;
import com.mnktax.tax.repository.TaxCenterRepository;
import com.mnktax.tax.repository.TaxObligationRepository;
import com.mnktax.tax.repository.TaxRegimeRepository;
import com.mnktax.tax.repository.TaxRuleRepository;
import com.mnktax.tax.repository.TaxRuleVersionRepository;
import com.mnktax.tax.repository.TaxTypeRepository;
import com.mnktax.taxpayer.entity.Taxpayer;
import com.mnktax.taxpayer.entity.TaxpayerActivity;
import com.mnktax.taxpayer.entity.TaxpayerStatus;
import com.mnktax.taxpayer.entity.TaxpayerType;
import com.mnktax.taxpayer.repository.TaxpayerRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Données de démonstration du prototype académique MNK-TAX.
 *
 * ATTENTION : TOUTES les données créées ici sont FICTIVES (contribuables, impôts,
 * taux, créances). Elles ne correspondent à aucune personne, entreprise ou règle
 * fiscale réelle et servent uniquement à démontrer le fonctionnement du logiciel.
 * Les règles fiscales de démonstration sont marquées is_demo = TRUE.
 */
@Component
public class DemoDataSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DemoDataSeeder.class);

    private final PermissionRepository permissionRepository;
    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final TaxCenterRepository centerRepository;
    private final TaxRegimeRepository regimeRepository;
    private final TaxTypeRepository taxTypeRepository;
    private final TaxRuleRepository ruleRepository;
    private final TaxRuleVersionRepository ruleVersionRepository;
    private final DeadlineRepository deadlineRepository;
    private final TaxpayerRepository taxpayerRepository;
    private final TaxObligationRepository obligationRepository;
    private final PenaltyRepository penaltyRepository;
    private final InterestRepository interestRepository;
    private final DeclarationService declarationService;
    private final DeclarationRepository declarationRepository;
    private final PaymentService paymentService;
    private final DebtService debtService;
    private final TaxDebtRepository debtRepository;
    private final CollectionActionRepository actionRepository;
    private final MessageRepository messageRepository;
    private final SystemParameterRepository parameterRepository;
    private final com.mnktax.debt.repository.DebtHistoryRepository debtHistoryRepository;
    private final com.mnktax.debt.repository.DebtItemRepository debtItemRepository;
    private final TaxControlRepository controlRepository;
    private final ControlDocumentRepository controlDocumentRepository;
    private final NotificationRepository notificationRepository;
    private final AuditLogRepository auditLogRepository;
    private final ComplaintRepository complaintRepository;
    private final ComplaintResponseRepository complaintResponseRepository;
    private final RefundRepository refundRepository;
    private final CollectionNoticeRepository collectionNoticeRepository;
    private final DeclarationHistoryRepository declarationHistoryRepository;
    private final DeclarationAnnexeRepository declarationAnnexeRepository;
    private final DocumentRepository documentRepository;
    private final ReceiptRepository receiptRepository;
    private final PaymentRepository paymentRepository;
    private final AssessmentRepository assessmentRepository;
    private final com.mnktax.payment.repository.PaymentAllocationRepository paymentAllocationRepository;
    private final RegistrationRequestRepository registrationRequestRepository;
    private final DebtDisputeRepository disputeRepository;
    private final PaymentPlanRepository planRepository;

    @Value("${mnk-tax.seed-demo:true}")
    private boolean seedDemo;

    public DemoDataSeeder(PermissionRepository permissionRepository, RoleRepository roleRepository,
                          UserRepository userRepository, PasswordEncoder passwordEncoder,
                          TaxCenterRepository centerRepository, TaxRegimeRepository regimeRepository,
                          TaxTypeRepository taxTypeRepository, TaxRuleRepository ruleRepository,
                          TaxRuleVersionRepository ruleVersionRepository, DeadlineRepository deadlineRepository,
                          TaxpayerRepository taxpayerRepository, TaxObligationRepository obligationRepository,
                          PenaltyRepository penaltyRepository, InterestRepository interestRepository,
                          DeclarationService declarationService, DeclarationRepository declarationRepository,
                          PaymentService paymentService,
                          DebtService debtService, TaxDebtRepository debtRepository,
                          CollectionActionRepository actionRepository, MessageRepository messageRepository,
                          SystemParameterRepository parameterRepository,
                          com.mnktax.debt.repository.DebtHistoryRepository debtHistoryRepository,
                          com.mnktax.debt.repository.DebtItemRepository debtItemRepository,
                          TaxControlRepository controlRepository,
                          ControlDocumentRepository controlDocumentRepository,
                          NotificationRepository notificationRepository,
                          AuditLogRepository auditLogRepository,
                          ComplaintRepository complaintRepository,
                          ComplaintResponseRepository complaintResponseRepository,
                          RefundRepository refundRepository,
                          CollectionNoticeRepository collectionNoticeRepository,
                          DeclarationHistoryRepository declarationHistoryRepository,
                          DeclarationAnnexeRepository declarationAnnexeRepository,
                          DocumentRepository documentRepository,
                          ReceiptRepository receiptRepository,
                          PaymentRepository paymentRepository,
                          AssessmentRepository assessmentRepository,
                          com.mnktax.payment.repository.PaymentAllocationRepository paymentAllocationRepository,
                          RegistrationRequestRepository registrationRequestRepository,
                          DebtDisputeRepository disputeRepository,
                          PaymentPlanRepository planRepository) {
        this.permissionRepository = permissionRepository;
        this.roleRepository = roleRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.centerRepository = centerRepository;
        this.regimeRepository = regimeRepository;
        this.taxTypeRepository = taxTypeRepository;
        this.ruleRepository = ruleRepository;
        this.ruleVersionRepository = ruleVersionRepository;
        this.deadlineRepository = deadlineRepository;
        this.taxpayerRepository = taxpayerRepository;
        this.obligationRepository = obligationRepository;
        this.penaltyRepository = penaltyRepository;
        this.interestRepository = interestRepository;
        this.declarationService = declarationService;
        this.declarationRepository = declarationRepository;
        this.paymentService = paymentService;
        this.debtService = debtService;
        this.debtRepository = debtRepository;
        this.actionRepository = actionRepository;
        this.messageRepository = messageRepository;
        this.parameterRepository = parameterRepository;
        this.debtHistoryRepository = debtHistoryRepository;
        this.debtItemRepository = debtItemRepository;
        this.controlRepository = controlRepository;
        this.controlDocumentRepository = controlDocumentRepository;
        this.notificationRepository = notificationRepository;
        this.auditLogRepository = auditLogRepository;
        this.complaintRepository = complaintRepository;
        this.complaintResponseRepository = complaintResponseRepository;
        this.refundRepository = refundRepository;
        this.collectionNoticeRepository = collectionNoticeRepository;
        this.declarationHistoryRepository = declarationHistoryRepository;
        this.declarationAnnexeRepository = declarationAnnexeRepository;
        this.documentRepository = documentRepository;
        this.receiptRepository = receiptRepository;
        this.paymentRepository = paymentRepository;
        this.assessmentRepository = assessmentRepository;
        this.paymentAllocationRepository = paymentAllocationRepository;
        this.registrationRequestRepository = registrationRequestRepository;
        this.disputeRepository = disputeRepository;
        this.planRepository = planRepository;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!seedDemo) {
            log.info("Seed de démonstration désactivé (mnk-tax.seed-demo=false)");
            return;
        }
        seedSystemParameters();
        if (userRepository.count() > 0) {
            log.info("Seed de démonstration déjà appliqué, ignoré.");
            return;
        }
        safeSeed("permissions", this::seedPermissions);
        safeSeed("roles", this::seedRoles);
        safeSeed("users", this::seedUsers);
        safeSeed("references", this::seedReferences);
        safeSeed("penalties", this::seedPenalties);
        safeSeed("deadlines", this::seedDeadlines);
        safeSeed("taxpayers", this::seedTaxpayers);
        safeSeed("transactions", this::seedTransactions);
        safeSeed("debt-scenarios", this::seedDebtScenarios);
        safeSeed("messages", this::seedMessages);
        safeSeed("controls", this::seedControls);
        safeSeed("notifications", this::seedNotifications);
        safeSeed("audit-logs", this::seedAuditLogs);
        safeSeed("complaints", this::seedComplaints);
        safeSeed("refunds", this::seedRefunds);
        safeSeed("collection-notices", this::seedCollectionNotices);
        safeSeed("collection-workflows", this::seedCollectionWorkflows);
        safeSeed("declaration-extras", this::seedDeclarationExtras);
        safeSeed("documents", this::seedDocuments);
        safeSeed("receipts", this::seedReceipts);
        safeSeed("registrations", this::seedRegistrations);
        log.info("Seed de démonstration terminé (données fictives).");
    }

    private void safeSeed(String name, Runnable action) {
        try {
            action.run();
        } catch (Exception ex) {
            log.error("Erreur lors du seed '{}' — ignoré", name, ex);
        }
    }

    /**
     * Paramètres système par défaut. Exécuté à chaque démarrage de façon
     * idempotente (les clés existantes ne sont pas écrasées).
     */
    private void seedSystemParameters() {
        Map.ofEntries(
                Map.entry("INSTITUTION_NAME", "DGI Manakara"),
                Map.entry("INSTITUTION_ADDRESS", "Manakara, Madagascar"),
                Map.entry("INSTITUTION_PHONE", "+261 34 00 000 00"),
                Map.entry("INSTITUTION_EMAIL", "contact@dgi-manakara.mg"),
                Map.entry("RECEIPT_FOOTER", "Quittance générée par MNK-TAX — Document non officiel de démonstration"),
                Map.entry("FISCAL_YEAR", String.valueOf(LocalDate.now().getYear())),
                Map.entry("VAT_RATE", "20"),
                Map.entry("PENALTY_RATE", "5"),
                Map.entry("INTEREST_RATE_MONTHLY", "1"),
                Map.entry("CURRENCY", "MGA"),
                Map.entry("DEBT.DEFAULT_PENALTY_CODE", "PEN_DEMO_5"),
                Map.entry("DEBT.DEFAULT_INTEREST_CODE", "INT_DEMO_1")
        ).forEach((key, value) -> {
            if (!parameterRepository.existsByKey(key)) {
                parameterRepository.save(SystemParameter.builder()
                        .key(key).value(value)
                        .description("Paramètre système par défaut")
                        .category(key.startsWith("INSTITUTION") ? "INSTITUTION"
                                : key.startsWith("RECEIPT") ? "QUITTANCE" : "FISCAL")
                        .updatedAt(Instant.now())
                        .build());
            }
        });
    }

    private void seedPermissions() {
        Map<String, String> perms = Map.ofEntries(
                Map.entry("TAXPAYER_READ", "Consulter les contribuables"),
                Map.entry("TAXPAYER_WRITE", "Gérer les contribuables"),
                Map.entry("TAXPAYER_DELETE", "Supprimer les contribuables"),
                Map.entry("DECLARATION_READ", "Consulter les déclarations"),
                Map.entry("DECLARATION_WRITE", "Créer / soumettre les déclarations"),
                Map.entry("DECLARATION_VALIDATE", "Valider les déclarations"),
                Map.entry("DEBT_READ", "Consulter les créances"),
                Map.entry("DEBT_WRITE", "Gérer les créances"),
                Map.entry("DEBT_CREATE", "Créer des créances"),
                Map.entry("DEBT_DELETE", "Supprimer des créances"),
                Map.entry("DEBT_RECALCULATE", "Recalculer les créances"),
                Map.entry("DEBT_SUSPEND", "Suspendre les créances"),
                Map.entry("DEBT_CLOSE", "Clôturer les créances"),
                Map.entry("DEBT_EXPORT", "Exporter les créances"),
                Map.entry("DEBT_DETECT_ARREARS", "Détecter les arriérés"),
                Map.entry("PAYMENT_READ", "Consulter les paiements"),
                Map.entry("PAYMENT_WRITE", "Enregistrer les paiements"),
                Map.entry("PAYMENT_CONFIRM", "Confirmer les paiements"),
                Map.entry("PAYMENT_ALLOCATE", "Allouer les paiements"),
                Map.entry("PAYMENT_CANCEL", "Annuler les paiements"),
                Map.entry("PAYMENT_REFUND", "Rembourser les paiements"),
                Map.entry("PAYMENT_EXPORT", "Exporter les paiements"),
                Map.entry("PAYMENT_RECONCILE", "Réconcilier les paiements"),
                Map.entry("RECEIPT_READ", "Consulter les quittances"),
                Map.entry("RECEIPT_GENERATE", "Générer les quittances"),
                Map.entry("RECEIPT_DOWNLOAD", "Télécharger les quittances"),
                Map.entry("RECEIPT_VERIFY", "Vérifier les quittances"),
                Map.entry("RECEIPT_CANCEL", "Annuler les quittances"),
                Map.entry("RECEIPT_REPLACE", "Remplacer les quittances"),
                Map.entry("RECEIPT_REFUND", "Rembourser les quittances"),
                Map.entry("RECEIPT_EXPORT", "Exporter les quittances"),
                Map.entry("COLLECTION_READ", "Consulter le recouvrement"),
                Map.entry("COLLECTION_WRITE", "Gérer le recouvrement"),
                Map.entry("RULE_READ", "Consulter les règles fiscales"),
                Map.entry("RULE_WRITE", "Gérer les règles fiscales"),
                Map.entry("USER_READ", "Consulter les utilisateurs"),
                Map.entry("USER_WRITE", "Gérer les utilisateurs"),
                Map.entry("ROLE_READ", "Consulter les rôles"),
                Map.entry("ROLE_WRITE", "Gérer les rôles"),
                Map.entry("PARAMETER_READ", "Consulter les paramètres"),
                Map.entry("PARAMETER_WRITE", "Gérer les paramètres"),
                Map.entry("REPORT_READ", "Consulter les rapports"),
                Map.entry("AUDIT_READ", "Consulter l'audit"),
                Map.entry("TAXONOMY_READ", "Consulter les référentiels"),
                Map.entry("TAXONOMY_WRITE", "Gérer les référentiels"),
                Map.entry("ASSESSMENT_READ", "Consulter les impositions"),
                Map.entry("ASSESSMENT_WRITE", "Gérer les impositions"),
                Map.entry("MESSAGE_READ", "Consulter les messages"),
                Map.entry("MESSAGE_WRITE", "Envoyer des messages"),
                Map.entry("NOTIFICATION_READ", "Consulter les notifications"),
                Map.entry("CONTROL_READ", "Consulter les contrôles fiscaux"),
                Map.entry("CONTROL_WRITE", "Gérer les contrôles fiscaux"),
                Map.entry("COMPLAINT_READ", "Consulter les réclamations"),
                Map.entry("COMPLAINT_WRITE", "Gérer les réclamations"),
                Map.entry("REFUND_READ", "Consulter les remboursements"),
                Map.entry("REFUND_WRITE", "Gérer les remboursements")
        );
        perms.forEach((code, name) -> {
            if (permissionRepository.findByCode(code).isEmpty()) {
                permissionRepository.save(Permission.builder()
                        .code(code).name(name).build());
            }
        });
    }

    private void seedRoles() {
        Map<String, Set<String>> rolePerms = new HashMap<>();
        rolePerms.put(Role.SUPER_ADMIN, allPermissionCodes());
        rolePerms.put(Role.ADMIN, allPermissionCodes());
        rolePerms.put(Role.TAX_AGENT, Set.of(
                "TAXPAYER_READ", "TAXPAYER_WRITE", "TAXPAYER_EXPORT", "TAXPAYER_VIEW_HISTORY",
                "DECLARATION_READ", "DECLARATION_CREATE", "DECLARATION_UPDATE", "DECLARATION_SUBMIT",
                "DECLARATION_REVIEW", "DECLARATION_VALIDATE", "DECLARATION_REJECT", "DECLARATION_EXPORT", "DECLARATION_ATTACH",
                "DEBT_READ", "DEBT_VIEW_HISTORY",
                "ASSESSMENT_READ", "RULE_READ", "TAXONOMY_READ", "REPORT_READ", "REPORT_TAX",
                "PAYMENT_READ", "PAYMENT_VIEW_HISTORY",
                "RECEIPT_READ", "RECEIPT_VIEW_HISTORY",
                "COLLECTION_READ", "NOTIFICATION_READ",
                "MESSAGE_READ", "MESSAGE_WRITE",
                "CONTROL_READ", "CONTROL_WRITE",
                "COMPLAINT_READ", "COMPLAINT_WRITE",
                "REFUND_READ", "REFUND_WRITE"));
        rolePerms.put(Role.COLLECTION_AGENT, Set.of(
                "TAXPAYER_READ", "TAXPAYER_VIEW_HISTORY",
                "DEBT_READ", "DEBT_WRITE", "DEBT_ASSIGN_RECOVERY", "DEBT_VIEW_HISTORY",
                "PAYMENT_READ", "PAYMENT_WRITE", "PAYMENT_VIEW_HISTORY",
                "RECEIPT_READ", "RECEIPT_GENERATE", "RECEIPT_DOWNLOAD", "RECEIPT_CANCEL",
                "COLLECTION_READ", "COLLECTION_WRITE",
                "REPORT_READ", "REPORT_RECOVERY", "NOTIFICATION_READ",
                "MESSAGE_READ", "MESSAGE_WRITE",
                "CONTROL_READ", "COMPLAINT_READ", "REFUND_READ"));
        rolePerms.put(Role.ACCOUNTANT, Set.of(
                "TAXPAYER_READ", "TAXPAYER_VIEW_HISTORY",
                "DECLARATION_READ", "DECLARATION_CREATE", "DECLARATION_UPDATE",
                "DEBT_READ", "DEBT_VIEW_HISTORY",
                "PAYMENT_READ", "PAYMENT_WRITE", "PAYMENT_CONFIRM", "PAYMENT_ALLOCATE", "PAYMENT_VIEW_HISTORY",
                "RECEIPT_READ", "RECEIPT_DOWNLOAD", "RECEIPT_EXPORT", "RECEIPT_VIEW_HISTORY",
                "ASSESSMENT_READ", "REPORT_READ", "REPORT_FINANCIAL",
                "MESSAGE_READ", "MESSAGE_WRITE",
                "CONTROL_READ", "COMPLAINT_READ",
                "REFUND_READ", "REFUND_WRITE"));
        rolePerms.put(Role.TAXPAYER, Set.of(
                "TAXPAYER_READ",
                "DECLARATION_READ", "DECLARATION_CREATE", "DECLARATION_UPDATE", "DECLARATION_SUBMIT",
                "DEBT_READ", "DEBT_VIEW_HISTORY",
                "PAYMENT_READ", "PAYMENT_VIEW_HISTORY",
                "RECEIPT_READ", "RECEIPT_VIEW_HISTORY",
                "NOTIFICATION_READ",
                "MESSAGE_READ", "MESSAGE_WRITE",
                "COMPLAINT_READ", "COMPLAINT_WRITE",
                "REFUND_READ"));

        rolePerms.forEach((code, permCodes) -> {
            Role existing = roleRepository.findByCode(code).orElse(null);
            Set<Permission> perms = permissionRepository.findAll().stream()
                    .filter(p -> permCodes.contains(p.getCode()))
                    .collect(java.util.stream.Collectors.toSet());
            if (existing != null) {
                // Sync permissions for existing roles
                existing.setPermissions(perms);
                roleRepository.save(existing);
                return;
            }
            Role role = Role.builder()
                    .code(code)
                    .name(code.replace("_", " "))
                    .description("Rôle système : " + code)
                    .system(true)
                    .permissions(perms)
                    .build();
            roleRepository.save(role);
        });
    }

    private Set<String> allPermissionCodes() {
        return permissionRepository.findAll().stream().map(Permission::getCode)
                .collect(java.util.stream.Collectors.toSet());
    }

    private void seedUsers() {
        createUser("superadmin", "Super Admin", "superadmin@mnk-tax.mg", "Admin@123", Role.SUPER_ADMIN);
        createUser("admin", "Admin", "admin@mnk-tax.mg", "Admin@123", Role.ADMIN);
        createUser("agent.tax", "Agent Fiscal", "agent.tax@mnk-tax.mg", "Agent@123", Role.TAX_AGENT);
        createUser("agent.collection", "Agent Recouvrement", "agent.collection@mnk-tax.mg", "Agent@123", Role.COLLECTION_AGENT);
        createUser("accountant", "Comptable", "accountant@mnk-tax.mg", "Agent@123", Role.ACCOUNTANT);
        createUser("taxpayer.demo", "Contribuable", "taxpayer@mnk-tax.mg", "Taxpayer@123", Role.TAXPAYER);
    }

    private void createUser(String username, String displayName, String email, String password, String roleCode) {
        if (userRepository.findByUsername(username).isPresent()) {
            return;
        }
        Role role = roleRepository.findByCode(roleCode).orElseThrow();
        User user = User.builder()
                .username(username)
                .email(email)
                .password(passwordEncoder.encode(password))
                .firstName(displayName.split(" ")[0])
                .lastName(displayName.split(" ").length > 1 ? displayName.split(" ")[1] : "")
                .enabled(true)
                .mustChangePassword(false)
                .mfaEnabled(false)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .roles(new java.util.HashSet<>(Set.of(role)))
                .build();
        userRepository.save(user);
    }

    private void seedReferences() {
        if (centerRepository.count() == 0) {
            centerRepository.save(TaxCenter.builder().code("CEN-001").name("Centre fiscal Analakely")
                    .address("Antananarivo, Analakely").createdAt(Instant.now()).build());
            centerRepository.save(TaxCenter.builder().code("CEN-002").name("Centre fiscal Antanimena")
                    .address("Antananarivo, Antanimena").createdAt(Instant.now()).build());
            centerRepository.save(TaxCenter.builder().code("CEN-003").name("Centre fiscal Toamasina")
                    .address("Toamasina").createdAt(Instant.now()).build());
        }
        if (regimeRepository.count() == 0) {
            regimeRepository.save(TaxRegime.builder().code("REG-REEL").name("Régime réel")
                    .description("Régime réel d'imposition").category("REEL")
                    .vatApplicable(true).obligationPeriodicity("MONTHLY")
                    .applicableTaxTypes("TVA,IS,IRSA").build());
            regimeRepository.save(TaxRegime.builder().code("REG-SIMP").name("Régime simplifié")
                    .description("Régime simplifié d'imposition").category("SIMPLIFIE")
                    .vatApplicable(true).obligationPeriodicity("QUARTERLY")
                    .applicableTaxTypes("TVA,IRSA").build());
            regimeRepository.save(TaxRegime.builder().code("REG-FORF").name("Régime forfaitaire")
                    .description("Régime forfaitaire d'imposition").category("FORFAITAIRE")
                    .vatApplicable(false).obligationPeriodicity("ANNUAL")
                    .applicableTaxTypes("IFT").build());
        }
        if (taxTypeRepository.count() == 0) {
            createTaxType("IR", "Impôt sur les Revenus");
            createTaxType("IS", "Impôt sur les Sociétés");
            createTaxType("IRSA", "Impôt sur les Revenus Salariaux et Assimilés");
            createTaxType("TVA", "Taxe sur la Valeur Ajoutée");
            createTaxType("IPVI", "Impôt sur les Plus-Values Immobilières");
            createTaxType("DE", "Droit d'Enregistrement");
            createTaxType("DA", "Droit d'Accises");
            createTaxType("IFT", "Impôt Foncier sur les Terrains");
            createTaxType("IFPB", "Impôt Foncier sur les Propriétés Bâties");
        }
        seedRules();
    }

    private void createTaxType(String code, String name) {
        taxTypeRepository.save(TaxType.builder().code(code).name(name)
                .category("IMPOSITION").description("Type d'impôt").active(true).build());
    }

    private void seedRules() {
        LocalDate past = LocalDate.of(2024, 1, 1);
        createRule("R-TVA-20", "TVA taux unique", "TVA", "PERCENTAGE_OF_BASE",
                new BigDecimal("20"), "Règle de calcul de référence",
                "COMPANY", "REG-REEL", past, null);
        createRule("R-IS-25", "IS taux", "IS", "PERCENTAGE_OF_BASE",
                new BigDecimal("25"), "Règle de calcul de référence",
                "COMPANY", "REG-REEL", past, null);
        createRule("R-IRSA-15", "IRSA taux", "IRSA", "PERCENTAGE_OF_BASE",
                new BigDecimal("15"), "Règle de calcul de référence",
                "PERSON", null, past, null);
        createRule("R-IR-20", "IR taux", "IR", "PROGRESSIVE",
                new BigDecimal("20"), "Règle de calcul de référence",
                null, null, past, null);
        createRule("R-IFT-2", "IFT taux", "IFT", "PERCENTAGE_OF_BASE",
                new BigDecimal("2"), "Règle de calcul de référence",
                null, null, past, null);
    }

    private void createRule(String code, String name, String taxTypeCode, String method, BigDecimal rate,
                            String legalRef, String taxpayerType, String regimeCode, LocalDate from, LocalDate to) {
        if (ruleRepository.existsByCode(code)) {
            return;
        }
        TaxType type = taxTypeRepository.findByCode(taxTypeCode).orElseThrow();
        TaxRegime regime = regimeCode == null ? null : regimeRepository.findByCode(regimeCode).orElse(null);
        TaxRule rule = TaxRule.builder()
                .code(code).name(name).taxType(type)
                .taxpayerType(taxpayerType).regime(regime)
                .calculationMethod(CalculationMethod.valueOf(method))
                .rate(rate).effectiveFrom(from).effectiveTo(to)
                .active(true).demo(true)
                .legalReference(legalRef)
                .createdAt(Instant.now()).createdBy("seed")
                .build();
        TaxRule saved = ruleRepository.save(rule);
        ruleVersionRepository.save(com.mnktax.tax.entity.TaxRuleVersion.builder()
                .rule(saved).versionNumber(1).snapshot("{}")
                .reason("Création initiale").changedBy("seed").createdAt(Instant.now()).build());
    }

    private void seedPenalties() {
        if (penaltyRepository.findByCode("PEN_DEMO_5").isEmpty()) {
            penaltyRepository.save(Penalty.builder().code("PEN_DEMO_5")
                    .name("Pénalité de retard 5%")
                    .rate(new BigDecimal("5"))
                    .description("Pénalité de retard").build());
        }
        if (interestRepository.findByCode("INT_DEMO_1").isEmpty()) {
            interestRepository.save(Interest.builder().code("INT_DEMO_1")
                    .name("Intérêt de retard 1%/mois")
                    .rate(new BigDecimal("1")).periodicity("MONTHLY")
                    .description("Intérêt de retard mensuel").build());
        }
    }

    private void seedDeadlines() {
        int year = LocalDate.now().getYear();
        for (int month = 1; month <= 12; month++) {
            String period = year + "-" + String.format("%02d", month);
            seedDeadline("TVA", period, LocalDate.of(year, month, 20), LocalDate.of(year, month, 25));
            seedDeadline("IRSA", period, LocalDate.of(year, month, 20), LocalDate.of(year, month, 25));
        }
        seedDeadline("IS", year + "-12", LocalDate.of(year + 1, 3, 31), LocalDate.of(year + 1, 4, 15));
    }

    private void seedDeadline(String taxTypeCode, String period, LocalDate decl, LocalDate pay) {
        TaxType type = taxTypeRepository.findByCode(taxTypeCode).orElse(null);
        if (type == null) {
            return;
        }
        if (deadlineRepository.findByTaxTypeIdAndPeriod(type.getId(), period).isEmpty()) {
            deadlineRepository.save(Deadline.builder().taxType(type).period(period)
                    .declarationDeadline(decl).paymentDeadline(pay).createdAt(Instant.now()).build());
        }
    }

    @Transactional
    public void seedTaxpayers() {
        if (taxpayerRepository.count() > 0) {
            return;
        }
        TaxCenter center = centerRepository.findByCode("CEN-001").orElseThrow();
        TaxRegime reel = regimeRepository.findByCode("REG-REEL").orElseThrow();
        TaxRegime simplifie = regimeRepository.findByCode("REG-SIMP").orElseThrow();

        Taxpayer tp1 = taxpayerRepository.save(baseTaxpayer("0000409001", "SOCIÉTÉ MALAGASY", TaxpayerType.COMPANY,
                center, reel, "contact@mnk-tax.mg", "036 00 000 01", "Antananarivo, Lot II 123"));
        tp1.setLegalRepresentative("Rakotoarison Hery");
        addActivity(tp1, "4771", "Commerce de détail", true);
        addActivity(tp1, "4610", "Intermédiaires du commerce", false);

        Taxpayer tp2 = taxpayerRepository.save(baseTaxpayer("1234567890", "Jean RAKOTO", TaxpayerType.PERSON,
                center, simplifie, "jean.rakoto@mnk-tax.mg", "033 00 000 02", "Antananarivo"));
        tp2.setBirthDate(LocalDate.of(1985, 6, 15));
        addActivity(tp2, "8510", "Activités libérales", true);

        Taxpayer tp3 = taxpayerRepository.save(baseTaxpayer("9876543210", "ENTREPRISE SARL", TaxpayerType.COMPANY,
                centerRepository.findByCode("CEN-002").orElseThrow(), simplifie,
                "contact@mnk-tax.mg", "034 00 000 03", "Antananarivo, rue des Manguiers 45"));
        tp3.setLegalRepresentative("Andriamihaja Lova");
        addActivity(tp3, "5610", "Restauration", true);

        Taxpayer tp4 = taxpayerRepository.save(baseTaxpayer("0000412345", "TRANSPORT SA", TaxpayerType.COMPANY,
                centerRepository.findByCode("CEN-003").orElseThrow(), reel,
                "transport@mnk-tax.mg", "032 00 000 04", "Toamasina"));
        tp4.setLegalRepresentative("Rasolofonirina Mamy");
        addActivity(tp4, "4931", "Transports urbains", true);

        Taxpayer tp5 = taxpayerRepository.save(baseTaxpayer("1000000001", "Marie RANDRIANARISOA", TaxpayerType.PERSON,
                center, simplifie, "marie.randrianarisoa@mnk-tax.mg", "038 00 000 05", "Antananarivo"));
        tp5.setBirthDate(LocalDate.of(1990, 11, 2));
        addActivity(tp5, "6810", "Activités immobilières", true);

        createObligation(tp1, "TVA", Periodicity.MONTHLY, LocalDate.now().minusYears(1));
        createObligation(tp1, "IS", Periodicity.ANNUAL, LocalDate.now().minusYears(1));
        createObligation(tp1, "IFPB", Periodicity.SEMI_ANNUAL, LocalDate.now().minusYears(1));
        createObligation(tp2, "IRSA", Periodicity.MONTHLY, LocalDate.now().minusYears(1));
        createObligation(tp3, "TVA", Periodicity.MONTHLY, LocalDate.now().minusYears(1));
        createObligation(tp3, "IFT", Periodicity.SEMI_ANNUAL, LocalDate.now().minusYears(1));
        createObligation(tp4, "TVA", Periodicity.MONTHLY, LocalDate.now().minusYears(1));
        createObligation(tp4, "IS", Periodicity.ANNUAL, LocalDate.now().minusYears(1));
            createObligation(tp5, "IFPB", Periodicity.ANNUAL, LocalDate.now().minusYears(1));

            linkTaxpayerUsers();
        }

    private Taxpayer baseTaxpayer(String nif, String name, TaxpayerType type, TaxCenter center, TaxRegime regime,
                                  String email, String phone, String address) {
        return Taxpayer.builder()
                .nif(nif).type(type).name(name)
                .email(email).phone(phone).address(address)
                .taxCenter(center).taxRegime(regime)
                .registrationDate(LocalDate.now().minusYears(2))
                .status(TaxpayerStatus.ACTIVE)
                .createdAt(Instant.now()).updatedAt(Instant.now())
                .build();
    }

    private void addActivity(Taxpayer tp, String code, String label, boolean primary) {
        tp.getActivities().add(TaxpayerActivity.builder().taxpayer(tp).code(code)
                .label(label).description("Activité exercée").primary(primary).build());
    }

    private void createObligation(Taxpayer tp, String taxTypeCode, Periodicity periodicity, LocalDate start) {
        TaxType type = taxTypeRepository.findByCode(taxTypeCode).orElseThrow();
        obligationRepository.save(TaxObligation.builder().taxpayer(tp).taxType(type)
                .periodicity(periodicity).startDate(start).status(ObligationStatus.ACTIVE)
                .declarationStatus(DeclarationObligationStatus.NOT_SUBMITTED)
                .paymentStatus(PaymentObligationStatus.UNPAID)
                .createdAt(Instant.now()).build());
    }

    private void linkTaxpayerUsers() {
        var taxpayerUser = userRepository.findByUsername("taxpayer.demo").orElse(null);
        if (taxpayerUser == null) return;
        taxpayerRepository.findByNif("1234567890").ifPresent(tp -> {
            if (tp.getUserId() == null) {
                tp.setUserId(taxpayerUser.getId());
                tp.setUpdatedAt(Instant.now());
                taxpayerRepository.save(tp);
            }
        });
        taxpayerRepository.findByNif("1000000001").ifPresent(tp -> {
            if (tp.getUserId() == null) {
                tp.setUserId(taxpayerUser.getId());
                tp.setUpdatedAt(Instant.now());
                taxpayerRepository.save(tp);
            }
        });
    }

    private void seedTransactions() {
        // Déclaration validée récente (TVA) → assessment → créance
        var tp1 = taxpayerRepository.findByNif("0000409001").orElseThrow();
        String currentPeriod = LocalDate.now().getYear() + "-" + String.format("%02d", LocalDate.now().getMonthValue());
        Long currentDecl = createAndValidateDeclaration(tp1.getId(), "TVA", currentPeriod,
                new BigDecimal("1000000"), new BigDecimal("200000"));

        // Cas 1: Paiement confirmé et entièrement alloué (tp1, créance TVA récente)
        com.mnktax.debt.entity.TaxDebt newDebt = debtRepository.findAll().stream()
                .filter(d -> d.getTaxpayer().getId().equals(tp1.getId()) && d.getStatus() == DebtStatus.ISSUED)
                .max(java.util.Comparator.comparing(com.mnktax.debt.entity.TaxDebt::getId))
                .orElse(null);
        if (newDebt != null) {
            try {
                paymentService.record(new CreatePaymentRequest(newDebt.getId(),
                        new BigDecimal("50000"), LocalDate.now().minusDays(3),
                        PaymentMethod.BANK_TRANSFER, "TXN-BANK-001", "Paiement TVA janvier", null, null), null);
            } catch (Exception ex) {
                log.warn("Seed cas 1 ignoré : {}", ex.getMessage());
            }
        }

        // Cas 2: Paiement partiellement alloué (tp1, créance TVA plus ancienne)
        com.mnktax.debt.entity.TaxDebt partialDebt = debtRepository.findAll().stream()
                .filter(d -> d.getTaxpayer().getId().equals(tp1.getId()) && d.getStatus() == DebtStatus.PARTIALLY_PAID)
                .findFirst().orElse(null);
        if (partialDebt != null) {
            try {
                paymentService.record(new CreatePaymentRequest(partialDebt.getId(),
                        new BigDecimal("50000"), LocalDate.now().minusDays(2),
                        PaymentMethod.CASH, null, "Paiement espèces partiel", null, null), null);
            } catch (Exception ex) {
                log.warn("Seed cas 2 ignoré : {}", ex.getMessage());
            }
        }

        // Cas 3: Paiement en attente (tp2, créance IRSA)
        var tp2Lookup = taxpayerRepository.findByNif("1234567890").orElse(null);
        com.mnktax.debt.entity.TaxDebt tp2Debt = debtRepository.findAll().stream()
                .filter(d -> d.getTaxpayer().getId().equals(tp2Lookup != null ? tp2Lookup.getId() : 0L)
                        && d.getStatus() == DebtStatus.ISSUED)
                .findFirst().orElse(null);
        if (tp2Debt != null) {
            try {
                var pendingPayment = paymentService.record(new CreatePaymentRequest(tp2Debt.getId(),
                        new BigDecimal("180000"), LocalDate.now().minusDays(1),
                        PaymentMethod.MOBILE_MONEY, "TXN-MOMO-002", "Mobile Money Orange", null, null), null);
            } catch (Exception ex) {
                log.warn("Seed cas 3 ignoré : {}", ex.getMessage());
            }
        }

        // Cas 5: Paiement annulé (créer puis annuler)
        var tp4Lookup = taxpayerRepository.findByNif("0000412345").orElse(null);
        com.mnktax.debt.entity.TaxDebt tp4Debt = debtRepository.findAll().stream()
                .filter(d -> d.getTaxpayer() != null && d.getTaxpayer().getId().equals(tp4Lookup != null ? tp4Lookup.getId() : 0L)
                        && d.getStatus() == DebtStatus.IN_COLLECTION)
                .findFirst().orElse(null);
        if (tp4Debt != null) {
            try {
                paymentService.record(new CreatePaymentRequest(tp4Debt.getId(),
                        new BigDecimal("500000"), LocalDate.now().minusDays(5),
                        PaymentMethod.CARD, "TXN-CARD-003", "Paiement carte bancaire", null, null), null);
            } catch (Exception ex) {
                log.warn("Seed cas 5 création ignorée : {}", ex.getMessage());
            }
        }

        // Cas 9: Paiement d'une dette en recouvrement
        com.mnktax.debt.entity.TaxDebt collectionDebt = debtRepository.findAll().stream()
                .filter(d -> d.getStatus() == DebtStatus.IN_COLLECTION)
                .findFirst().orElse(null);
        if (collectionDebt != null) {
            try {
                paymentService.record(new CreatePaymentRequest(collectionDebt.getId(),
                        new BigDecimal("200000"), LocalDate.now(),
                        PaymentMethod.BANK_TRANSFER, "TXN-BANK-009", "Paiement en recouvrement", null, null), null);
            } catch (Exception ex) {
                log.warn("Seed cas 9 ignoré : {}", ex.getMessage());
            }
        }

        // Déclaration en retard (TVA, 5 mois auparavant) → créance OVERDUE
        LocalDate old = LocalDate.now().minusMonths(5);
        String oldPeriod = old.getYear() + "-" + String.format("%02d", old.getMonthValue());
        Long overdueDecl = createAndValidateDeclaration(tp1.getId(), "TVA", oldPeriod,
                new BigDecimal("1500000"), new BigDecimal("300000"));
        debtService.markOverdue(LocalDate.now(), null, null, null, null, null, null, null);

        // Créance en recouvrement : action + mise en demeure sur une créance en retard
        List<com.mnktax.debt.entity.TaxDebt> overdueDebts = debtRepository.findByStatusAndDueDateBefore(
                DebtStatus.OVERDUE, LocalDate.now());
        if (!overdueDebts.isEmpty()) {
            com.mnktax.debt.entity.TaxDebt d = overdueDebts.get(0);
            actionRepository.save(CollectionAction.builder().debt(d)
                    .type(CollectionActionType.REMINDER)
                    .description("Relance amiable : demande de régularisation de la créance.")
                    .actionDate(LocalDate.now().minusDays(10))
                    .outcome("En attente de paiement")
                    .responsibleUserId(4L).status("DONE")
                    .createdAt(Instant.now()).build());
            actionRepository.save(CollectionAction.builder().debt(d)
                    .type(CollectionActionType.PHONE_CONTACT)
                    .description("Contact téléphonique avec le contribuable.")
                    .actionDate(LocalDate.now().minusDays(5))
                    .outcome("Promesse de paiement sous 15 jours")
                    .responsibleUserId(4L).status("DONE")
                    .createdAt(Instant.now()).build());
        }

        // Deuxième contribuable : déclaration soumise en attente de validation
        var tp2 = taxpayerRepository.findByNif("1234567890").orElseThrow();
        createAndSubmitDeclaration(tp2.getId(), "IRSA", currentPeriod, new BigDecimal("400000"), new BigDecimal("60000"));

        // Troisième contribuable : déclaration en brouillon
        var tp3 = taxpayerRepository.findByNif("9876543210").orElseThrow();
        String lastPeriod = LocalDate.now().minusMonths(1).getYear() + "-"
                + String.format("%02d", LocalDate.now().minusMonths(1).getMonthValue());
        createDeclaration(tp3.getId(), "TVA", lastPeriod, new BigDecimal("750000"), new BigDecimal("150000"));
    }

    private Long createDeclaration(Long taxpayerId, String taxTypeCode, String period, BigDecimal base, BigDecimal declared) {
        return declarationService.create(new CreateDeclarationRequest(taxpayerId, taxTypeCode, period,
                null, null, base, declared, null, null, null, null,
                List.of()), null).id();
    }

    private Long createAndSubmitDeclaration(Long taxpayerId, String taxTypeCode, String period, BigDecimal base, BigDecimal declared) {
        Long id = createDeclaration(taxpayerId, taxTypeCode, period, base, declared);
        try {
            declarationService.submit(id, null);
        } catch (Exception ex) {
            log.warn("Seed soumission ignorée : {}", ex.getMessage());
        }
        return id;
    }

    private Long createAndValidateDeclaration(Long taxpayerId, String taxTypeCode, String period, BigDecimal base, BigDecimal declared) {
        Long id = createAndSubmitDeclaration(taxpayerId, taxTypeCode, period, base, declared);
        try {
            declarationService.validate(id, new com.mnktax.declaration.dto.DeclarationDtos.ValidateRequest(
                    "Validation automatique"), null);
        } catch (Exception ex) {
            log.warn("Seed validation ignorée : {}", ex.getMessage());
        }
        return id;
    }

    private void seedDebtScenarios() {
        if (debtRepository.count() > 2) {
            return;
        }
        Taxpayer tp1 = taxpayerRepository.findByNif("0000409001").orElse(null);
        Taxpayer tp2 = taxpayerRepository.findByNif("1234567890").orElse(null);
        Taxpayer tp3 = taxpayerRepository.findByNif("9876543210").orElse(null);
        Taxpayer tp4 = taxpayerRepository.findByNif("0000412345").orElse(null);
        Taxpayer tp5 = taxpayerRepository.findByNif("1000000001").orElse(null);
        if (tp1 == null) return;

        TaxType tva = taxTypeRepository.findByCode("TVA").orElse(null);
        TaxType irsa = taxTypeRepository.findByCode("IRSA").orElse(null);
        TaxType is = taxTypeRepository.findByCode("IS").orElse(null);
        TaxType ift = taxTypeRepository.findByCode("IFT").orElse(null);
        if (tva == null || irsa == null || is == null || ift == null) return;

        LocalDate today = LocalDate.now();
        String currentPeriod = today.getYear() + "-" + String.format("%02d", today.getMonthValue());

        // 1. Créance ISSUE liée à une imposition — priorité NORMALE, déjà partiellement payée
        TaxDebt existingPaid = debtRepository.findAll().stream()
                .filter(d -> d.getTaxpayer().getId().equals(tp1.getId()) && d.getStatus() == DebtStatus.PARTIALLY_PAID)
                .findFirst().orElse(null);
        if (existingPaid != null) {
            existingPaid.setOrigin(DebtOrigin.ASSESSMENT);
            existingPaid.setCollectionPriority(DebtCollectionPriority.NORMAL);
            existingPaid.setObservations("Créance TVA liée à la déclaration mensuelle. Premier contribuable du portefeuille.");
            existingPaid.setCreatedBy("agent.tax");
            existingPaid.setTaxpayerCenter("CEN-001");
            existingPaid.setLastDueDate(existingPaid.getDueDate());
            existingPaid.setUpdatedAt(Instant.now());
            debtRepository.save(existingPaid);
            addDebtHistory(existingPaid, "CREATED", "Créance issue d'une imposition déclarative", null, "Montant : " + existingPaid.getPrincipalAmount());
            addDebtHistory(existingPaid, "STATUS_CHANGE", "Statut passé à PARTIELLEMENT_PAYÉ", "ISSUED", "PARTIALLY_PAID");
        }

        // 2. Créance OVERDUE haute priorité — IRSA tp2
        TaxDebt existingOverdue = debtRepository.findAll().stream()
                .filter(d -> d.getTaxpayer().getId().equals(tp1.getId()) && d.getStatus() == DebtStatus.OVERDUE)
                .findFirst().orElse(null);
        if (existingOverdue != null) {
            existingOverdue.setOrigin(DebtOrigin.ASSESSMENT);
            existingOverdue.setCollectionPriority(DebtCollectionPriority.HIGH);
            existingOverdue.setObservations("Créance en retard depuis plusieurs mois. Relances multiples sans réponse.");
            existingOverdue.setCreatedBy("agent.tax");
            existingOverdue.setTaxpayerCenter("CEN-001");
            existingOverdue.setLastDueDate(existingOverdue.getDueDate());
            existingOverdue.setUpdatedAt(Instant.now());
            debtRepository.save(existingOverdue);
            addDebtHistory(existingOverdue, "CREATED", "Créance issue d'une imposition déclarative", null, "Montant : " + existingOverdue.getPrincipalAmount());
            addDebtHistory(existingOverdue, "PENALTY_APPLIED", "Pénalité de retard 5% appliquée", null, existingOverdue.getPenaltyAmount() + " MGA");
            addDebtHistory(existingOverdue, "STATUS_CHANGE", "Statut passé à EN_RETARD", "ISSUED", "OVERDUE");
        }

        // 3. Créance IN_COLLECTION —.tp4 TRANSPORT SA, priorité URGENTE
        if (tp4 != null) {
            TaxDebt d3 = createDemoDebt(tp4, tva, LocalDate.now().minusMonths(3),
                    new BigDecimal("2500000"), new BigDecimal("1000000"),
                    DebtStatus.IN_COLLECTION, DebtOrigin.DECLARATION, DebtCollectionPriority.URGENT,
                    "Créance impayée depuis 3 mois. Mise en demeure envoyée. Risque de contentieux.",
                    "CEN-003", "agent.collection");
            addDebtHistory(d3, "CREATED", "Créance issue d'une déclaration TVA", null, "Montant : 2 500 000 MGA");
            addDebtHistory(d3, "PENALTY_APPLIED", "Pénalité de retard appliquée", null, "125 000 MGA");
            addDebtHistory(d3, "INTEREST_APPLIED", "Intérêts de retard calculés", null, "75 000 MGA (1% x 3 mois)");
            addDebtHistory(d3, "IN_COLLECTION", "Créance envoyée en recouvrement forcé", "OVERDUE", "IN_COLLECTION");
        }

        // 4. Créance DISPUTED — tp3 ENTREPRISE SARL, priorité NORMALE
        if (tp3 != null) {
            TaxDebt d4 = createDemoDebt(tp3, ift, LocalDate.now().minusMonths(6),
                    new BigDecimal("450000"), BigDecimal.ZERO,
                    DebtStatus.DISPUTED, DebtOrigin.CONTROL, DebtCollectionPriority.NORMAL,
                    "Contestation du montant par le contribuable. En attente de vérification sur place.",
                    "CEN-002", "agent.tax");
            addDebtHistory(d4, "CREATED", "Créance issue d'un contrôle fiscal", null, "Montant : 450 000 MGA");
            addDebtHistory(d4, "STATUS_CHANGE", "Créance mise en contestation", "ISSUED", "DISPUTED");
        }

        // 5. Créance SUSPENDED — tp5 Marie RANDRIANARISOA, priorité BASSE
        if (tp5 != null) {
            TaxDebt d5 = createDemoDebt(tp5, irsa, LocalDate.now().minusMonths(2),
                    new BigDecimal("780000"), BigDecimal.ZERO,
                    DebtStatus.SUSPENDED, DebtOrigin.OTHER, DebtCollectionPriority.LOW,
                    "Procédure de réclamation en cours. Contribuable a déposé une réclamation acceptée sous examen.",
                    "CEN-001", "admin");
            addDebtHistory(d5, "CREATED", "Créance liée à une imposition IRSA", null, "Montant : 780 000 MGA");
            addDebtHistory(d5, "SUSPENDED", "Créance suspendue pour réclamation", "ISSUED", "SUSPENDED");
        }

        // 6. Créance CLOSED — tp1, créance irrécouvrable ancienne
        TaxDebt d6 = createDemoDebt(tp1, tva, LocalDate.now().minusMonths(12),
                new BigDecimal("350000"), BigDecimal.ZERO,
                DebtStatus.CLOSED, DebtOrigin.AUDIT, DebtCollectionPriority.NORMAL,
                "Créance irrécouvrable — contribuable radié. Clôturée sur décision administrative.",
                "CEN-001", "admin");
        addDebtHistory(d6, "CREATED", "Créance issue d'un audit fiscal", null, "Montant : 350 000 MGA");
        addDebtHistory(d6, "CLOSED", "Créance clôturée — irrécouvrable", "OVERDUE", "CLOSED");

        // 7. Créance ISSUED récente — tp2 IRSA, priorité NORMALE
        if (tp2 != null) {
            TaxDebt d7 = createDemoDebt(tp2, irsa, today.minusWeeks(2),
                    new BigDecimal("180000"), BigDecimal.ZERO,
                    DebtStatus.ISSUED, DebtOrigin.ASSESSMENT, DebtCollectionPriority.NORMAL,
                    "Créance émise il y a 2 semaines. Échéance dans 2 semaines.",
                    "CEN-001", "agent.tax");
            addDebtHistory(d7, "CREATED", "Créance émise depuis imposition IRSA", null, "Montant : 180 000 MGA");
        }

        // 8. Créance PARTIALLY_PAID haute priorité — tp3 TVA
        if (tp3 != null) {
            TaxDebt d8 = createDemoDebt(tp3, tva, LocalDate.now().minusMonths(1),
                    new BigDecimal("850000"), new BigDecimal("300000"),
                    DebtStatus.PARTIALLY_PAID, DebtOrigin.DECLARATION, DebtCollectionPriority.HIGH,
                    "Paiement partiel reçu. Solde restant : 550 000 MGA. Relance nécessaire.",
                    "CEN-002", "agent.collection");
            addDebtHistory(d8, "CREATED", "Créance issue d'une déclaration TVA", null, "Montant : 850 000 MGA");
            addDebtHistory(d8, "PAYMENT_RECEIVED", "Paiement partiel de 300 000 MGA reçu", null, "300 000 MGA via VIREMENT");
            addDebtHistory(d8, "STATUS_CHANGE", "Statut passé à PARTIELLEMENT_PAYÉ", "ISSUED", "PARTIALLY_PAID");
        }

        // 9. Créance OVERDUE urgence — tp4 IS, priorité URGENTE
        if (tp4 != null) {
            TaxDebt d9 = createDemoDebt(tp4, is, LocalDate.now().minusMonths(4),
                    new BigDecimal("5000000"), new BigDecimal("1500000"),
                    DebtStatus.OVERDUE, DebtOrigin.RECOVERY, DebtCollectionPriority.URGENT,
                    "Créance en retard sévère. Plusieurs relances échouées. Risque de saisie administrative.",
                    "CEN-003", "agent.collection");
            addDebtHistory(d9, "CREATED", "Créance issue d'une procédure de recouvrement", null, "Montant : 5 000 000 MGA");
            addDebtHistory(d9, "PAYMENT_RECEIVED", "Paiement partiel de 1 500 000 MGA", null, "1 500 000 MGA");
            addDebtHistory(d9, "PENALTY_APPLIED", "Pénalité de retard appliquée", null, "175 000 MGA");
            addDebtHistory(d9, "STATUS_CHANGE", "Statut passé à EN_RETARD", "PARTIALLY_PAID", "OVERDUE");
        }
    }

    private TaxDebt createDemoDebt(Taxpayer tp, TaxType taxType, LocalDate issueDate,
                                    BigDecimal principal, BigDecimal paid,
                                    DebtStatus status, DebtOrigin origin,
                                    DebtCollectionPriority priority, String observations,
                                    String centerCode, String createdBy) {
        LocalDate dueDate = issueDate.plusDays(30);
        BigDecimal balance = principal.subtract(paid);
        if (balance.signum() < 0) balance = BigDecimal.ZERO;

        TaxDebt debt = TaxDebt.builder()
                .reference(com.mnktax.common.util.ReferenceGenerator.next("DEB"))
                .taxpayer(tp)
                .assessment(null)
                .taxType(taxType)
                .period(issueDate.getYear() + "-" + String.format("%02d", issueDate.getMonthValue()))
                .principalAmount(principal)
                .penaltyAmount(BigDecimal.ZERO)
                .interestAmount(BigDecimal.ZERO)
                .adjustmentsAmount(BigDecimal.ZERO)
                .creditsAmount(BigDecimal.ZERO)
                .totalAmount(principal)
                .paidAmount(paid)
                .balance(balance)
                .issueDate(issueDate)
                .dueDate(dueDate)
                .lastDueDate(dueDate)
                .status(status)
                .origin(origin)
                .collectionPriority(priority)
                .observations(observations)
                .createdBy(createdBy)
                .taxpayerCenter(centerCode)
                .closedAt(status == DebtStatus.CLOSED || status == DebtStatus.PAID ? Instant.now() : null)
                .suspendedAt(status == DebtStatus.SUSPENDED ? Instant.now() : null)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
        TaxDebt saved = debtRepository.save(debt);
        addItem(saved, DebtItem.Kind.PRINCIPAL, "Principal créance " + taxType.getCode() + " " + saved.getPeriod(), principal);
        if (paid.signum() > 0) {
            addItem(saved, DebtItem.Kind.CREDIT, "Paiement partiel", paid);
        }
        return saved;
    }

    private void addDebtHistory(TaxDebt debt, String eventType, String description,
                                String oldValue, String newValue) {
        debtHistoryRepository.save(DebtHistory.builder()
                .debt(debt)
                .eventType(eventType)
                .description(description)
                .oldValue(oldValue)
                .newValue(newValue)
                .performedBy("seed")
                .eventDate(Instant.now())
                .createdAt(Instant.now())
                .build());
    }

    private void addItem(TaxDebt debt, DebtItem.Kind kind, String label, BigDecimal amount) {
        if (amount == null || amount.signum() == 0) return;
        debtItemRepository.save(DebtItem.builder().debt(debt).kind(kind).label(label)
                .amount(amount).createdAt(Instant.now()).build());
    }

    private void seedMessages() {
        User admin = userRepository.findByUsername("admin").orElse(null);
        User agentTax = userRepository.findByUsername("agent.tax").orElse(null);
        User agentColl = userRepository.findByUsername("agent.collection").orElse(null);
        User accountant = userRepository.findByUsername("accountant").orElse(null);
        User taxpayerUser = userRepository.findByUsername("taxpayer.demo").orElse(null);
        if (admin == null || agentTax == null || agentColl == null || accountant == null) {
            return;
        }

        Taxpayer tp1 = taxpayerRepository.findByNif("0000409001").orElse(null);

        // 1. Message non lu — général
        messageRepository.save(Message.builder()
                .senderId(admin.getId()).senderName("Admin")
                .recipientId(agentTax.getId())
                .subject("Bienvenue sur la plateforme")
                .content("Bonjour, votre compte a été activé. Vous pouvez consulter les contribuables, les déclarations et les créances.")
                .read(false)
                .createdAt(Instant.now().minusSeconds(7200))
                .threadId(1L).contextType(MessageContextType.GENERAL)
                .priority(MessagePriority.NORMAL).processingStatus(MessageProcessingStatus.WAITING_RESPONSE)
                .build());

        // 2. Message lu — contexte déclaration
        Message m2 = messageRepository.save(Message.builder()
                .senderId(agentTax.getId()).senderName("Agent Fiscal")
                .recipientId(admin.getId())
                .subject("Vérification déclaration TVA")
                .content("Bonjour, la déclaration TVA de SOCIÉTÉ MALAGASY nécessite une vérification du centre fiscal. Pouvez-vous confirmer le centre CEN-001 ?")
                .read(true).readAt(Instant.now().minusSeconds(3000))
                .createdAt(Instant.now().minusSeconds(5400))
                .threadId(2L).contextType(MessageContextType.DECLARATION)
                .contextRef("DEC-2026-00001").taxpayerId(tp1 != null ? tp1.getId() : null)
                .priority(MessagePriority.NORMAL).processingStatus(MessageProcessingStatus.RESPONDED)
                .build());

        // 3. Réponse au message 2 — thread conversation
        Message m3 = messageRepository.save(Message.builder()
                .senderId(admin.getId()).senderName("Admin")
                .recipientId(agentTax.getId())
                .subject("Re: Vérification déclaration TVA")
                .content("Confirmé, le centre fiscal est bien CEN-001 (Analakely). Le contribuable est enregistré sous ce centre.")
                .read(true).readAt(Instant.now().minusSeconds(2400))
                .createdAt(Instant.now().minusSeconds(3600))
                .threadId(m2.getThreadId()).contextType(MessageContextType.DECLARATION)
                .contextRef("DEC-2026-00001").taxpayerId(tp1 != null ? tp1.getId() : null)
                .priority(MessagePriority.NORMAL).processingStatus(MessageProcessingStatus.CLOSED)
                .closedAt(Instant.now().minusSeconds(2400))
                .build());

        // 4. Message urgent — dette
        messageRepository.save(Message.builder()
                .senderId(agentColl.getId()).senderName("Agent Recouvrement")
                .recipientId(accountant.getId())
                .subject("Créance en retard — action requise")
                .content("La créance DET-2026-00001 du contribuable SOCIÉTÉ MALAGASY est en retard de paiement. Montant dû : 2 500 000 MGA. Une relance est nécessaire.")
                .read(false)
                .createdAt(Instant.now().minusSeconds(1800))
                .threadId(4L).contextType(MessageContextType.DEBT)
                .contextRef("DET-2026-00001").taxpayerId(tp1 != null ? tp1.getId() : null)
                .priority(MessagePriority.URGENT).processingStatus(MessageProcessingStatus.WAITING_RESPONSE)
                .build());

        // 5. Message important — paiement
        messageRepository.save(Message.builder()
                .senderId(accountant.getId()).senderName("Comptable")
                .recipientId(agentTax.getId())
                .subject("Paiement reçu — vérification")
                .content("Un paiement de 100 000 MGA a été reçu pour la créance DET-2026-00001. Le reçu sera disponible sous peu.")
                .read(false)
                .createdAt(Instant.now().minusSeconds(900))
                .threadId(5L).contextType(MessageContextType.PAYMENT)
                .contextRef("PAY-2026-00001").taxpayerId(tp1 != null ? tp1.getId() : null)
                .priority(MessagePriority.IMPORTANT).processingStatus(MessageProcessingStatus.WAITING_RESPONSE)
                .build());

        // 6. Message archivé — recouvrement
        messageRepository.save(Message.builder()
                .senderId(agentColl.getId()).senderName("Agent Recouvrement")
                .recipientId(admin.getId())
                .subject("Action de recouvrement terminée")
                .content("L'action de relance téléphonique pour la créance DET-2026-00002 a été effectuée. Le contribuable a promis un paiement sous 15 jours.")
                .read(true).readAt(Instant.now().minusSeconds(1000))
                .createdAt(Instant.now().minusSeconds(86400))
                .threadId(6L).contextType(MessageContextType.RECOVERY)
                .contextRef("DET-2026-00002").taxpayerId(tp1 != null ? tp1.getId() : null)
                .priority(MessagePriority.NORMAL).processingStatus(MessageProcessingStatus.ARCHIVED)
                .archivedAt(Instant.now().minusSeconds(500))
                .build());

        // 7. Message fermé — contrôle fiscal
        messageRepository.save(Message.builder()
                .senderId(agentTax.getId()).senderName("Agent Fiscal")
                .recipientId(admin.getId())
                .subject("Contrôle fiscal planifié")
                .content("Un contrôle fiscal est planifié pour le contribuable ENTREPRISE SARL (NIF: 9876543210) la semaine prochaine.")
                .read(true).readAt(Instant.now().minusSeconds(500))
                .createdAt(Instant.now().minusSeconds(172800))
                .threadId(7L).contextType(MessageContextType.AUDIT)
                .contextRef("CTRL-2026-001").taxpayerId(null)
                .priority(MessagePriority.IMPORTANT).processingStatus(MessageProcessingStatus.CLOSED)
                .closedAt(Instant.now().minusSeconds(86400))
                .build());

        // 8. Message non lu — échéance
        messageRepository.save(Message.builder()
                .senderId(admin.getId()).senderName("Admin")
                .recipientId(agentTax.getId())
                .subject("Échéance TVA à venir")
                .content("L'échéance de déclaration TVA pour la période " + LocalDate.now().getYear() + "-" + String.format("%02d", LocalDate.now().getMonthValue()) + " est dans 5 jours. Merci de vérifier les déclarations en attente.")
                .read(false)
                .createdAt(Instant.now().minusSeconds(600))
                .threadId(8L).contextType(MessageContextType.DEADLINE)
                .contextRef("TVA-" + LocalDate.now().getYear() + "-" + String.format("%02d", LocalDate.now().getMonthValue()))
                .priority(MessagePriority.URGENT).processingStatus(MessageProcessingStatus.WAITING_RESPONSE)
                .build());

        // 9. Message avec contribuable — réclamation
        if (taxpayerUser != null) {
            messageRepository.save(Message.builder()
                    .senderId(taxpayerUser.getId()).senderName("Contribuable")
                    .recipientId(agentTax.getId())
                    .subject("Réclamation montant déclaré")
                    .content("Bonjour, je souhaite contester le montant calculé sur ma déclaration IRSA du mois dernier. Le montant déclaré semble incorrect.")
                    .read(false)
                    .createdAt(Instant.now().minusSeconds(300))
                    .threadId(9L).contextType(MessageContextType.COMPLAINT)
                    .taxpayerId(tp1 != null ? tp1.getId() : null)
                    .priority(MessagePriority.NORMAL).processingStatus(MessageProcessingStatus.WAITING_RESPONSE)
                    .build());
        }
    }

    /**
     * Contrôles fiscaux de démonstration (données fictives).
     */
    private void seedControls() {
        User agentTax = userRepository.findByUsername("agent.tax").orElse(null);
        Taxpayer tp1 = taxpayerRepository.findByNif("0000409001").orElse(null);
        Taxpayer tp3 = taxpayerRepository.findByNif("9876543210").orElse(null);
        if (tp1 == null || tp3 == null) {
            return;
        }
        Long agentId = agentTax != null ? agentTax.getId() : null;

        // 1. Contrôle en cours sur SOCIÉTÉ MALAGASY
        TaxControl open = TaxControl.builder()
                .reference(com.mnktax.common.util.ReferenceGenerator.next("CTRL"))
                .taxpayer(tp1)
                .agentId(agentId)
                .controlType(ControlType.MIXED)
                .periodStart(LocalDate.now().minusMonths(2))
                .periodEnd(LocalDate.now())
                .reason("Vérification de cohérence des déclarations TVA et des pièces comptables.")
                .status(ControlStatus.IN_PROGRESS)
                .startedAt(Instant.now().minus(java.time.Duration.ofDays(15)))
                .observations("Vérification en cours, pièces en attente de transmission.")
                .createdAt(Instant.now().minus(java.time.Duration.ofDays(20)))
                .updatedAt(Instant.now())
                .build();
        controlRepository.save(open);
        controlDocumentRepository.save(ControlDocument.builder()
                .control(open).title("Grand livre comptable").documentType("COMPTABLE")
                .requested(true).received(true).createdAt(Instant.now()).build());

        // 2. Contrôle clôturé avec redressement sur ENTREPRISE SARL
        TaxControl closed = TaxControl.builder()
                .reference(com.mnktax.common.util.ReferenceGenerator.next("CTRL"))
                .taxpayer(tp3)
                .agentId(agentId)
                .controlType(ControlType.ON_SITE)
                .periodStart(LocalDate.now().minusMonths(8))
                .periodEnd(LocalDate.now().minusMonths(6))
                .reason("Contrôle sur place suite à des écarts constatés dans les déclarations IFT.")
                .status(ControlStatus.REDRESSEMENT)
                .startedAt(Instant.now().minus(java.time.Duration.ofDays(180)))
                .completedAt(Instant.now().minus(java.time.Duration.ofDays(90)))
                .observations("Anomalies confirmées : bases déclarées inférieures aux bases réelles.")
                .anomalies("Sous-déclaration de la base IFT sur deux exercices.")
                .redressement(new BigDecimal("450000"))
                .penaltyAmount(new BigDecimal("22500"))
                .createdAt(Instant.now().minus(java.time.Duration.ofDays(210)))
                .updatedAt(Instant.now())
                .build();
        controlRepository.save(closed);
        controlDocumentRepository.save(ControlDocument.builder()
                .control(closed).title("Bilans et relevés fonciers").documentType("FONCIER")
                .requested(true).received(true).createdAt(Instant.now()).build());
    }

    /* ═══════════════════════════ Notifications ═══════════════════════════ */
    private void seedNotifications() {
        User admin = userRepository.findByUsername("admin").orElse(null);
        User agentTax = userRepository.findByUsername("agent.tax").orElse(null);
        User agentColl = userRepository.findByUsername("agent.collection").orElse(null);
        if (admin == null || agentTax == null) return;

        Taxpayer tp1 = taxpayerRepository.findByNif("0000409001").orElse(null);
        String period = LocalDate.now().getYear() + "-" + String.format("%02d", LocalDate.now().getMonthValue());

        createNotification(agentTax.getId(), NotificationType.DEADLINE_APPROACHING,
                "Échéance TVA à venir",
                "La date limite de déclaration TVA pour la période " + period + " approche.",
                "DEADLINE", period, false);
        createNotification(admin.getId(), NotificationType.PAYMENT_RECEIVED,
                "Paiement reçu — 100 000 MGA",
                "Un paiement a été enregistré pour le contribuable SOCIÉTÉ MALAGASY.",
                "PAYMENT", null, true);
        createNotification(agentColl.getId(), NotificationType.OVERDUE,
                "Créance en retard — TRANSPORT SA",
                "La créance TVA de TRANSPORT SA est en retard de 3 mois. Action de recouvrement requise.",
                "DEBT", null, false);
        createNotification(admin.getId(), NotificationType.COLLECTION_NOTICE,
                "Mise en demeure envoyée",
                "Une mise en demeure a été envoyée pour la créance IN_COLLECTION de TRANSPORT SA.",
                "COLLECTION", null, true);
        createNotification(agentTax.getId(), NotificationType.DOCUMENT_READY,
                "Quittance disponible",
                "La quittance pour le paiement de SOCIÉTÉ MALAGASY est prête.",
                "RECEIPT", null, false);
        createNotification(admin.getId(), NotificationType.MESSAGE_RECEIVED,
                "Nouveau message — Urgent",
                "L'agent de recouvrement signale une créance en retard nécessitant une action immédiate.",
                "MESSAGE", null, false);
        createNotification(agentTax.getId(), NotificationType.DEADLINE_TODAY,
                "Échéance IRSA aujourd'hui",
                "La date limite de déclaration IRSA pour la période " + period + " est aujourd'hui.",
                "DEADLINE", period, false);
        createNotification(admin.getId(), NotificationType.PAYMENT_REJECTED,
                "Paiement rejeté — CHQ-001",
                "Un chèque de 500 000 MGA a été rejeté par la banque pour le contribuable ENTREPRISE SARL.",
                "PAYMENT", null, false);
    }

    private void createNotification(Long userId, NotificationType type, String title,
                                    String message, String entityType, String entityId, boolean read) {
        notificationRepository.save(Notification.builder()
                .userId(userId).type(type).title(title).message(message)
                .entityType(entityType).entityId(entityId)
                .read(read).readAt(read ? Instant.now().minusSeconds(600) : null)
                .createdAt(Instant.now().minusSeconds((long) (Math.random() * 86400)))
                .build());
    }

    /* ═══════════════════════════ Audit Logs ═══════════════════════════ */
    private void seedAuditLogs() {
        User admin = userRepository.findByUsername("admin").orElse(null);
        User agentTax = userRepository.findByUsername("agent.tax").orElse(null);
        User agentColl = userRepository.findByUsername("agent.collection").orElse(null);
        if (admin == null || agentTax == null) return;

        Taxpayer tp1 = taxpayerRepository.findByNif("0000409001").orElse(null);
        Taxpayer tp2 = taxpayerRepository.findByNif("1234567890").orElse(null);
        Taxpayer tp3 = taxpayerRepository.findByNif("9876543210").orElse(null);

        createAuditLog(admin.getId(), "admin", "CREATE", "Taxpayer", tp1 != null ? String.valueOf(tp1.getId()) : null,
                null, "NIF: 0000409001 — SOCIÉTÉ MALAGASY", "192.168.1.10");
        createAuditLog(agentTax.getId(), "agent.tax", "VALIDATE", "Declaration", null,
                "DRAFT", "VALIDATED", "192.168.1.15");
        createAuditLog(agentColl.getId(), "agent.collection", "UPDATE", "Debt", null,
                "OVERDUE", "IN_COLLECTION", "192.168.1.20");
        createAuditLog(admin.getId(), "admin", "CREATE", "User", null,
                null, "Utilisateur 'agent.tax' créé", "192.168.1.10");
        createAuditLog(agentTax.getId(), "agent.tax", "VIEW", "Assessment", null,
                null, null, "192.168.1.15");
        createAuditLog(agentColl.getId(), "agent.collection", "COLLECTION_ACTION", "Debt", null,
                null, "Action de relance enregistrée", "192.168.1.20");
        createAuditLog(admin.getId(), "admin", "UPDATE", "SystemParameter", null,
                "VAT_RATE=18", "VAT_RATE=20", "192.168.1.10");
        createAuditLog(agentTax.getId(), "agent.tax", "CREATE", "Declaration", null,
                null, "Déclaration TVA créée pour ENTREPRISE SARL", "192.168.1.15");
        createAuditLog(agentColl.getId(), "agent.collection", "EXPORT", "Debt", null,
                null, null, "192.168.1.20");
        createAuditLog(admin.getId(), "admin", "LOGIN", "User", String.valueOf(admin.getId()),
                null, "Connexion réussie", "192.168.1.10");
        createAuditLog(agentTax.getId(), "agent.tax", "CONTROL", "TaxControl", null,
                null, "Contrôle fiscal initié — mode mixte", "192.168.1.15");
    }

    private void createAuditLog(Long userId, String username, String action,
                                String entityType, String entityId,
                                String oldValue, String newValue, String ip) {
        auditLogRepository.save(AuditLog.builder()
                .userId(userId).username(username).action(action)
                .entityType(entityType).entityId(entityId)
                .oldValue(oldValue).newValue(newValue)
                .ipAddress(ip).userAgent("Mozilla/5.0 (Demo)")
                .createdAt(Instant.now().minusSeconds((long) (Math.random() * 604800)))
                .build());
    }

    /* ═══════════════════════════ Réclamations ═══════════════════════════ */
    private void seedComplaints() {
        User agentTax = userRepository.findByUsername("agent.tax").orElse(null);
        User admin = userRepository.findByUsername("admin").orElse(null);
        Taxpayer tp1 = taxpayerRepository.findByNif("0000409001").orElse(null);
        Taxpayer tp3 = taxpayerRepository.findByNif("9876543210").orElse(null);
        Taxpayer tp5 = taxpayerRepository.findByNif("1000000001").orElse(null);
        if (agentTax == null || tp1 == null) return;

        // 1. Réclamation ouverte — contestation montant TVA
        Complaint c1 = complaintRepository.save(Complaint.builder()
                .reference(com.mnktax.common.util.ReferenceGenerator.next("REC"))
                .taxpayer(tp1)
                .subject("Contestation montant TVA déclaré")
                .description("Le contribuable conteste le montant de la TVA calculée pour la période " +
                        LocalDate.now().getYear() + "-" + String.format("%02d", LocalDate.now().getMonthValue()) +
                        ". Il affirme que la base d'imposition est incorrecte.")
                .contextType(ContextType.DECLARATION)
                .contextRef("DEC-2026-00001")
                .status(ComplaintStatus.UNDER_REVIEW)
                .assignedTo(agentTax.getId())
                .createdAt(Instant.now().minus(java.time.Duration.ofDays(5)))
                .updatedAt(Instant.now())
                .build());

        complaintResponseRepository.save(ComplaintResponse.builder()
                .complaint(c1).authorId(agentTax.getId()).authorName("Agent Fiscal")
                .content("Réclamation en cours d'examen. Vérification de la base d'imposition avec les pièces comptables.")
                .createdAt(Instant.now().minus(java.time.Duration.ofDays(3)))
                .build());

        complaintResponseRepository.save(ComplaintResponse.builder()
                .complaint(c1).authorId(admin.getId()).authorName("Admin")
                .content("Complément de pièces demandé au contribuable. Délai de 10 jours.")
                .createdAt(Instant.now().minus(java.time.Duration.ofDays(1)))
                .build());

        // 2. Réclamation acceptée — pénalité injustifiée
        Complaint c2 = complaintRepository.save(Complaint.builder()
                .reference(com.mnktax.common.util.ReferenceGenerator.next("REC"))
                .taxpayer(tp3)
                .subject("Pénalité de retard contestée — IFT")
                .description("La pénalité de retard appliquée est contestée. Le contribuable justifie un cas de force majeure (catastrophe naturelle).")
                .contextType(ContextType.DEBT)
                .contextRef("DEB-2026-001")
                .status(ComplaintStatus.ACCEPTED)
                .assignedTo(agentTax.getId())
                .resolution("Pénalité annulée — cas de force majeure confirmé.")
                .resolvedAt(Instant.now().minus(java.time.Duration.ofDays(2)))
                .closedAt(Instant.now().minus(java.time.Duration.ofDays(1)))
                .createdAt(Instant.now().minus(java.time.Duration.ofDays(15)))
                .updatedAt(Instant.now())
                .build());

        complaintResponseRepository.save(ComplaintResponse.builder()
                .complaint(c2).authorId(agentTax.getId()).authorName("Agent Fiscal")
                .content("Analyse terminée. Le cas de force majeure est confirmé par les documents fournis. La pénalité est annulée.")
                .createdAt(Instant.now().minus(java.time.Duration.ofDays(2)))
                .build());

        // 3. Réclamation rejetée
        if (tp5 != null) {
            Complaint c3 = complaintRepository.save(Complaint.builder()
                    .reference(com.mnktax.common.util.ReferenceGenerator.next("REC"))
                    .taxpayer(tp5)
                    .subject("Remboursement TVA refusé")
                    .description("Le contribuable demande le remboursement d'un crédit TVA de 250 000 MGA. Après vérification, le crédit n'est pas justifié.")
                    .contextType(ContextType.REFUND)
                    .status(ComplaintStatus.REJECTED)
                    .assignedTo(agentTax.getId())
                    .resolution("Remboursement rejeté — crédit TVA non justifié par les pièces comptables.")
                    .resolvedAt(Instant.now().minus(java.time.Duration.ofDays(7)))
                    .closedAt(Instant.now().minus(java.time.Duration.ofDays(6)))
                    .createdAt(Instant.now().minus(java.time.Duration.ofDays(20)))
                    .updatedAt(Instant.now())
                    .build());

            complaintResponseRepository.save(ComplaintResponse.builder()
                    .complaint(c3).authorId(agentTax.getId()).authorName("Agent Fiscal")
                    .content("Après vérification, les factures fournies ne justifient pas le crédit TVA réclamé. Rejet confirmé.")
                    .createdAt(Instant.now().minus(java.time.Duration.ofDays(7)))
                    .build());
        }
    }

    /* ═══════════════════════════ Remboursements ═══════════════════════════ */
    private void seedRefunds() {
        User agentTax = userRepository.findByUsername("agent.tax").orElse(null);
        Taxpayer tp1 = taxpayerRepository.findByNif("0000409001").orElse(null);
        Taxpayer tp4 = taxpayerRepository.findByNif("0000412345").orElse(null);
        if (tp1 == null || agentTax == null) return;

        // 1. Remboursement en cours — excédent TVA
        refundRepository.save(Refund.builder()
                .reference(com.mnktax.common.util.ReferenceGenerator.next("REM"))
                .taxpayer(tp1)
                .reason(RefundReason.VAT_CREDIT)
                .description("Crédit TVA excédentaire du mois précédent. Montant calculé : 350 000 MGA.")
                .amount(new BigDecimal("350000"))
                .status(RefundStatus.UNDER_REVIEW)
                .requestedBy("agent.tax")
                .reviewedBy("agent.tax")
                .reviewedAt(Instant.now().minus(java.time.Duration.ofDays(3)))
                .createdAt(Instant.now().minus(java.time.Duration.ofDays(10)))
                .updatedAt(Instant.now())
                .build());

        // 2. Remboursement approuvé et payé
        if (tp4 != null) {
            refundRepository.save(Refund.builder()
                    .reference(com.mnktax.common.util.ReferenceGenerator.next("REM"))
                    .taxpayer(tp4)
                    .reason(RefundReason.OVERPAYMENT)
                    .description("Surpaiement constaté sur la déclaration IS. Le contribuable a payé 2 500 000 MGA au lieu de 2 000 000 MGA.")
                    .amount(new BigDecimal("500000"))
                    .status(RefundStatus.PAID)
                    .requestedBy("agent.collection")
                    .reviewedBy("admin")
                    .reviewedAt(Instant.now().minus(java.time.Duration.ofDays(20)))
                    .approvedAmount(new BigDecimal("500000"))
                    .paymentMethod("BANK_TRANSFER")
                    .paymentReference("VIR-2026-REM-001")
                    .paidAt(Instant.now().minus(java.time.Duration.ofDays(5)))
                    .createdAt(Instant.now().minus(java.time.Duration.ofDays(30)))
                    .updatedAt(Instant.now())
                    .build());
        }

        // 3. Remboursement rejeté
        refundRepository.save(Refund.builder()
                .reference(com.mnktax.common.util.ReferenceGenerator.next("REM"))
                .taxpayer(tp1)
                .reason(RefundReason.OTHER)
                .description("Demande de remboursement pour erreur de virement. Le contribuable affirme avoir effectué un double paiement.")
                .amount(new BigDecimal("150000"))
                .status(RefundStatus.REJECTED)
                .requestedBy("agent.tax")
                .reviewedBy("admin")
                .reviewedAt(Instant.now().minus(java.time.Duration.ofDays(5)))
                .rejectionReason("Aucune preuve de double paiement trouvée dans les relevés bancaires.")
                .createdAt(Instant.now().minus(java.time.Duration.ofDays(12)))
                .updatedAt(Instant.now())
                .build());
    }

    /* ═══════════════════════════ Mises en demeure ═══════════════════════════ */
    private void seedCollectionNotices() {
        List<TaxDebt> inCollectionDebts = debtRepository.findByStatusAndDueDateBefore(
                DebtStatus.IN_COLLECTION, LocalDate.now());
        if (inCollectionDebts.isEmpty()) {
            // fallback: use overdue debts
            inCollectionDebts = debtRepository.findByStatusAndDueDateBefore(
                    DebtStatus.OVERDUE, LocalDate.now());
        }
        if (inCollectionDebts.isEmpty()) return;

        TaxDebt d1 = inCollectionDebts.get(0);
        collectionNoticeRepository.save(CollectionNotice.builder()
                .debt(d1)
                .noticeNumber("MD-" + LocalDate.now().getYear() + "-" + String.format("%04d", 1))
                .noticeDate(LocalDate.now().minusDays(20))
                .noticeType("MISE_EN_DEMEURE")
                .content("Mise en demeure : Vous êtes prié de régulariser votre situation fiscale dans un délai de 30 jours.")
                .sentAt(Instant.now().minus(java.time.Duration.ofDays(18)))
                .status("SENT")
                .createdAt(Instant.now().minus(java.time.Duration.ofDays(20)))
                .build());

        collectionNoticeRepository.save(CollectionNotice.builder()
                .debt(d1)
                .noticeNumber("REL-" + LocalDate.now().getYear() + "-" + String.format("%04d", 1))
                .noticeDate(LocalDate.now().minusDays(10))
                .noticeType("RELANCE")
                .content("Relance : Suite à la mise en demeure du " + LocalDate.now().minusDays(20) + ", merci de procéder au paiement.")
                .sentAt(Instant.now().minus(java.time.Duration.ofDays(8)))
                .status("SENT")
                .createdAt(Instant.now().minus(java.time.Duration.ofDays(10)))
                .build());

        if (inCollectionDebts.size() > 1) {
            TaxDebt d2 = inCollectionDebts.get(1);
            collectionNoticeRepository.save(CollectionNotice.builder()
                    .debt(d2)
                    .noticeNumber("AV-" + LocalDate.now().getYear() + "-" + String.format("%04d", 1))
                    .noticeDate(LocalDate.now().minusDays(5))
                    .noticeType("AVERTISSEMENT")
                    .content("Avertissement : Votre créance est en retard. Veuillez régulariser dans les meilleurs délais.")
                    .status("DRAFT")
                    .createdAt(Instant.now().minus(java.time.Duration.ofDays(5)))
                    .build());
        }
    }

    /**
     * Complète les scénarios du module Recouvrement : litige réellement lié à la
     * créance DISPUTED, créances en retard à 5 et 35 jours (paliers 30–60 jours
     * du tableau de bord) et échéancier de paiement actif comportant une tranche
     * échue impayée (alerte tranche en retard). Exécuté une seule fois sur base
     * vierge, comme l'ensemble du seed de démonstration.
     */
    private void seedCollectionWorkflows() {
        if (disputeRepository.count() > 0 && planRepository.count() > 0) {
            return;
        }
        LocalDate today = LocalDate.now();

        Taxpayer tp1 = taxpayerRepository.findByNif("0000409001").orElse(null);
        Taxpayer tp2 = taxpayerRepository.findByNif("1234567890").orElse(null);
        Taxpayer tp4 = taxpayerRepository.findByNif("0000412345").orElse(null);
        TaxType tva = taxTypeRepository.findByCode("TVA").orElse(null);
        TaxType irsa = taxTypeRepository.findByCode("IRSA").orElse(null);
        if (tp1 == null || tp2 == null || tp4 == null || tva == null || irsa == null) return;

        // 1. Litige documenté sur la créance déjà DISPUTED (un litige réellement
        //    enregistré, pas seulement un statut affiché).
        debtRepository.findAll().stream()
                .filter(d -> d.getStatus() == DebtStatus.DISPUTED
                        && !disputeRepository.existsByDebtIdAndStatus(d.getId(), DisputeStatus.OPEN))
                .findFirst()
                .ifPresent(debt -> {
                    DebtDispute dispute = DebtDispute.builder()
                            .reference(com.mnktax.common.util.ReferenceGenerator.next("LIT"))
                            .debt(debt)
                            .reason("Contestation de la base d'imposition redressée — vérification sur pièces en cours.")
                            .contestedAmount(debt.getTotalAmount())
                            .contestationDate(today.minusDays(45))
                            .status(DisputeStatus.OPEN)
                            .createdBy("seed")
                            .createdAt(Instant.now())
                            .updatedAt(Instant.now())
                            .build();
                    disputeRepository.save(dispute);
                    addDebtHistory(debt, "DISPUTE_CREATED",
                            "Litige " + dispute.getReference()
                                    + " enregistré — contestation de la base imposable",
                            null, dispute.getReference());
                });

        // 2. Créance en retard de 5 jours (327 000 MGA, spec §54) avec relance
        //    amiable envoyée → visible dans En retard et Relances.
        if (tp2 != null) {
            TaxDebt dA = createDemoDebt(tp2, irsa, today.minusDays(35),
                    new BigDecimal("327000"), BigDecimal.ZERO,
                    DebtStatus.OVERDUE, DebtOrigin.ASSESSMENT, DebtCollectionPriority.HIGH,
                    "Créance en retard de 5 jours. Relance amiable envoyée, en attente de paiement.",
                    "CEN-001", "agent.tax");
            addDebtHistory(dA, "CREATED", "Créance émise depuis une imposition IRSA", null, "Montant : 327 000 MGA");
            addDebtHistory(dA, "STATUS_CHANGE", "Statut passé à EN_RETARD", "ISSUED", "OVERDUE");
            actionRepository.save(CollectionAction.builder().debt(dA)
                    .type(CollectionActionType.REMINDER)
                    .description("Relance amiable n°1 — demande de régularisation de la créance "
                            + dA.getReference() + ".")
                    .actionDate(today.minusDays(1))
                    .outcome("En attente de paiement")
                    .responsibleUserId(4L).status("DONE")
                    .createdAt(Instant.now()).build());
            addDebtHistory(dA, "REMINDER_CREATED",
                    "Relance amiable créée (canal : notification interne)",
                    null, dA.getReference());
        }

        // 3. Créance en retard de 35 jours (palier 30–60 jours du tableau de bord).
        if (tp1 != null) {
            TaxDebt dB = createDemoDebt(tp1, tva, today.minusDays(65),
                    new BigDecimal("1250000"), BigDecimal.ZERO,
                    DebtStatus.OVERDUE, DebtOrigin.DECLARATION, DebtCollectionPriority.URGENT,
                    "Créance TVA en retard de 35 jours — aucun paiement reçu, relance à programmer.",
                    "CEN-001", "agent.collection");
            addDebtHistory(dB, "CREATED", "Créance issue d'une déclaration TVA", null, "Montant : 1 250 000 MGA");
            addDebtHistory(dB, "PENALTY_APPLIED", "Pénalité de retard appliquée", null, "62 500 MGA");
            addDebtHistory(dB, "STATUS_CHANGE", "Statut passé à EN_RETARD", "ISSUED", "OVERDUE");
        }

        // 4. Échéancier de paiement actif sur la créance en retard de 35 jours
        //    ci-dessus (1 250 000 MGA, aucun paiement enregistré) en 4 tranches :
        //    la 1re tranche est échue et impayée → alerte tranche en retard dans
        //    /collection/plans. Aucun paiement direct n'a été écrit en base : la
        //    source de vérité des tranches reste les allocations réelles (FIFO).
        if (tp1 != null) {
            TaxDebt planDebt = debtRepository.findAll().stream()
                    .filter(d -> d.getStatus() == DebtStatus.OVERDUE
                            && d.getTaxpayer().getId().equals(tp1.getId())
                            && d.getObservations() != null
                            && d.getObservations().contains("35 jours"))
                    .findFirst().orElse(null);
            if (planDebt != null) {
                BigDecimal tranche = planDebt.getBalance().divide(BigDecimal.valueOf(4), 0, java.math.RoundingMode.HALF_UP);
                BigDecimal last = planDebt.getBalance().subtract(tranche.multiply(BigDecimal.valueOf(3)));
                Instant now = Instant.now();
                String ref = com.mnktax.common.util.ReferenceGenerator.next("ECH");
                PaymentPlan plan = PaymentPlan.builder()
                        .reference(ref)
                        .debt(planDebt)
                        .label("Échéancier TVA — solde " + planDebt.getReference())
                        .totalAmount(planDebt.getBalance())
                        .status(PaymentPlanStatus.ACTIVE)
                        .notes("Échéancier accepté en 4 tranches mensuelles ; la 1re tranche est échue et impayée.")
                        .createdBy("seed")
                        .createdAt(now)
                        .updatedAt(now)
                        .build();
                plan.addInstallment(PaymentPlanInstallment.builder()
                        .installmentNumber(1).dueDate(today.minusDays(5)).amount(tranche)
                        .paidAmount(BigDecimal.ZERO).status(InstallmentStatus.PENDING)
                        .createdAt(now).updatedAt(now).build());
                plan.addInstallment(PaymentPlanInstallment.builder()
                        .installmentNumber(2).dueDate(today.plusMonths(1)).amount(tranche)
                        .paidAmount(BigDecimal.ZERO).status(InstallmentStatus.PENDING)
                        .createdAt(now).updatedAt(now).build());
                plan.addInstallment(PaymentPlanInstallment.builder()
                        .installmentNumber(3).dueDate(today.plusMonths(2)).amount(tranche)
                        .paidAmount(BigDecimal.ZERO).status(InstallmentStatus.PENDING)
                        .createdAt(now).updatedAt(now).build());
                plan.addInstallment(PaymentPlanInstallment.builder()
                        .installmentNumber(4).dueDate(today.plusMonths(3)).amount(last)
                        .paidAmount(BigDecimal.ZERO).status(InstallmentStatus.PENDING)
                        .createdAt(now).updatedAt(now).build());
                planRepository.save(plan);
                actionRepository.save(CollectionAction.builder().debt(planDebt)
                        .type(CollectionActionType.PAYMENT_PLAN)
                        .description("Échéancier " + ref + " créé — " + planDebt.getBalance()
                                + " MGA en 4 tranches")
                        .actionDate(today)
                        .outcome("Échéancier actif")
                        .responsibleUserId(4L).status("COMPLETED")
                        .createdAt(now).build());
                addDebtHistory(planDebt, "PAYMENT_PLAN_CREATED",
                        "Échéancier " + ref + " : " + planDebt.getBalance()
                                + " MGA en 4 tranches mensuelles",
                        null, ref);
            }
        }
    }

    /* ═══════════════════════════ Annexes + Historique déclarations ═══════════════════════════ */
    private void seedDeclarationExtras() {
        List<com.mnktax.declaration.entity.Declaration> declarations = declarationRepository.findAll();
        if (declarations.isEmpty()) return;

        com.mnktax.declaration.entity.Declaration d1 = declarations.get(0);

        // Annexes
        declarationAnnexeRepository.save(DeclarationAnnexe.builder()
                .declaration(d1)
                .nom("bilan_comptable_2026.pdf")
                .fichier("/data/documents/bilan_comptable_2026.pdf")
                .typeMime("application/pdf")
                .taille(245000L)
                .categorie("COMPTABLE")
                .obligatoire(true)
                .uploadedBy("agent.tax")
                .createdAt(Instant.now())
                .build());

        declarationAnnexeRepository.save(DeclarationAnnexe.builder()
                .declaration(d1)
                .nom("etat_resultat.xlsx")
                .fichier("/data/documents/etat_resultat.xlsx")
                .typeMime("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
                .taille(128000L)
                .categorie("COMPTABLE")
                .obligatoire(true)
                .uploadedBy("agent.tax")
                .createdAt(Instant.now())
                .build());

        declarationAnnexeRepository.save(DeclarationAnnexe.builder()
                .declaration(d1)
                .nom("justificatif_domicile.pdf")
                .fichier("/data/documents/justificatif_domicile.pdf")
                .typeMime("application/pdf")
                .taille(52000L)
                .categorie("GENERAL")
                .obligatoire(false)
                .uploadedBy("taxpayer.demo")
                .createdAt(Instant.now())
                .build());

        // Historiques
        declarationHistoryRepository.save(DeclarationHistory.builder()
                .declaration(d1)
                .userId(1L).username("admin")
                .action("CREATION")
                .nouveauStatut("DRAFT")
                .commentaire("Déclaration créée automatiquement par le système.")
                .createdAt(Instant.now().minus(java.time.Duration.ofDays(7)))
                .build());

        declarationHistoryRepository.save(DeclarationHistory.builder()
                .declaration(d1)
                .userId(3L).username("agent.tax")
                .action("SOUMISSION")
                .ancienStatut("DRAFT").nouveauStatut("SUBMITTED")
                .commentaire("Déclaration soumise pour validation.")
                .createdAt(Instant.now().minus(java.time.Duration.ofDays(5)))
                .build());

        declarationHistoryRepository.save(DeclarationHistory.builder()
                .declaration(d1)
                .userId(1L).username("admin")
                .action("VALIDATION")
                .ancienStatut("SUBMITTED").nouveauStatut("VALIDATED")
                .commentaire("Déclaration validée après vérification.")
                .nouvellesDonnees("{\"validatedBy\":\"admin\",\"validationComment\":\"Conforme\"}")
                .createdAt(Instant.now().minus(java.time.Duration.ofDays(3)))
                .build());

        // Si déclaration rectificative pour tp3 (brouillon)
        if (declarations.size() > 2) {
            com.mnktax.declaration.entity.Declaration d3 = declarations.get(declarations.size() - 1);
            declarationHistoryRepository.save(DeclarationHistory.builder()
                    .declaration(d3)
                    .userId(1L).username("admin")
                    .action("CREATION")
                    .nouveauStatut("DRAFT")
                    .commentaire("Déclaration TVA en brouillon pour ENTREPRISE SARL.")
                    .createdAt(Instant.now().minus(java.time.Duration.ofDays(2)))
                    .build());
        }
    }

    /* ═══════════════════════════ Documents ═══════════════════════════ */
    private void seedDocuments() {
        Taxpayer tp1 = taxpayerRepository.findByNif("0000409001").orElse(null);
        Taxpayer tp3 = taxpayerRepository.findByNif("9876543210").orElse(null);
        Taxpayer tp4 = taxpayerRepository.findByNif("0000412345").orElse(null);
        if (tp1 == null) return;

        documentRepository.save(Document.builder()
                .taxpayer(tp1).title("Kbis - SOCIÉTÉ MALAGASY")
                .documentType("Kbis")
                .filePath("/data/documents/kbis_tp1.pdf")
                .mimeType("application/pdf").size(320000L)
                .uploadedBy("agent.tax")
                .createdAt(Instant.now().minus(java.time.Duration.ofDays(365)))
                .build());

        documentRepository.save(Document.builder()
                .taxpayer(tp1).title("Contrat social")
                .documentType("CONTRAT")
                .filePath("/data/documents/contrat_social_tp1.pdf")
                .mimeType("application/pdf").size(180000L)
                .uploadedBy("agent.tax")
                .createdAt(Instant.now().minus(java.time.Duration.ofDays(300)))
                .build());

        if (tp3 != null) {
            documentRepository.save(Document.builder()
                    .taxpayer(tp3).title("Patente ENTREPRISE SARL")
                    .documentType("PATENTE")
                    .filePath("/data/documents/patente_tp3.pdf")
                    .mimeType("application/pdf").size(210000L)
                    .uploadedBy("agent.tax")
                    .createdAt(Instant.now().minus(java.time.Duration.ofDays(180)))
                    .build());
        }

        if (tp4 != null) {
            documentRepository.save(Document.builder()
                    .taxpayer(tp4).title("Autorisation transport TRANSPORT SA")
                    .documentType("AUTORISATION")
                    .filePath("/data/documents/autorisation_tp4.pdf")
                    .mimeType("application/pdf").size(150000L)
                    .uploadedBy("agent.tax")
                    .createdAt(Instant.now().minus(java.time.Duration.ofDays(120)))
                    .build());
        }
    }

    /* ═══════════════════════════ Quittances ═══════════════════════════ */
    private void seedReceipts() {
        List<Payment> payments = paymentRepository.findAll();
        if (payments.isEmpty()) return;

        // Quittance 1: VALID/ISSUED — paiement complet (tp1, TVA)
        if (receiptRepository.count() >= 6) return;

        Payment p1 = payments.stream().filter(p -> p.getStatus() == com.mnktax.payment.entity.PaymentStatus.ALLOCATED)
                .findFirst().orElse(payments.get(0));
        createDemoReceipt(p1, ReceiptStatus.ISSUED, "REC-DEMO-001", 30);

        // Quittance 2: VALID — paiement partiel
        Payment p2 = payments.stream().skip(1).filter(p -> p.getStatus() == com.mnktax.payment.entity.PaymentStatus.ALLOCATED)
                .findFirst().orElse(payments.size() > 1 ? payments.get(1) : payments.get(0));
        createDemoReceipt(p2, ReceiptStatus.ISSUED, "REC-DEMO-002", 25);

        // Quittance 3: CANCELLED
        Payment p3 = payments.stream().skip(2).findFirst().orElse(payments.get(0));
        Receipt cancelled = createDemoReceipt(p3, ReceiptStatus.ISSUED, "REC-DEMO-003", 20);
        if (cancelled != null && cancelled.getStatus() != ReceiptStatus.CANCELLED) {
            cancelled.setStatus(ReceiptStatus.CANCELLED);
            cancelled.setCancelledReason("Démonstration — annulation test");
            cancelled.setCancelledBy("seed");
            cancelled.setCancelledAt(Instant.now().minus(java.time.Duration.ofDays(15)));
            receiptRepository.save(cancelled);
        }

        // Quittance 4: REPLACED
        Payment p4 = payments.stream().skip(3).findFirst().orElse(payments.get(0));
        Receipt replaced = createDemoReceipt(p4, ReceiptStatus.ISSUED, "REC-DEMO-004", 15);
        if (replaced != null && replaced.getStatus() == ReceiptStatus.ISSUED) {
            replaced.setStatus(ReceiptStatus.REPLACED);
            replaced.setReplacedByReference("REC-DEMO-004-BIS");
            replaced.setReplacedAt(Instant.now().minus(java.time.Duration.ofDays(10)));
            receiptRepository.save(replaced);
        }

        // Quittance 5: REFUNDED
        Payment p5 = payments.stream().skip(4).findFirst().orElse(payments.get(0));
        Receipt refunded = createDemoReceipt(p5, ReceiptStatus.ISSUED, "REC-DEMO-005", 10);
        if (refunded != null && refunded.getStatus() == ReceiptStatus.ISSUED) {
            refunded.setStatus(ReceiptStatus.REFUNDED);
            refunded.setRefundReference("REM-DEMO-001");
            refunded.setUpdatedAt(Instant.now().minus(java.time.Duration.ofDays(5)));
            receiptRepository.save(refunded);
        }

        // Quittance 6: ISSUED — QR vérifiable
        Payment p6 = payments.stream().skip(5).findFirst().orElse(payments.get(0));
        createDemoReceipt(p6, ReceiptStatus.ISSUED, "REC-DEMO-006", 3);
    }

    private Receipt createDemoReceipt(Payment payment, ReceiptStatus status, String refSuffix, int daysAgo) {
        if (receiptRepository.findByPaymentId(payment.getId()).isPresent()) {
            return receiptRepository.findByPaymentId(payment.getId()).orElse(null);
        }
        com.mnktax.debt.entity.TaxDebt debt = payment.getDebt();
        com.mnktax.declaration.entity.Declaration decl = payment.getDeclaration();
        String centerCode = null;
        if (debt != null && debt.getTaxpayerCenter() != null) {
            centerCode = debt.getTaxpayerCenter();
        } else if (payment.getTaxpayer().getTaxCenter() != null) {
            centerCode = payment.getTaxpayer().getTaxCenter().getCode();
        }
        String period = debt != null ? debt.getPeriod()
                : payment.getPaymentDate().getYear() + "-" + String.format("%02d", payment.getPaymentDate().getMonthValue());
        Receipt receipt = Receipt.builder()
                .reference(com.mnktax.common.util.ReferenceGenerator.next("REC"))
                .verificationToken("VRF-" + java.util.UUID.randomUUID().toString().replace("-", "").substring(0, 16).toUpperCase())
                .payment(payment)
                .receiptNumber("QU/" + LocalDate.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyyMM")) + "/" + String.format("%06d", (int)(Math.random() * 999999)))
                .taxpayer(payment.getTaxpayer())
                .taxType(debt != null ? debt.getTaxType() : taxTypeRepository.findByCode("TVA").orElse(null))
                .declaration(decl)
                .debt(debt)
                .period(period)
                .amount(payment.getAllocatedAmount() != null ? payment.getAllocatedAmount() : payment.getAmount())
                .currency("MGA")
                .method(payment.getMethod())
                .transactionReference(payment.getTransactionReference())
                .status(status)
                .paymentDate(payment.getPaymentDate())
                .centerCode(centerCode)
                .createdBy("seed")
                .issuedAt(Instant.now().minus(java.time.Duration.ofDays(daysAgo)))
                .createdAt(Instant.now().minus(java.time.Duration.ofDays(daysAgo)))
                .build();
        return receiptRepository.save(receipt);
    }

    /* ── Registrations ─────────────────────────────────── */

    private void seedRegistrations() {
        if (registrationRequestRepository.count() > 0) return;

        var now = Instant.now();
        var requests = java.util.List.of(
            RegistrationRequest.builder().reference("REG-2026-000001").requestType("INDIVIDUAL")
                .name("RAKOTO Jean").firstName("Jean").lastName("RAKOTO")
                .email("rakoto.jean@example.mg").phone("+261 34 11 22 33")
                .nif("0000100123").organization("Particulier")
                .role("TAXPAYER").status("PENDING")
                .message("Je souhaite accéder à la plateforme pour suivre mes obligations fiscales.")
                .createdAt(now.minus(java.time.Duration.ofHours(2))).build(),

            RegistrationRequest.builder().reference("REG-2026-000002").requestType("COMPANY")
                .name("SOCIÉTÉ MALAGASY SA").organization("SOCIÉTÉ MALAGASY SA")
                .email("contact@societe-malagasy.mg").phone("+261 20 22 33 44")
                .nif("0000409001").position("Directeur financier")
                .role("TAXPAYER").status("UNDER_REVIEW")
                .assignedTo("admin")
                .message("Accès pour gérer les déclarations de notre entreprise.")
                .createdAt(now.minus(java.time.Duration.ofDays(1))).build(),

            RegistrationRequest.builder().reference("REG-2026-000003").requestType("TAX_AGENT")
                .name("RAZAFY Marie").firstName("Marie").lastName("RAZAFY")
                .email("razafy.marie@dgi.mg").phone("+261 33 44 55 66")
                .organization("DGI Antananarivo")
                .position("Agent fiscal")
                .taxCenter("ANA-01")
                .role("TAX_AGENT").status("APPROVED")
                .reviewedBy("admin").reviewedAt(now.minus(java.time.Duration.ofHours(12)))
                .createdAt(now.minus(java.time.Duration.ofDays(3))).build(),

            RegistrationRequest.builder().reference("REG-2026-000004").requestType("INDIVIDUAL")
                .name("ANDRY Ralaivao").firstName("Ralaivao").lastName("ANDRY")
                .email("andry.r@example.mg")
                .organization("Particulier")
                .role("TAXPAYER").status("REJECTED")
                .rejectionReason("Informations insuffisantes — NIF non fourni.")
                .reviewedBy("admin").reviewedAt(now.minus(java.time.Duration.ofHours(6)))
                .createdAt(now.minus(java.time.Duration.ofDays(5))).build(),

            RegistrationRequest.builder().reference("REG-2026-000005").requestType("COMPANY")
                .name("GROUPE BEMANGA").organization("GROUPE BEMANGA LTD")
                .email("admin@groupe-bemanga.mg").phone("+261 20 55 66 77")
                .nif("0000501234").position("Comptable")
                .role("ACCOUNTANT").status("PENDING")
                .message("Demande d'accès comptable pour nos 3 filiales.")
                .createdAt(now.minus(java.time.Duration.ofMinutes(45))).build(),

            RegistrationRequest.builder().reference("REG-2026-000006").requestType("COLLECTION_AGENT")
                .name("HERILALA Rajao").firstName("Rajao").lastName("HERILALA")
                .email("herilala.rajao@recouvrement.mg")
                .organization("Service Recouvrement")
                .position("Agent de recouvrement")
                .role("COLLECTION_AGENT").status("UNDER_REVIEW")
                .assignedTo("admin")
                .createdAt(now.minus(java.time.Duration.ofDays(2))).build(),

            RegistrationRequest.builder().reference("REG-2026-000007").requestType("OTHER")
                .name("RAKOTONIAINA Paul").firstName("Paul").lastName("RAKOTONIAINA")
                .email("paul.r@example.mg")
                .organization("Université d'Antananarivo")
                .role("TAXPAYER").status("PENDING")
                .message("Accès pour recherche académique sur les données fiscales.")
                .createdAt(now.minus(java.time.Duration.ofHours(5))).build(),

            RegistrationRequest.builder().reference("REG-2026-000008").requestType("INDIVIDUAL")
                .name("FANJANAHARY Lois").firstName("Lois").lastName("FANJANAHARY")
                .email("lois.f@example.mg").phone("+261 34 77 88 99")
                .organization("Particulier")
                .role("TAXPAYER").status("APPROVED")
                .reviewedBy("admin").reviewedAt(now.minus(java.time.Duration.ofDays(1)))
                .createdAt(now.minus(java.time.Duration.ofDays(4))).build(),

            RegistrationRequest.builder().reference("REG-2026-000009").requestType("COMPANY")
                .name("MADA TRANS LOGISTICS").organization("MADA TRANS LOGISTICS SARL")
                .email("compta@madatrans.mg")
                .nif("0000607890")
                .role("ACCOUNTANT").status("PENDING")
                .message("Comptable mandaté pour déclarations mensuelles TVA.")
                .createdAt(now.minus(java.time.Duration.ofMinutes(20))).build(),

            RegistrationRequest.builder().reference("REG-2026-000010").requestType("TAX_AGENT")
                .name("NOMENJANAHARY Priela").firstName("Priela").lastName("NOMENJANAHARY")
                .email("priela.n@dgi.mg")
                .organization("DGI Toamasina")
                .taxCenter("TMM-01")
                .role("TAX_AGENT").status("REJECTED")
                .rejectionReason("Compte DGI déjà existant.")
                .reviewedBy("admin").reviewedAt(now.minus(java.time.Duration.ofDays(2)))
                .createdAt(now.minus(java.time.Duration.ofDays(7))).build()
        );

        registrationRequestRepository.saveAll(requests);
        log.info("Seed: {} demandes d'inscription créées", requests.size());
    }
}
