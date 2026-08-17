package com.mnktax.common.config;

import com.mnktax.auth.entity.Permission;
import com.mnktax.auth.entity.Role;
import com.mnktax.auth.entity.User;
import com.mnktax.auth.repository.PermissionRepository;
import com.mnktax.auth.repository.RoleRepository;
import com.mnktax.auth.repository.UserRepository;
import com.mnktax.collection.entity.CollectionAction;
import com.mnktax.collection.entity.CollectionActionType;
import com.mnktax.collection.repository.CollectionActionRepository;
import com.mnktax.debt.entity.DebtStatus;
import com.mnktax.debt.entity.Interest;
import com.mnktax.debt.entity.Penalty;
import com.mnktax.debt.repository.InterestRepository;
import com.mnktax.debt.repository.PenaltyRepository;
import com.mnktax.debt.repository.TaxDebtRepository;
import com.mnktax.debt.service.DebtService;
import com.mnktax.declaration.dto.DeclarationDtos.CreateDeclarationRequest;
import com.mnktax.message.entity.Message;
import com.mnktax.message.repository.MessageRepository;
import com.mnktax.declaration.service.DeclarationService;
import com.mnktax.payment.dto.PaymentDtos.CreatePaymentRequest;
import com.mnktax.payment.entity.PaymentMethod;
import com.mnktax.payment.service.PaymentService;
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
    private final PaymentService paymentService;
    private final DebtService debtService;
    private final TaxDebtRepository debtRepository;
    private final CollectionActionRepository actionRepository;
    private final MessageRepository messageRepository;

    @Value("${mnk-tax.seed-demo:true}")
    private boolean seedDemo;

    public DemoDataSeeder(PermissionRepository permissionRepository, RoleRepository roleRepository,
                          UserRepository userRepository, PasswordEncoder passwordEncoder,
                          TaxCenterRepository centerRepository, TaxRegimeRepository regimeRepository,
                          TaxTypeRepository taxTypeRepository, TaxRuleRepository ruleRepository,
                          TaxRuleVersionRepository ruleVersionRepository, DeadlineRepository deadlineRepository,
                          TaxpayerRepository taxpayerRepository, TaxObligationRepository obligationRepository,
                          PenaltyRepository penaltyRepository, InterestRepository interestRepository,
                          DeclarationService declarationService, PaymentService paymentService,
                          DebtService debtService, TaxDebtRepository debtRepository,
                          CollectionActionRepository actionRepository, MessageRepository messageRepository) {
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
        this.paymentService = paymentService;
        this.debtService = debtService;
        this.debtRepository = debtRepository;
        this.actionRepository = actionRepository;
        this.messageRepository = messageRepository;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!seedDemo) {
            log.info("Seed de démonstration désactivé (mnk-tax.seed-demo=false)");
            return;
        }
        if (userRepository.count() > 0) {
            log.info("Seed de démonstration déjà appliqué, ignoré.");
            return;
        }
        try {
            seedPermissions();
            seedRoles();
            seedUsers();
            seedReferences();
            seedPenalties();
            seedDeadlines();
            seedTaxpayers();
            seedTransactions();
            seedMessages();
            log.info("Seed de démonstration terminé (données fictives).");
        } catch (Exception ex) {
            log.error("Erreur lors du seed de démonstration", ex);
        }
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
                Map.entry("PAYMENT_READ", "Consulter les paiements"),
                Map.entry("PAYMENT_WRITE", "Enregistrer les paiements"),
                Map.entry("RECEIPT_READ", "Consulter les quittances"),
                Map.entry("RECEIPT_GENERATE", "Générer les quittances"),
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
                Map.entry("NOTIFICATION_READ", "Consulter les notifications")
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
        rolePerms.put(Role.TAX_AGENT, Set.of("TAXPAYER_READ", "TAXPAYER_WRITE",
                "DECLARATION_READ", "DECLARATION_WRITE", "DECLARATION_VALIDATE",
                "DEBT_READ", "ASSESSMENT_READ", "RULE_READ", "TAXONOMY_READ", "REPORT_READ",
                "PAYMENT_READ", "RECEIPT_READ", "COLLECTION_READ", "NOTIFICATION_READ",
                "MESSAGE_READ", "MESSAGE_WRITE"));
        rolePerms.put(Role.COLLECTION_AGENT, Set.of("DEBT_READ", "DEBT_WRITE",
                "PAYMENT_READ", "PAYMENT_WRITE", "RECEIPT_READ", "RECEIPT_GENERATE",
                "COLLECTION_READ", "COLLECTION_WRITE", "TAXPAYER_READ", "REPORT_READ", "NOTIFICATION_READ",
                "MESSAGE_READ", "MESSAGE_WRITE"));
        rolePerms.put(Role.ACCOUNTANT, Set.of("TAXPAYER_READ", "DECLARATION_READ", "DECLARATION_WRITE",
                "DEBT_READ", "PAYMENT_READ", "PAYMENT_WRITE", "RECEIPT_READ", "ASSESSMENT_READ", "REPORT_READ",
                "MESSAGE_READ", "MESSAGE_WRITE"));
        rolePerms.put(Role.TAXPAYER, Set.of("TAXPAYER_READ", "DECLARATION_READ", "DECLARATION_WRITE",
                "DEBT_READ", "PAYMENT_READ", "RECEIPT_READ", "NOTIFICATION_READ",
                "MESSAGE_READ", "MESSAGE_WRITE"));

        rolePerms.forEach((code, permCodes) -> {
            if (roleRepository.findByCode(code).isPresent()) {
                return;
            }
            Set<Permission> perms = permissionRepository.findAll().stream()
                    .filter(p -> permCodes.contains(p.getCode()))
                    .collect(java.util.stream.Collectors.toSet());
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
                    .description("Régime réel d'imposition").category("REEL").build());
            regimeRepository.save(TaxRegime.builder().code("REG-SIMP").name("Régime simplifié")
                    .description("Régime simplifié d'imposition").category("SIMPLIFIE").build());
            regimeRepository.save(TaxRegime.builder().code("REG-FORF").name("Régime forfaitaire")
                    .description("Régime forfaitaire d'imposition").category("FORFAITAIRE").build());
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
        addActivity(tp1, "4771", "Commerce de détail", true);
        addActivity(tp1, "4610", "Intermédiaires du commerce", false);

        Taxpayer tp2 = taxpayerRepository.save(baseTaxpayer("1234567890", "Jean RAKOTO", TaxpayerType.PERSON,
                center, simplifie, "jean.rakoto@mnk-tax.mg", "033 00 000 02", "Antananarivo"));
        addActivity(tp2, "8510", "Activités libérales", true);

        Taxpayer tp3 = taxpayerRepository.save(baseTaxpayer("9876543210", "ENTREPRISE SARL", TaxpayerType.COMPANY,
                centerRepository.findByCode("CEN-002").orElseThrow(), simplifie,
                "contact@mnk-tax.mg", "034 00 000 03", "Antananarivo, rue des Manguiers 45"));
        addActivity(tp3, "5610", "Restauration", true);

        Taxpayer tp4 = taxpayerRepository.save(baseTaxpayer("0000412345", "TRANSPORT SA", TaxpayerType.COMPANY,
                centerRepository.findByCode("CEN-003").orElseThrow(), reel,
                "transport@mnk-tax.mg", "032 00 000 04", "Toamasina"));
        addActivity(tp4, "4931", "Transports urbains", true);

        Taxpayer tp5 = taxpayerRepository.save(baseTaxpayer("1000000001", "Marie RANDRIANARISOA", TaxpayerType.PERSON,
                center, simplifie, "marie.randrianarisoa@mnk-tax.mg", "038 00 000 05", "Antananarivo"));
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
    }

    private Taxpayer baseTaxpayer(String nif, String name, TaxpayerType type, TaxCenter center, TaxRegime regime,
                                  String email, String phone, String address) {
        return Taxpayer.builder()
                .nif(nif).type(type).name(name)
                .email(email).phone(phone).address(address)
                .taxCenter(center).taxRegime(regime)
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
                .createdAt(Instant.now()).build());
    }

    private void seedTransactions() {
        // Déclaration validée récente (TVA) → assessment → créance
        var tp1 = taxpayerRepository.findByNif("0000409001").orElseThrow();
        String currentPeriod = LocalDate.now().getYear() + "-" + String.format("%02d", LocalDate.now().getMonthValue());
        Long currentDecl = createAndValidateDeclaration(tp1.getId(), "TVA", currentPeriod,
                new BigDecimal("1000000"), new BigDecimal("200000"));

        // Paiement partiel sur la créance générée → allocation + quittance
        com.mnktax.debt.entity.TaxDebt newDebt = debtRepository.findAll().stream()
                .filter(d -> d.getTaxpayer().getId().equals(tp1.getId()))
                .max(java.util.Comparator.comparing(com.mnktax.debt.entity.TaxDebt::getId))
                .orElse(null);
        if (newDebt != null && newDebt.getStatus() == DebtStatus.ISSUED) {
            try {
                paymentService.record(new CreatePaymentRequest(newDebt.getId(),
                        new BigDecimal("100000"), LocalDate.now(), PaymentMethod.BANK_TRANSFER, null), null);
            } catch (Exception ex) {
                log.warn("Seed paiement partiel ignoré : {}", ex.getMessage());
            }
        }

        // Déclaration en retard (TVA, 5 mois auparavant) → créance OVERDUE
        LocalDate old = LocalDate.now().minusMonths(5);
        String oldPeriod = old.getYear() + "-" + String.format("%02d", old.getMonthValue());
        Long overdueDecl = createAndValidateDeclaration(tp1.getId(), "TVA", oldPeriod,
                new BigDecimal("1500000"), new BigDecimal("300000"));
        debtService.markOverdue(LocalDate.now());

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

    private void seedMessages() {
        User admin = userRepository.findByUsername("admin").orElse(null);
        User agentTax = userRepository.findByUsername("agent.tax").orElse(null);
        User agentColl = userRepository.findByUsername("agent.collection").orElse(null);
        User accountant = userRepository.findByUsername("accountant").orElse(null);
        if (admin == null || agentTax == null || agentColl == null || accountant == null) {
            return;
        }
        messageRepository.save(Message.builder()
                .senderId(admin.getId()).senderName("Admin")
                .recipientId(agentTax.getId())
                .subject("Bienvenue sur la plateforme")
                .content("Bonjour, votre compte a été activé. Vous pouvez consulter les contribuables, les déclarations et les créances.")
                .read(false)
                .createdAt(Instant.now().minusSeconds(3600)).build());
        messageRepository.save(Message.builder()
                .senderId(agentTax.getId()).senderName("Agent Fiscal")
                .recipientId(admin.getId())
                .subject("Demande d'information")
                .content("Bonjour, pourriez-vous vérifier le centre fiscal attribué au contribuable SOCIÉTÉ MALAGASY ?")
                .read(false)
                .createdAt(Instant.now().minusSeconds(1800)).build());
        messageRepository.save(Message.builder()
                .senderId(agentColl.getId()).senderName("Agent Recouvrement")
                .recipientId(accountant.getId())
                .subject("Relance de paiement")
                .content("Bonjour, le contribuable a confirmé un virement pour la créance en cours. Merci de vérifier l'encaissement.")
                .read(false)
                .createdAt(Instant.now().minusSeconds(600)).build());
    }
}
