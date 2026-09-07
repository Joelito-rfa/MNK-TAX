package com.mnktax.auth.service;

import com.mnktax.audit.service.AuditService;
import com.mnktax.auth.dto.RegisterRequest;
import com.mnktax.auth.dto.RegistrationRequestDto;
import com.mnktax.auth.entity.RegistrationRequest;
import com.mnktax.auth.entity.User;
import com.mnktax.auth.repository.RegistrationRequestRepository;
import com.mnktax.auth.repository.RoleRepository;
import com.mnktax.auth.repository.UserRepository;
import com.mnktax.common.exception.BusinessException;
import com.mnktax.common.exception.ResourceNotFoundException;
import com.mnktax.common.util.ReferenceGenerator;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.HashSet;
import java.util.Map;
import java.util.UUID;

@Service
public class RegistrationService {

    private static final Logger log = LoggerFactory.getLogger(RegistrationService.class);

    private final RegistrationRequestRepository repo;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final AuditService auditService;
    private final PasswordEncoder passwordEncoder;

    public RegistrationService(RegistrationRequestRepository repo,
                               UserRepository userRepository,
                               RoleRepository roleRepository,
                               AuditService auditService,
                               PasswordEncoder passwordEncoder) {
        this.repo = repo;
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.auditService = auditService;
        this.passwordEncoder = passwordEncoder;
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
        String type = (request.requestType() != null && !request.requestType().isBlank())
                ? request.requestType().toUpperCase() : "OTHER";

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
                .organization(request.organization())
                .position(request.position())
                .role(request.role())
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

        // Valider le rôle
        String finalRole = (roleCode != null && !roleCode.isBlank()) ? roleCode : r.getRole();
        finalRole = finalRole.toUpperCase().replace(" ", "_");

        // Protéger les rôles administratifs
        if ("SUPER_ADMIN".equals(finalRole) || "ADMIN".equals(finalRole)) {
            throw new BusinessException("FORBIDDEN",
                    "Le rôle " + finalRole + " ne peut pas être attribué via une demande d'inscription.");
        }

        // Approuver
        r.setStatus("APPROVED");
        r.setReviewedBy(agentUsername);
        r.setReviewedAt(Instant.now());
        r.setUpdatedAt(Instant.now());
        repo.save(r);

        // Créer l'utilisateur
        User user = User.builder()
                .username(r.getEmail().split("@")[0])
                .email(r.getEmail())
                .password(passwordEncoder.encode("Temp@" + UUID.randomUUID().toString().substring(0, 8)))
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

        roleRepository.findByCode(finalRole).ifPresent(user.getRoles()::add);
        userRepository.save(user);

        auditService.record("REGISTRATION_APPROVED", "REGISTRATION_REQUEST",
                String.valueOf(id), "PENDING/UNDER_REVIEW", "APPROVED", httpRequest);
        auditService.record("ACCOUNT_CREATED_FROM_REGISTRATION", "USER",
                String.valueOf(user.getId()), null, user.getUsername(), httpRequest);

        log.info("Demande {} approuvée. Compte créé: {} (rôle: {})", r.getReference(), user.getUsername(), finalRole);
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

    private String buildName(RegisterRequest r) {
        if (r.firstName() != null && r.lastName() != null) {
            return r.lastName() + " " + r.firstName();
        }
        return r.name();
    }

    private String clean(String s) {
        return (s == null || s.isBlank()) ? null : s.trim();
    }
}
