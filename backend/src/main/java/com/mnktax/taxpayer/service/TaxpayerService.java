package com.mnktax.taxpayer.service;

import com.mnktax.audit.service.AuditService;
import com.mnktax.auth.repository.UserRepository;
import com.mnktax.common.exception.BusinessException;
import com.mnktax.common.exception.ResourceNotFoundException;
import com.mnktax.common.util.NifValidator;
import com.mnktax.common.util.PhoneUtil;
import com.mnktax.common.util.SecurityUtils;
import com.mnktax.communication.entity.CommunicationChannel;
import com.mnktax.debt.entity.DebtStatus;
import com.mnktax.debt.repository.TaxDebtRepository;
import com.mnktax.declaration.entity.DeclarationStatus;
import com.mnktax.declaration.repository.DeclarationRepository;
import com.mnktax.tax.entity.TaxCenter;
import com.mnktax.tax.entity.TaxRegime;
import com.mnktax.tax.repository.TaxCenterRepository;
import com.mnktax.tax.repository.TaxObligationRepository;
import com.mnktax.tax.repository.TaxRegimeRepository;
import com.mnktax.taxpayer.dto.TaxpayerDtos;
import com.mnktax.taxpayer.dto.TaxpayerDtos.ActivityDto;
import com.mnktax.taxpayer.dto.TaxpayerDtos.AddressDto;
import com.mnktax.taxpayer.dto.TaxpayerDtos.CreateTaxpayerRequest;
import com.mnktax.taxpayer.dto.TaxpayerDtos.TaxpayerDetailDto;
import com.mnktax.taxpayer.dto.TaxpayerDtos.TaxpayerStatsDto;
import com.mnktax.taxpayer.dto.TaxpayerDtos.TaxpayerSummaryDto;
import com.mnktax.taxpayer.dto.TaxpayerDtos.UpdateTaxpayerRequest;
import com.mnktax.taxpayer.entity.Taxpayer;
import com.mnktax.taxpayer.entity.TaxpayerActivity;
import com.mnktax.taxpayer.entity.TaxpayerAddress;
import com.mnktax.taxpayer.entity.TaxpayerStatus;
import com.mnktax.taxpayer.entity.TaxpayerType;
import com.mnktax.taxpayer.repository.TaxpayerRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
public class TaxpayerService {

    private final TaxpayerRepository taxpayerRepository;
    private final TaxCenterRepository taxCenterRepository;
    private final TaxRegimeRepository taxRegimeRepository;
    private final TaxObligationRepository obligationRepository;
    private final TaxDebtRepository debtRepository;
    private final DeclarationRepository declarationRepository;
    private final AuditService auditService;
    private final DataScope dataScope;
    private final UserRepository userRepository;

    private static final Set<String> SUPPORTED_LANGUAGES = Set.of("FR", "MG", "EN");

