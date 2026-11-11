package com.mnktax.auth.service;

import com.mnktax.audit.service.AuditService;
import com.mnktax.auth.dto.RegisterRequest;
import com.mnktax.auth.dto.RegistrationRequestDto;
import com.mnktax.auth.entity.RegistrationRequest;
import com.mnktax.auth.entity.Role;
import com.mnktax.auth.entity.User;
import com.mnktax.auth.repository.RegistrationRequestRepository;
import com.mnktax.auth.repository.RoleRepository;
import com.mnktax.auth.repository.UserRepository;
import com.mnktax.auth.security.Permissions;
import com.mnktax.common.exception.BusinessException;
import com.mnktax.common.exception.ResourceNotFoundException;
import com.mnktax.common.util.ReferenceGenerator;
import com.mnktax.common.util.SecurityUtils;
import com.mnktax.taxpayer.entity.Taxpayer;
import com.mnktax.taxpayer.repository.TaxpayerRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class RegistrationService {

    private static final Logger log = LoggerFactory.getLogger(RegistrationService.class);

    /** Types de demande acceptés (filtre « type » côté administration). */
    private static final Set<String> REQUEST_TYPES = Set.of(
            "INDIVIDUAL", "COMPANY", "TAX_AGENT", "ACCOUNTANT", "COLLECTION_AGENT", "OTHER");

    /** Organisation par défaut d'un particulier (profil contribuable). */
    private static final String INDIVIDUAL_ORGANIZATION = "Particulier";

    /**
     * Libellés historiques et valeurs de type vers code de rôle attendu par la
     * table {@code roles}. Le formulaire public envoie désormais des codes
     * (TAXPAYER, TAX_AGENT…), mais les demandes déjà saisies portent des
     * libellés (« Agent fiscal ») ou des types (« INDIVIDUAL »).
     */
    private static final Map<String, String> ROLE_ALIASES = Map.ofEntries(
            Map.entry("AGENT_FISCAL", Role.TAX_AGENT),
            Map.entry("AGENT_DE_RECOUVREMENT", Role.COLLECTION_AGENT),
            Map.entry("AGENT_RECOUVREMENT", Role.COLLECTION_AGENT),
            Map.entry("COMPTABLE", Role.ACCOUNTANT),
            Map.entry("CONTRIBUABLE", Role.TAXPAYER),
            Map.entry("PARTICULIER", Role.TAXPAYER),
            Map.entry("INDIVIDUAL", Role.TAXPAYER),
            Map.entry("COMPANY", Role.TAXPAYER),
            Map.entry("ENTREPRISE", Role.TAXPAYER),
            Map.entry("AUTRE", Role.TAXPAYER),
            Map.entry("OTHER", Role.TAXPAYER),
            Map.entry("ADMINISTRATEUR", Role.ADMIN),
            Map.entry("ADMIN", Role.ADMIN));

    /**
     * Normalise le rôle saisi (code, libellé ou type de demande) vers un code
     * de rôle. Retourne {@code null} si la valeur est vide ; les rôles
     * administratifs sont conservés tels quels afin de déclencher le refus
     * explicite de {@link #approve}.
     */
    static String resolveRoleCode(String requested) {
        if (requested == null || requested.isBlank()) {
            return null;
        }
        String key = requested.trim().toUpperCase().replaceAll("\\s+", "_");
        return ROLE_ALIASES.getOrDefault(key, key);
    }

    private final RegistrationRequestRepository repo;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final AuditService auditService;
    private final PasswordEncoder passwordEncoder;
    private final TaxpayerRepository taxpayerRepository;
    private final AccountCredentialsNotifier credentialsNotifier;

    public RegistrationService(RegistrationRequestRepository repo,
                               UserRepository userRepository,
                               RoleRepository roleRepository,
                               AuditService auditService,
                               PasswordEncoder passwordEncoder,
                               TaxpayerRepository taxpayerRepository,
                               AccountCredentialsNotifier credentialsNotifier) {
        this.repo = repo;
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.auditService = auditService;
        this.passwordEncoder = passwordEncoder;
        this.taxpayerRepository = taxpayerRepository;
        this.credentialsNotifier = credentialsNotifier;
    }

    /* ── Création (publique) ─────────────────────────────── */

    @Transactional
    public RegistrationRequestDto register(RegisterRequest request, HttpServletRequest httpRequest) {
        if (repo.existsByEmailAndStatus(request.email(), "PENDING")) {
            throw new BusinessException("DUPLICATE", "Une demande d'accès est déjà en cours pour cet email.");
        }
        if (userRepository.existsByEmail(request.email())) {
            throw new BusinessException("DUPLICATE", "Un compte existe déjà avec cet email.");
        }

        String name = buildName(request);
        // Rôle absent => contribuable : c'est le profil par défaut d'un compte
        // créé pour le compte de son propre détenteur.
        String requestedRole = resolveRoleCode(request.role());
        String role = (requestedRole == null) ? Role.TAXPAYER : requestedRole;
        // Type absent => déduit du rôle, pour qu'une demande sans `requestType`
        // reste correctement filtrée côté administration.
        String type = (request.requestType() == null || request.requestType().isBlank())
                ? defaultRequestTypeForRole(role)
                : normalizeRequestType(request.requestType());
        // L'organisation n'est pas pertinente pour un particulier : on conserve
        // une valeur d'affichage plutôt que de la forcer à saisir un nom.
        String organization = (request.organization() == null || request.organization().isBlank())
                ? INDIVIDUAL_ORGANIZATION
                : request.organization().trim();

        RegistrationRequest reg = RegistrationRequest.builder()
                .reference(ReferenceGenerator.next("REG"))
                .requestType(type)
                .name(name)
                .firstName(request.firstName())
                .lastName(request.lastName())
                .email(request.email())
                .phone(request.phone())
                .nif(request.nif())
                .address(request.address())
                .organization(organization)
                .position(request.position())
                .role(role)
                .taxCenter(request.taxCenter())
                .message(request.message())
                .status("PENDING")
                .createdAt(Instant.now())
                .build();

        repo.save(reg);
        auditService.record("REGISTRATION_CREATED", "REGISTRATION_REQUEST",
                String.valueOf(reg.getId()), null, reg.getReference(), httpRequest);

        log.info("Nouvelle demande d'inscription: {} ({})", reg.getReference(), reg.getEmail());
        return RegistrationRequestDto.from(reg);
    }

    /* ── Recherche ───────────────────────────────────────── */

    @Transactional(readOnly = true)
    public Page<RegistrationRequestDto> search(String status, String type, String q, Pageable pageable) {
        String s = clean(status);
        String t = clean(type);
        String q2 = clean(q);
        return repo.search(s, t, q2, pageable).map(RegistrationRequestDto::from);
    }

    /* ── Statistiques ────────────────────────────────────── */

    @Transactional(readOnly = true)
    public Map<String, Long> stats() {
        return Map.of(
                "total", repo.count(),
                "PENDING", repo.countByStatus("PENDING"),
                "UNDER_REVIEW", repo.countByStatus("UNDER_REVIEW"),
                "APPROVED", repo.countByStatus("APPROVED"),
                "REJECTED", repo.countByStatus("REJECTED")
        );
    }

    /* ── Détail ──────────────────────────────────────────── */

    @Transactional(readOnly = true)
    public RegistrationRequestDto getById(Long id) {
        RegistrationRequest r = repo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Demande d'inscription", id));
        return RegistrationRequestDto.from(r);
    }

    /* ── Prise en charge ─────────────────────────────────── */

    @Transactional
    public RegistrationRequestDto assign(Long id, String agentUsername, HttpServletRequest httpRequest) {
        RegistrationRequest r = repo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Demande d'inscription", id));

        if ("APPROVED".equals(r.getStatus()) || "REJECTED".equals(r.getStatus())) {
            throw new BusinessException("INVALID_STATE", "Cette demande a déjà été traitée.");
        }
        if (r.getAssignedTo() != null && !r.getAssignedTo().equals(agentUsername)) {
            throw new BusinessException("ALREADY_ASSIGNED",
                    "Cette demande est déjà prise en charge par " + r.getAssignedTo() + ".");
        }

        r.setAssignedTo(agentUsername);
        r.setAssignedAt(Instant.now());
        if ("PENDING".equals(r.getStatus())) {
            r.setStatus("UNDER_REVIEW");
        }
        r.setUpdatedAt(Instant.now());
        repo.save(r);

        auditService.record("REGISTRATION_ASSIGNED", "REGISTRATION_REQUEST",
                String.valueOf(id), null, agentUsername, httpRequest);

        return RegistrationRequestDto.from(r);
    }

    /* ── Approbation ─────────────────────────────────────── */

    @Transactional
    public RegistrationRequestDto approve(Long id, String agentUsername, String roleCode, HttpServletRequest httpRequest) {
        RegistrationRequest r = repo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Demande d'inscription", id));

        if (!"PENDING".equals(r.getStatus()) && !"UNDER_REVIEW".equals(r.getStatus())) {
            throw new BusinessException("INVALID_STATE", "Cette demande ne peut pas être approuvée (statut: " + r.getStatus() + ").");
        }
        if (userRepository.existsByEmail(r.getEmail())) {
            throw new BusinessException("DUPLICATE", "Un compte existe déjà avec cet email.");
        }

        // Valider le rôle : code, libellé historique ou type de demande
        String requestedRole = (roleCode != null && !roleCode.isBlank()) ? roleCode : r.getRole();
        String normalizedRole = resolveRoleCode(requestedRole);
        if (normalizedRole == null) {
            throw new BusinessException("VALIDATION_ERROR",
                    "Le rôle souhaité est obligatoire pour approuver cette demande.");
        }

        // Protéger les rôles administratifs
        if ("SUPER_ADMIN".equals(normalizedRole) || "ADMIN".equals(normalizedRole)) {
            throw new BusinessException("FORBIDDEN",
                    "Le rôle " + normalizedRole + " ne peut pas être attribué via une demande d'inscription.");
        }

        // Approuver
        r.setStatus("APPROVED");
        r.setReviewedBy(agentUsername);
        r.setReviewedAt(Instant.now());
        r.setUpdatedAt(Instant.now());
        repo.save(r);

        // Créer l'utilisateur avec un mot de passe temporaire, transmis
        // exclusivement par email (jamais dans la réponse HTTP).
        String temporaryPassword = "Temp@" + UUID.randomUUID().toString().substring(0, 8);
        User user = User.builder()
                .username(r.getEmail().split("@")[0])
                .email(r.getEmail())
                .password(passwordEncoder.encode(temporaryPassword))
                .firstName(r.getFirstName() != null ? r.getFirstName() : r.getName())
                .lastName(r.getLastName())
                .phone(r.getPhone())
                .enabled(true)
                .mustChangePassword(true)
                .mfaEnabled(false)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .roles(new HashSet<>())
                .build();

        Role role = roleRepository.findByCode(normalizedRole)
                .orElseThrow(() -> new BusinessException("VALIDATION_ERROR",
                        "Rôle inconnu : " + normalizedRole + ". Rôles attribuables : "
                                + Role.TAXPAYER + ", " + Role.TAX_AGENT + ", "
                                + Role.COLLECTION_AGENT + ", " + Role.ACCOUNTANT + "."));
        requireAssignable(role);
        user.getRoles().add(role);
        User savedUser = userRepository.save(user);

        // Rattacher le compte au dossier contribuable portant le même email
        // ou le même NIF, afin que le contribuable accède à ses propres
        // données (cf. DataScope).
        linkTaxpayerRecord(r, savedUser.getId());

        // Transmettre le mot de passe temporaire par email : si l'envoi échoue,
        // l'approbation est annulée (rollback) plutôt que de créer un compte
        // dont l'utilisateur ne peut pas se connecter.
        credentialsNotifier.sendTemporaryPassword(savedUser, temporaryPassword);

        auditService.record("REGISTRATION_APPROVED", "REGISTRATION_REQUEST",
                String.valueOf(id), "PENDING/UNDER_REVIEW", "APPROVED", httpRequest);
        auditService.record("ACCOUNT_CREATED_FROM_REGISTRATION", "USER",
                String.valueOf(user.getId()), null, user.getUsername(), httpRequest);

        log.info("Demande {} approuvée. Compte créé: {} (rôle: {})", r.getReference(), user.getUsername(), normalizedRole);
        return RegistrationRequestDto.from(r);
    }

    /* ── Rejet ───────────────────────────────────────────── */

    @Transactional
    public RegistrationRequestDto reject(Long id, String agentUsername, String reason, HttpServletRequest httpRequest) {
        RegistrationRequest r = repo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Demande d'inscription", id));

        if (!"PENDING".equals(r.getStatus()) && !"UNDER_REVIEW".equals(r.getStatus())) {
            throw new BusinessException("INVALID_STATE", "Cette demande ne peut pas être rejetée (statut: " + r.getStatus() + ").");
        }
        if (reason == null || reason.isBlank()) {
            throw new BusinessException("VALIDATION_ERROR", "Le motif du rejet est obligatoire.");
        }

        r.setStatus("REJECTED");
        r.setRejectionReason(reason);
        r.setReviewedBy(agentUsername);
        r.setReviewedAt(Instant.now());
        r.setUpdatedAt(Instant.now());
        repo.save(r);

        auditService.record("REGISTRATION_REJECTED", "REGISTRATION_REQUEST",
                String.valueOf(id), "PENDING/UNDER_REVIEW", "REJECTED", httpRequest);

        log.info("Demande {} rejetée par {}. Motif: {}", r.getReference(), agentUsername, reason);
        return RegistrationRequestDto.from(r);
    }

    /* ── Helpers ─────────────────────────────────────────── */

    /**
     * Anti-escalade : le rôle accordé doit exister et ses permissions ne doivent
     * pas excéder celles du validateur, sauf si celui-ci détient ROLE_ASSIGN.
     */
    private void requireAssignable(Role role) {
        if (SecurityUtils.hasAuthority(Permissions.ROLE_ASSIGN)) {
            return;
        }
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        Set<String> own = auth == null ? Set.of() : auth.getAuthorities().stream()
                .map(a -> a.getAuthority())
                .filter(a -> a.startsWith("PERMISSION_"))
                .map(a -> a.substring("PERMISSION_".length()))
                .collect(Collectors.toSet());
        List<String> excessive = role.getPermissions().stream()
                .map(p -> p.getCode())
                .filter(code -> !own.contains(code))
                .sorted()
                .toList();
        if (!excessive.isEmpty()) {
            throw new BusinessException("FORBIDDEN",
                    "Vous ne pouvez pas accorder le rôle " + role.getCode()
                            + " : permissions en excédent (" + String.join(", ", excessive) + ").");
        }
    }

    private String buildName(RegisterRequest r) {
        if (r.firstName() != null && r.lastName() != null) {
            return r.lastName() + " " + r.firstName();
        }
        return r.name();
    }

    /** Type de demande : valeur inconnue => OTHER (garde le filtre admin fiable). */
    private String normalizeRequestType(String requestType) {
        if (requestType == null || requestType.isBlank()) {
            return "OTHER";
        }
        String type = requestType.trim().toUpperCase();
        return REQUEST_TYPES.contains(type) ? type : "OTHER";
    }

    /** Type par défaut déduit du rôle normalisé (quand le client n'envoie pas `requestType`). */
    private static String defaultRequestTypeForRole(String role) {
        return switch (role) {
            case Role.TAX_AGENT -> Role.TAX_AGENT;
            case Role.COLLECTION_AGENT -> Role.COLLECTION_AGENT;
            case Role.ACCOUNTANT -> Role.ACCOUNTANT;
            default -> "INDIVIDUAL";
        };
    }

    /**
     * Rattache le compte créé au dossier contribuable existant : par email
     * d'abord, puis par NIF (le dossier peut avoir été saisi avec une autre
     * adresse). Ne jamais écraser un rattachement déjà existant.
     */
    private void linkTaxpayerRecord(RegistrationRequest r, Long userId) {
        boolean linked = false;
        if (r.getEmail() != null && !r.getEmail().isBlank()) {
            var byEmail = taxpayerRepository.findByEmailIgnoreCase(r.getEmail().trim());
            if (byEmail.isPresent()) {
                linked = attachToTaxpayer(byEmail.get(), userId);
            }
        }
        if (!linked && r.getNif() != null && !r.getNif().isBlank()) {
            taxpayerRepository.findByNif(r.getNif().trim()).ifPresent(tp -> attachToTaxpayer(tp, userId));
        }
    }

    private boolean attachToTaxpayer(Taxpayer taxpayer, Long userId) {
        if (taxpayer.getUserId() != null) {
            return false;
        }
        taxpayer.setUserId(userId);
        taxpayerRepository.save(taxpayer);
        return true;
    }

    private String clean(String s) {
        return (s == null || s.isBlank()) ? null : s.trim();
    }
}