    public TaxpayerService(TaxpayerRepository taxpayerRepository, TaxCenterRepository taxCenterRepository,
                           TaxRegimeRepository taxRegimeRepository, TaxObligationRepository obligationRepository,
                           TaxDebtRepository debtRepository, DeclarationRepository declarationRepository,
                           AuditService auditService, DataScope dataScope, UserRepository userRepository) {
        this.taxpayerRepository = taxpayerRepository;
        this.taxCenterRepository = taxCenterRepository;
        this.taxRegimeRepository = taxRegimeRepository;
        this.obligationRepository = obligationRepository;
        this.debtRepository = debtRepository;
        this.declarationRepository = declarationRepository;
        this.auditService = auditService;
        this.dataScope = dataScope;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public Page<TaxpayerSummaryDto> search(String q, TaxpayerType type, TaxpayerStatus status, Long taxCenterId,
                                           Long taxRegimeId, String activityCode, String taxTypeCode, Pageable pageable) {
        if (dataScope.isSelfService()) {
            // Un contribuable ne voit que son propre dossier : on ignore les filtres globaux.
            return ownDossierPage(pageable);
        }
        return taxpayerRepository.search(blankToNull(q), type, status, taxCenterId, taxRegimeId,
                        blankToNull(activityCode), blankToNull(taxTypeCode), pageable)
                .map(TaxpayerSummaryDto::from);
    }

    /** Page réduite au dossier rattaché à l'utilisateur courant (rôle TAXPAYER). */
    @Transactional(readOnly = true)
    public Page<TaxpayerSummaryDto> ownDossierPage(Pageable pageable) {
        return ownTaxpayerEntities(pageable).map(TaxpayerSummaryDto::from);
    }

    private Page<Taxpayer> ownTaxpayerEntities(Pageable pageable) {
        Long userId = SecurityUtils.currentUserId();
        if (userId == null) {
            return Page.empty(pageable);
        }
        List<Taxpayer> own = taxpayerRepository.findByUserId(userId)
                .map(List::of)
                .orElseGet(List::of);
        if (own.isEmpty()) {
            return Page.empty(pageable);
        }
        int total = own.size();
        int from = (int) Math.min(pageable.getOffset(), total);
        int to = Math.min(from + pageable.getPageSize(), total);
        return new PageImpl<>(own.subList(from, to), pageable, total);
    }

    @Transactional(readOnly = true)
    public TaxpayerStatsDto stats() {
        long overdueDebts = debtRepository.countByStatus(DebtStatus.OVERDUE)
                + debtRepository.countByStatus(DebtStatus.IN_COLLECTION);
        long pendingDeclarations = declarationRepository.countByStatus(DeclarationStatus.SUBMITTED)
                + declarationRepository.countByStatus(DeclarationStatus.UNDER_REVIEW)
                + declarationRepository.countByStatus(DeclarationStatus.A_CORRIGER);
        return new TaxpayerStatsDto(
                taxpayerRepository.countAll(),
                taxpayerRepository.countByStatus(TaxpayerStatus.ACTIVE),
                taxpayerRepository.countByStatus(TaxpayerStatus.INACTIVE),
                taxpayerRepository.countByStatus(TaxpayerStatus.SUSPENDED),
                taxpayerRepository.countByStatus(TaxpayerStatus.CLOSED),
                taxpayerRepository.countWithDebt(),
                overdueDebts,
                pendingDeclarations);
    }

    @Transactional(readOnly = true)
    public TaxpayerDetailDto get(Long id) {
        dataScope.requireOwnership(id);
        Taxpayer taxpayer = find(id);
        long obligations = obligationRepository.countByTaxpayerId(id);
        return TaxpayerDetailDto.from(taxpayer, obligations);
    }

    @Transactional(readOnly = true)
    public TaxpayerDetailDto getByNif(String nif) {
        NifValidator.validate(nif);
        Taxpayer taxpayer = taxpayerRepository.findByNif(nif)
                .orElseThrow(() -> new ResourceNotFoundException("Contribuable NIF", nif));
        dataScope.requireOwnership(taxpayer.getId());
        long obligations = obligationRepository.countByTaxpayerId(taxpayer.getId());
        return TaxpayerDetailDto.from(taxpayer, obligations);
    }

    @Transactional(readOnly = true)
    public TaxpayerDetailDto getByNifOrNull(String nif) {
        NifValidator.validate(nif);
        return taxpayerRepository.findByNif(nif)
                .map(t -> TaxpayerDetailDto.from(t, obligationRepository.countByTaxpayerId(t.getId())))
                .orElse(null);
    }

    /**
     * Coordonnées de communication d'un contribuable (composeur) —
     * accessible aux agents MESSAGE_WRITE uniquement.
     */
    @Transactional(readOnly = true)
    public TaxpayerDtos.TaxpayerContactDto getContact(Long id) {
        dataScope.requireOwnership(id);
        return TaxpayerDtos.TaxpayerContactDto.from(find(id));
    }

    /** Liste des coordonnées pour recherche du composeur (NIF, nom, email, téléphone). */
    @Transactional(readOnly = true)
    public Page<TaxpayerDtos.TaxpayerContactDto> contacts(String q, Pageable pageable) {
        if (dataScope.isSelfService()) {
            // Un contribuable n'accède qu'à ses propres coordonnées.
            return ownTaxpayerEntities(pageable).map(TaxpayerDtos.TaxpayerContactDto::from);
        }
        return taxpayerRepository.search(blankToNull(q), null, null, null, null, null, null, pageable)
                .map(TaxpayerDtos.TaxpayerContactDto::from);
    }

    @Transactional
    public TaxpayerDetailDto create(CreateTaxpayerRequest request, HttpServletRequest http) {
        String nif = resolveNif(request.nif());
        String language = normalizeLanguage(request.language());
        String channels = normalizeChannels(request.preferredChannels());
        Taxpayer taxpayer = Taxpayer.builder()
                .nif(nif)
                .type(request.type())
                .name(request.name())
                .businessName(request.businessName())
                .firstName(request.firstName())
                .lastName(request.lastName())
                .phone(request.phone())
                .phoneNormalized(PhoneUtil.normalize(request.phone()))
                .email(request.email())
                .address(request.address())
                .birthDate(request.birthDate())
                .legalRepresentative(request.legalRepresentative())
                .registrationDate(request.registrationDate())
                .taxCenter(resolveCenter(request.taxCenterId()))
                .taxRegime(resolveRegime(request.taxRegimeId()))
                .status(TaxpayerStatus.ACTIVE)
                .language(language == null ? "FR" : language)
                .preferredChannels(channels == null ? "IN_APP" : channels)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
        // Rattachement au compte utilisateur de même email : sans ce lien, un
        // contribuable ne verrait aucun dossier (cf. DataScope).
        if (request.email() != null && !request.email().isBlank()) {
            userRepository.findByEmail(request.email().trim())
                    .ifPresent(u -> taxpayer.setUserId(u.getId()));
        }
        if (request.addresses() != null) {
            for (AddressDto a : request.addresses()) {
                taxpayer.getAddresses().add(TaxpayerAddress.builder()
                        .taxpayer(taxpayer)
                        .type(a.type())
                        .addressLine1(a.addressLine1())
                        .addressLine2(a.addressLine2())
                        .city(a.city())
                        .region(a.region())
                        .country(a.country())
                        .postalCode(a.postalCode())
                        .build());
            }
        }
        if (request.activities() != null) {
            for (ActivityDto a : request.activities()) {
                taxpayer.getActivities().add(TaxpayerActivity.builder()
                        .taxpayer(taxpayer)
                        .code(a.code())
                        .label(a.label())
                        .description(a.description())
                        .primary(a.primary())
                        .build());
            }
        }
        Taxpayer saved = taxpayerRepository.save(taxpayer);
        auditService.record("CREATE", "TAXPAYER", String.valueOf(saved.getId()), null,
                TaxpayerDetailDto.from(saved, 0), http);
        return TaxpayerDetailDto.from(saved, 0);
    }

    @Transactional
    public TaxpayerDetailDto update(Long id, UpdateTaxpayerRequest request, HttpServletRequest http) {
        Taxpayer taxpayer = find(id);
        TaxpayerDetailDto old = TaxpayerDetailDto.from(taxpayer,
                obligationRepository.countByTaxpayerId(id));
        taxpayer.setType(request.type());
        if (request.name() != null) {
            taxpayer.setName(request.name());
        }
        taxpayer.setBusinessName(request.businessName());
        taxpayer.setFirstName(request.firstName());
        taxpayer.setLastName(request.lastName());
        taxpayer.setPhone(request.phone());
        taxpayer.setPhoneNormalized(PhoneUtil.normalize(request.phone()));
        taxpayer.setEmail(request.email());
        taxpayer.setAddress(request.address());
        taxpayer.setBirthDate(request.birthDate());
        taxpayer.setLegalRepresentative(request.legalRepresentative());
        taxpayer.setRegistrationDate(request.registrationDate());
        taxpayer.setTaxCenter(resolveCenter(request.taxCenterId()));
        taxpayer.setTaxRegime(resolveRegime(request.taxRegimeId()));
        taxpayer.setStatus(request.status());
        String language = normalizeLanguage(request.language());
        if (language != null) {
            taxpayer.setLanguage(language);
        }
        String channels = normalizeChannels(request.preferredChannels());
        if (channels != null) {
            taxpayer.setPreferredChannels(channels);
        }
        taxpayer.setUpdatedAt(Instant.now());
        Taxpayer saved = taxpayerRepository.save(taxpayer);
        auditService.record("UPDATE", "TAXPAYER", String.valueOf(id), old,
                TaxpayerDetailDto.from(saved, obligationRepository.countByTaxpayerId(id)), http);
        return TaxpayerDetailDto.from(saved, obligationRepository.countByTaxpayerId(id));
    }

    @Transactional
    public void changeStatus(Long id, TaxpayerStatus status, HttpServletRequest http) {
        Taxpayer taxpayer = find(id);
        TaxpayerStatus old = taxpayer.getStatus();
        taxpayer.setStatus(status);
        taxpayer.setUpdatedAt(Instant.now());
        taxpayerRepository.save(taxpayer);
        auditService.record("UPDATE", "TAXPAYER", String.valueOf(id), old, status, http);
    }

    @Transactional(readOnly = true)
    public String nextNif() {
        return generateNif();
    }

    private String resolveNif(String provided) {
        if (provided == null || provided.isBlank()) {
            return generateNif();
        }
        NifValidator.validate(provided);
        if (taxpayerRepository.existsByNif(provided)) {
            throw new BusinessException("DUPLICATE", "Un contribuable avec ce NIF existe déjà : " + provided);
        }
        return provided;
    }

    private String generateNif() {
        long next = 1;
        String max = taxpayerRepository.findMaxNif();
        if (max != null) {
            try {
                next = Long.parseLong(max) + 1;
            } catch (NumberFormatException ignored) {
                next = 1;
            }
        }
        String candidate = String.format("%010d", next);
        while (candidate.length() == 10 && taxpayerRepository.existsByNif(candidate)) {
            next++;
            candidate = String.format("%010d", next);
        }
        NifValidator.validate(candidate);
        return candidate;
    }

    private Taxpayer find(Long id) {
        return taxpayerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Contribuable", id));
    }

    private TaxCenter resolveCenter(Long id) {
        if (id == null) {
            return null;
        }
        return taxCenterRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Centre fiscal", id));
    }

    private TaxRegime resolveRegime(Long id) {
        if (id == null) {
            return null;
        }
        return taxRegimeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Régime fiscal", id));
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }

    /** Valide et normalise la langue préférée (FR | MG | EN). Renvoie null si non renseignée. */
    private String normalizeLanguage(String language) {
        if (language == null || language.isBlank()) {
            return null;
        }
        String value = language.trim().toUpperCase(Locale.ROOT);
        if (!SUPPORTED_LANGUAGES.contains(value)) {
            throw new BusinessException("VALIDATION",
                    "Langue invalide : " + language + " (FR, MG ou EN attendu).");
        }
        return value;
    }

    /**
     * Valide et normalise les canaux préférés (sous-ensemble de IN_APP/EMAIL/SMS).
     * Renvoie null si la valeur n'est pas renseignée (le défaut est conservé).
     */
    private String normalizeChannels(String channels) {
        if (channels == null) {
            return null;
        }
        LinkedHashSet<String> valid = new LinkedHashSet<>();
        for (String token : Arrays.stream(channels.split(",")).map(String::trim).toList()) {
            if (token.isEmpty()) {
                continue;
            }
            try {
                valid.add(CommunicationChannel.valueOf(token.toUpperCase(Locale.ROOT)).name());
            } catch (IllegalArgumentException ex) {
                throw new BusinessException("VALIDATION",
                        "Canal de communication invalide : " + token + " (IN_APP, EMAIL ou SMS attendu).");
            }
        }
        return valid.isEmpty() ? null : String.join(",", valid);
    }
}
