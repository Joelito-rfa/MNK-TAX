package com.mnktax.communication.service;

import com.mnktax.audit.service.AuditService;
import com.mnktax.auth.entity.User;
import com.mnktax.auth.repository.UserRepository;
import com.mnktax.communication.config.CommunicationProperties;
import com.mnktax.communication.dto.CommunicationDtos.CampaignAudiencePreview;
import com.mnktax.communication.dto.CommunicationDtos.CampaignDto;
import com.mnktax.communication.dto.CommunicationDtos.CampaignRequest;
import com.mnktax.communication.dto.CommunicationDtos.CommunicationStatsDto;
import com.mnktax.communication.dto.CommunicationDtos.ComposePreview;
import com.mnktax.communication.dto.CommunicationDtos.ComposeRequest;
import com.mnktax.communication.dto.CommunicationDtos.ComposeResult;
import com.mnktax.communication.dto.CommunicationDtos.DeliveryDto;
import com.mnktax.communication.dto.CommunicationDtos.EventRuleDto;
import com.mnktax.communication.dto.CommunicationDtos.ProviderStatusDto;
import com.mnktax.communication.dto.CommunicationDtos.ProvidersStatusDto;
import com.mnktax.communication.dto.CommunicationDtos.SaveTemplateRequest;
import com.mnktax.communication.dto.CommunicationDtos.SentMessageDto;
import com.mnktax.communication.dto.CommunicationDtos.TemplateDto;
import com.mnktax.communication.dto.CommunicationDtos.TemplateRenderRequest;
import com.mnktax.communication.dto.CommunicationDtos.TemplateRenderResult;
import com.mnktax.communication.dto.CommunicationDtos.TestSendRequest;
import com.mnktax.communication.dto.CommunicationDtos.TestSendResult;
import com.mnktax.communication.dto.CommunicationDtos.UpdateEventRuleRequest;
import com.mnktax.communication.entity.Campaign;
import com.mnktax.communication.entity.CampaignRecipient;
import com.mnktax.communication.entity.CampaignStatus;
import com.mnktax.communication.entity.CommunicationChannel;
import com.mnktax.communication.entity.DeliveryChannel;
import com.mnktax.communication.entity.DeliveryStatus;
import com.mnktax.communication.entity.MessageDelivery;
import com.mnktax.communication.entity.MessageStatus;
import com.mnktax.communication.entity.MessageTemplate;
import com.mnktax.communication.entity.CommunicationEventRule;
import com.mnktax.communication.provider.EmailAttachment;
import com.mnktax.communication.provider.EmailProvider;
import com.mnktax.communication.provider.ProviderResult;
import com.mnktax.communication.provider.SmsProvider;
import com.mnktax.communication.repository.CampaignRecipientRepository;
import com.mnktax.communication.repository.CampaignRepository;
import com.mnktax.communication.repository.CommunicationEventRuleRepository;
import com.mnktax.communication.repository.MessageDeliveryRepository;
import com.mnktax.communication.repository.MessageTemplateRepository;
import com.mnktax.common.exception.BusinessException;
import com.mnktax.common.util.ReferenceGenerator;
import com.mnktax.common.util.SecurityUtils;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import com.mnktax.debt.repository.TaxDebtRepository;
import com.mnktax.message.entity.Message;
import com.mnktax.message.entity.MessagePriority;
import com.mnktax.message.repository.MessageRepository;
import com.mnktax.tax.repository.TaxObligationRepository;
import com.mnktax.taxpayer.entity.Taxpayer;
import com.mnktax.taxpayer.repository.TaxpayerRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;

/**
 * Cœur du centre de communication multicanal :
 * composeur → destinataires (fiscaux ou individuels) → modèle + langue →
 * message + livraisons par canal → file (worker) → statuts véridiques.
 */
@Service
public class CommunicationService {

    private static final Logger log = LoggerFactory.getLogger(CommunicationService.class);

    private final MessageRepository messageRepository;
    private final MessageDeliveryRepository deliveryRepository;
    private final MessageTemplateRepository templateRepository;
    private final CommunicationEventRuleRepository eventRuleRepository;
    private final CampaignRepository campaignRepository;
    private final CampaignRecipientRepository campaignRecipientRepository;
    private final UserRepository userRepository;
    private final TaxpayerRepository taxpayerRepository;
    private final TaxDebtRepository debtRepository;
    private final TaxObligationRepository obligationRepository;
    private final DeliveryQueueService deliveryQueueService;
    private final EmailProvider emailProvider;
    private final SmsProvider smsProvider;
    private final EmailTemplateRenderer emailRenderer;
    private final CommunicationProperties properties;
    private final AuditService auditService;

    public CommunicationService(MessageRepository messageRepository,
                                MessageDeliveryRepository deliveryRepository,
                                MessageTemplateRepository templateRepository,
                                CommunicationEventRuleRepository eventRuleRepository,
                                CampaignRepository campaignRepository,
                                CampaignRecipientRepository campaignRecipientRepository,
                                UserRepository userRepository,
                                TaxpayerRepository taxpayerRepository,
                                TaxDebtRepository debtRepository,
                                TaxObligationRepository obligationRepository,
                                DeliveryQueueService deliveryQueueService,
                                EmailProvider emailProvider,
                                SmsProvider smsProvider,
                                EmailTemplateRenderer emailRenderer,
                                CommunicationProperties properties,
                                AuditService auditService) {
        this.messageRepository = messageRepository;
        this.deliveryRepository = deliveryRepository;
        this.templateRepository = templateRepository;
        this.eventRuleRepository = eventRuleRepository;
        this.campaignRepository = campaignRepository;
        this.campaignRecipientRepository = campaignRecipientRepository;
        this.userRepository = userRepository;
        this.taxpayerRepository = taxpayerRepository;
        this.debtRepository = debtRepository;
        this.obligationRepository = obligationRepository;
        this.deliveryQueueService = deliveryQueueService;
        this.emailProvider = emailProvider;
        this.smsProvider = smsProvider;
        this.emailRenderer = emailRenderer;
        this.properties = properties;
        this.auditService = auditService;
    }

    // ═══ Aperçu avant envoi (résumé UX) ═══════════════════════════

    @Transactional(readOnly = true)
    public ComposePreview preview(ComposeRequest request) {
        List<Target> targets = resolveTargets(request);
        List<String> channels = resolveChannels(request.channels());
        int missingEmail = 0;
        int missingPhone = 0;
        for (Target target : targets) {
            if (channels.contains("EMAIL") && isBlank(target.email)) missingEmail++;
            if (channels.contains("SMS") && isBlank(target.phoneNormalized)) missingPhone++;
        }
        List<String> warnings = new ArrayList<>();
        if (missingEmail > 0) {
            warnings.add(missingEmail + " destinataire(s) sans adresse email — canal email ignoré pour eux.");
        }
        if (missingPhone > 0) {
            warnings.add(missingPhone + " destinataire(s) sans numéro normalisé — canal SMS ignoré pour eux.");
        }
        if (targets.size() > 100) {
            warnings.add("Diffusion importante : " + targets.size()
                    + " contribuables — une confirmation est requise avant l'envoi.");
        }
        return new ComposePreview(request.audience() == null ? "SINGLE" : request.audience(),
                targets.size(), channels, missingEmail, missingPhone, warnings);
    }

    // ═══ Envoi (composeur) ════════════════════════════════════════

    @Transactional
    public ComposeResult compose(ComposeRequest request, HttpServletRequest http) {
        List<Target> targets = resolveTargets(request);
        if (targets.isEmpty()) {
            throw new BusinessException("NO_RECIPIENT", "Aucun destinataire résolu pour cet envoi.");
        }
        if (request.content() == null || request.content().isBlank()) {
            throw new BusinessException("CONTENT_REQUIRED", "Le contenu du message est requis.");
        }
        List<String> channels = resolveChannels(request.channels());
        boolean confirmed = Boolean.TRUE.equals(request.requireConfirmation());
        if (targets.size() > 100 && !confirmed) {
            throw new BusinessException("CONFIRMATION_REQUIRED",
                    "Vous êtes sur le point d'envoyer ce message à " + targets.size()
                            + " contribuables. Confirmez l'envoi.");
        }

        MessagePriority priority = parsePriority(request.priority());
        String messageType = request.messageType() == null ? "GENERAL" : request.messageType();
        Instant scheduledAt = parseInstant(request.scheduledAt());
        MessageStatus initialStatus = scheduledAt != null ? MessageStatus.SCHEDULED : MessageStatus.QUEUED;
        String senderName = resolveSenderName();

        MessageTemplate template = null;
        if (request.templateCode() != null && !request.templateCode().isBlank()) {
            template = templateRepository.findByCode(request.templateCode())
                    .orElseThrow(() -> new BusinessException("TEMPLATE_NOT_FOUND",
                            "Modèle introuvable : " + request.templateCode()));
        }

        int created = 0;
        Long firstMessageId = null;
        for (Target target : targets) {
            String language = target.language();
            String subject = request.subject();
            String content = request.content();
            // Rendu template par langue — jamais de mélange de langues dans un envoi.
            if (template != null) {
                Map<String, String> vars = baseVariables(target);
                subject = renderVars(template.subjectFor(language), vars);
                content = renderVars(template.bodyFor(language), vars);
            }
            List<String> effectiveChannels = new ArrayList<>(channels);
            if (effectiveChannels.contains("EMAIL") && isBlank(target.email)) effectiveChannels.remove("EMAIL");
            if (effectiveChannels.contains("SMS") && isBlank(target.phoneNormalized)) effectiveChannels.remove("SMS");

            Message message = Message.builder()
                    .senderId(SecurityUtils.currentUserId())
                    .senderName(senderName)
                    .recipientId(target.userId)
                    .subject(subject)
                    .content(content)
                    .read(false)
                    .createdAt(Instant.now())
                    .taxpayerId(target.taxpayerId)
                    .priority(priority)
                    .channels(String.join(",", effectiveChannels))
                    .messageType(messageType)
                    .templateCode(request.templateCode())
                    .status(initialStatus)
                    .scheduledAt(scheduledAt)
                    .createdBy(SecurityUtils.currentUsername())
                    .build();
            Message saved = messageRepository.save(message);
            // Conversation individuelle : le thread pointe sur le message racine.
            if (saved.getThreadId() == null) {
                saved.setThreadId(saved.getId());
                saved = messageRepository.save(saved);
            }
            if (firstMessageId == null) firstMessageId = saved.getId();

            createDeliveries(saved, target, effectiveChannels, scheduledAt);
            created++;
        }

        auditService.record("MESSAGE_CREATED", "MESSAGE", String.valueOf(firstMessageId),
                null, "recipients=" + created + ", channels=" + channels, http);

        String warning = scheduledAt != null
                ? "Message programmé — il sera traité automatiquement à l'échéance."
                : null;
        return new ComposeResult(firstMessageId, initialStatus.name(), created, channels, warning);
    }

    private void createDeliveries(Message message, Target target, List<String> channels, Instant scheduledAt) {
        Instant now = Instant.now();
        // Programmation : livraisons PENDING, éligibles au worker seulement à l'échéance.
        Instant eligibleAt = scheduledAt != null ? scheduledAt : now;
        for (String channel : channels) {
            DeliveryChannel dc = DeliveryChannel.valueOf(channel);
            String address = switch (dc) {
                case EMAIL -> target.email;
                case SMS -> target.phoneNormalized;
                case IN_APP -> null;
            };
            deliveryRepository.save(MessageDelivery.builder()
                    .messageId(message.getId())
                    .channel(dc)
                    .recipientAddress(address)
                    .status(DeliveryStatus.PENDING)
                    .attemptCount(0)
                    .maxAttempts(properties.getQueue().getMaxAttempts())
                    .nextRetryAt(eligibleAt)
                    .createdAt(now)
                    .updatedAt(now)
                    .build());
        }
    }

    // ═══ Suivi des envois (AGENT) ═════════════════════════════════

    @Transactional(readOnly = true)
    public Page<SentMessageDto> sentMessages(String status, String search, Pageable pageable) {
        MessageStatus messageStatus = status == null || status.isBlank() ? null : MessageStatus.valueOf(status);
        Page<Message> page = messageRepository.findSentCommunication(messageStatus, blankToNull(search), pageable);
        List<SentMessageDto> dtos = new ArrayList<>();
        for (Message m : page.getContent()) {
            List<DeliveryDto> deliveries = deliveryRepository.findByMessageId(m.getId()).stream()
                    .map(DeliveryDto::from).toList();
            String taxpayerName = null;
            String taxpayerNif = null;
            if (m.getTaxpayerId() != null) {
                Taxpayer taxpayer = taxpayerRepository.findById(m.getTaxpayerId()).orElse(null);
                if (taxpayer != null) {
                    taxpayerName = taxpayer.getName();
                    taxpayerNif = taxpayer.getNif();
                }
            }
            String recipientName = userRepository.findById(m.getRecipientId())
                    .map(u -> (u.getFirstName() + " " + u.getLastName()).trim())
                    .filter(s -> !s.isBlank())
                    .orElse("#" + m.getRecipientId());
            dtos.add(SentMessageDto.from(m, recipientName, taxpayerName, taxpayerNif, deliveries));
        }
        return new PageImpl<>(dtos, pageable, page.getTotalElements());
    }

    @Transactional(readOnly = true)
    public List<DeliveryDto> deliveriesOf(Long messageId) {
        return deliveryQueueService.deliveriesOf(messageId).stream().map(DeliveryDto::from).toList();
    }

    @Transactional
    public void retryMessage(Long messageId, HttpServletRequest http) {
        boolean any = false;
        for (MessageDelivery delivery : deliveryRepository.findByMessageId(messageId)) {
            if (deliveryQueueService.retryDelivery(delivery.getId())) {
                any = true;
            }
        }
        if (!any) {
            throw new BusinessException("RETRY_NOT_ALLOWED",
                    "Aucune livraison en échec définitif à relancer pour ce message.");
        }
        auditService.record("MESSAGE_RETRIED", "MESSAGE", String.valueOf(messageId), null, "manual retry", http);
    }

    @Transactional
    public void cancelScheduled(Long messageId, HttpServletRequest http) {
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new BusinessException("MESSAGE_NOT_FOUND", "Message introuvable."));
        if (message.getStatus() != MessageStatus.SCHEDULED) {
            throw new BusinessException("CANCEL_NOT_ALLOWED",
                    "Seul un message programmé non traité peut être annulé.");
        }
        message.setStatus(MessageStatus.CANCELLED);
        message.setUpdatedAt(Instant.now());
        messageRepository.save(message);
        for (MessageDelivery delivery : deliveryRepository.findByMessageId(messageId)) {
            if (delivery.getStatus() == DeliveryStatus.PENDING) {
                delivery.setStatus(DeliveryStatus.CANCELLED);
                delivery.setUpdatedAt(Instant.now());
                deliveryRepository.save(delivery);
            }
        }
        auditService.record("MESSAGE_CANCELLED", "MESSAGE", String.valueOf(messageId),
                MessageStatus.SCHEDULED.name(), MessageStatus.CANCELLED.name(), http);
    }

    // ═══ Statistiques ═════════════════════════════════════════════

    @Transactional(readOnly = true)
    public CommunicationStatsDto stats() {
        long sent = messageRepository.countByStatus(MessageStatus.SENT);
        long failed = messageRepository.countByStatus(MessageStatus.FAILED);
        long scheduled = messageRepository.countByStatus(MessageStatus.SCHEDULED);
        long queued = messageRepository.countByStatus(MessageStatus.QUEUED);
        long read = deliveryRepository.countByStatus(DeliveryStatus.READ);
        long emails = deliveryRepository.countByChannelAndStatusIn(DeliveryChannel.EMAIL,
                List.of(DeliveryStatus.SENT, DeliveryStatus.DELIVERED, DeliveryStatus.READ));
        long sms = deliveryRepository.countByChannelAndStatusIn(DeliveryChannel.SMS,
                List.of(DeliveryStatus.SENT, DeliveryStatus.DELIVERED, DeliveryStatus.READ));
        long inApp = deliveryRepository.countByChannelAndStatusIn(DeliveryChannel.IN_APP,
                List.of(DeliveryStatus.SENT, DeliveryStatus.DELIVERED, DeliveryStatus.READ));
        long total = messageRepository.countByStatusIn(List.of(MessageStatus.SENT, MessageStatus.FAILED));
        double deliveryRate = total == 0 ? 0 : round1(sent * 100.0 / total);
        double failureRate = total == 0 ? 0 : round1(failed * 100.0 / total);
        double readRate = sent == 0 ? 0 : round1(read * 100.0 / sent);
        return new CommunicationStatsDto(sent, failed, scheduled, queued, read, emails, sms, inApp,
                deliveryRate, readRate, failureRate);
    }

    // ═══ Fournisseurs (aucun secret exposé) ═══════════════════════

    @Transactional(readOnly = true)
    public ProvidersStatusDto providersStatus() {
        List<ProviderStatusDto> providers = new ArrayList<>();
        providers.add(new ProviderStatusDto("EMAIL", emailProvider.providerName(),
                statusOf(emailProvider.isConfigured()), emailProvider.isConfigured()
                        ? "SMTP configuré via MAIL_HOST." : "Configuration incomplète : MAIL_HOST absent."));
        providers.add(new ProviderStatusDto("SMS", smsProvider.providerName(),
                statusOf(smsProvider.isConfigured()), smsProvider.isConfigured()
                        ? "Fournisseur SMS connecté." : "Configuration incomplète : fournisseur SMS absent."));
        providers.add(new ProviderStatusDto("IN_APP", "MNK-TAX", "CONNECTED",
                "Notifications persistantes en base — toujours disponible."));
        int pending = (int) deliveryRepository.countByStatus(DeliveryStatus.PENDING);
        int failed = (int) deliveryRepository.countByStatus(DeliveryStatus.FAILED);
        return new ProvidersStatusDto(providers, pending, failed,
                properties.getQueue().getMaxAttempts(), properties.getQueue().getRetryBackoffMinutes());
    }

    private String statusOf(boolean configured) {
        return configured ? "CONNECTED" : "INCOMPLETE";
    }

    // ═══ Envoi test (destination explicite uniquement) ════════════

    @Transactional
    public TestSendResult testSend(TestSendRequest request, HttpServletRequest http) {
        if (request.channel() == null) {
            throw new BusinessException("CHANNEL_REQUIRED", "Canal requis : EMAIL ou SMS.");
        }
        String content = isBlank(request.content())
                ? "Test du centre de communication MNK-TAX — " + Instant.now()
                : request.content();
        String subject = isBlank(request.subject()) ? "MNK-TAX — Message test" : request.subject();
        DeliveryChannel channel = DeliveryChannel.valueOf(request.channel());
        ProviderResult result;
        if (channel == DeliveryChannel.EMAIL) {
            String to = properties.getTest().getEmailRecipient();
            if (isBlank(to)) {
                result = ProviderResult.failure("Aucune adresse de test configurée (COMM_TEST_EMAIL).", false);
            } else {
                String html = emailRenderer.render(subject, content, null, null, null);
                result = emailProvider.send(to, subject, html, null, List.<EmailAttachment>of());
            }
        } else if (channel == DeliveryChannel.SMS) {
            String to = properties.getTest().getSmsRecipient();
            if (isBlank(to)) {
                result = ProviderResult.failure("Aucun numéro de test configuré (COMM_TEST_SMS).", false);
            } else {
                result = smsProvider.send(to, content);
            }
        } else {
            throw new BusinessException("INVALID_CHANNEL",
                    "Le canal MNK-TAX ne nécessite pas d'envoi test externe.");
        }
        auditService.record("COMMUNICATION_TEST", "PROVIDER", request.channel(), null,
                result.success() ? "ok" : String.valueOf(result.error()), http);
        return new TestSendResult(result.success(), result.success()
                ? "Envoi réel effectué vers la destination de test configurée."
                : (result.error() == null ? "Échec de l'envoi test." : result.error()));
    }

    // ═══ Modèles ══════════════════════════════════════════════════

    @Transactional(readOnly = true)
    public List<TemplateDto> templates() {
        return templateRepository.findAll().stream().map(TemplateDto::from).toList();
    }

    @Transactional
    public TemplateDto saveTemplate(SaveTemplateRequest request, HttpServletRequest http) {
        if (request.code() == null || request.code().isBlank()) {
            throw new BusinessException("TEMPLATE_CODE_REQUIRED", "Le code du modèle est requis.");
        }
        MessageTemplate template = templateRepository.findByCode(request.code())
                .orElseGet(() -> MessageTemplate.builder()
                        .code(request.code())
                        .category(request.category() == null ? "GENERAL" : request.category())
                        .channels(request.channels() == null ? "IN_APP" : request.channels())
                        .bodyFr(request.bodyFr() == null ? "" : request.bodyFr())
                        .bodyMg(request.bodyMg() == null ? "" : request.bodyMg())
                        .bodyEn(request.bodyEn() == null ? "" : request.bodyEn())
                        .enabled(true)
                        .createdAt(Instant.now())
                        .build());
        if (request.category() != null) template.setCategory(request.category());
        if (request.channels() != null) template.setChannels(request.channels());
        template.setSubjectFr(request.subjectFr());
        template.setSubjectMg(request.subjectMg());
        template.setSubjectEn(request.subjectEn());
        if (request.bodyFr() != null) template.setBodyFr(request.bodyFr());
        if (request.bodyMg() != null) template.setBodyMg(request.bodyMg());
        if (request.bodyEn() != null) template.setBodyEn(request.bodyEn());
        template.setSmsBodyFr(request.smsBodyFr());
        template.setSmsBodyMg(request.smsBodyMg());
        template.setSmsBodyEn(request.smsBodyEn());
        if (request.enabled() != null) template.setEnabled(request.enabled());
        template.setUpdatedAt(Instant.now());
        MessageTemplate saved = templateRepository.save(template);
        auditService.record("TEMPLATE_UPDATED", "MESSAGE_TEMPLATE", request.code(), null, null, http);
        return TemplateDto.from(saved);
    }

    @Transactional(readOnly = true)
    public TemplateRenderResult renderTemplate(TemplateRenderRequest request) {
        MessageTemplate template = templateRepository.findByCode(request.templateCode())
                .orElseThrow(() -> new BusinessException("TEMPLATE_NOT_FOUND",
                        "Modèle introuvable : " + request.templateCode()));
        String language = request.language() == null ? "FR" : request.language();
        Map<String, String> vars = request.variables() == null ? Map.of() : request.variables();
        String sms = template.smsBodyFor(language);
        return new TemplateRenderResult(
                renderVars(template.subjectFor(language), vars),
                renderVars(template.bodyFor(language), vars),
                sms == null ? null : renderVars(sms, vars));
    }

    /** Substitution de variables {{name}} — les variables absentes restent visibles. */
    public static String renderVars(String template, Map<String, String> vars) {
        if (template == null) return null;
        String result = template;
        for (Map.Entry<String, String> entry : vars.entrySet()) {
            result = result.replace("{{" + entry.getKey() + "}}",
                    entry.getValue() == null ? "" : entry.getValue());
        }
        return result;
    }

    // ═══ Campagnes ════════════════════════════════════════════════

    @Transactional(readOnly = true)
    public CampaignAudiencePreview campaignAudiencePreview(String audience, String taxTypeCode) {
        List<Target> targets = resolveAudience(audience, taxTypeCode, null);
        int missingEmail = (int) targets.stream().filter(t -> isBlank(t.email)).count();
        int missingPhone = (int) targets.stream().filter(t -> isBlank(t.phoneNormalized)).count();
        return new CampaignAudiencePreview(targets.size(), missingEmail, missingPhone);
    }

    @Transactional
    public CampaignDto createCampaign(CampaignRequest request, HttpServletRequest http) {
        if (request.name() == null || request.name().isBlank()) {
            throw new BusinessException("CAMPAIGN_NAME_REQUIRED", "Le nom de la campagne est requis.");
        }
        List<Target> targets = resolveAudience(request.audience(), request.taxTypeCode(), request.taxpayerIds());
        if (targets.isEmpty()) {
            throw new BusinessException("NO_RECIPIENT", "Aucun destinataire pour cette campagne.");
        }
        List<String> channels = resolveChannels(request.channels());
        if (targets.size() > 100 && !Boolean.TRUE.equals(request.requireConfirmation())) {
            throw new BusinessException("CONFIRMATION_REQUIRED",
                    "Vous êtes sur le point d'envoyer cette campagne à " + targets.size()
                            + " contribuables. Confirmez.");
        }

        Campaign campaign = Campaign.builder()
                .reference(ReferenceGenerator.next("CMP"))
                .name(request.name())
                .audience(request.audience() == null ? "ALL" : request.audience())
                .audienceFilter(request.taxTypeCode())
                .channels(String.join(",", channels))
                .createdBy(SecurityUtils.currentUserId())
                .createdByName(SecurityUtils.currentUsername())
                .recipientCount(targets.size())
                .status(CampaignStatus.SENDING)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
        Campaign savedCampaign = campaignRepository.save(campaign);

        Instant scheduledAt = parseInstant(request.scheduledAt());
        int dispatched = 0;
        for (Target target : targets) {
            campaignRecipientRepository.save(CampaignRecipient.builder()
                    .campaignId(savedCampaign.getId())
                    .taxpayerId(target.taxpayerId)
                    .userId(target.userId)
                    .status("PENDING")
                    .createdAt(Instant.now())
                    .build());
            ComposeRequest compose = new ComposeRequest(
                    target.taxpayerId, target.userId, null, "SINGLE", null, null,
                    channels, request.subject(), request.content(), request.templateCode(),
                    null, request.priority(), "CAMPAIGN",
                    scheduledAt == null ? null : scheduledAt.toString(), true);
            try {
                compose(compose, http);
                dispatched++;
            } catch (BusinessException ex) {
                log.warn("Campagne {}: envoi impossible à {}: {}",
                        savedCampaign.getReference(), target.userId, ex.getMessage());
            }
        }
        savedCampaign.setStatus(dispatched == 0 ? CampaignStatus.FAILED : CampaignStatus.COMPLETED);
        savedCampaign.setSentCount(dispatched);
        savedCampaign.setFailedCount(targets.size() - dispatched);
        savedCampaign.setUpdatedAt(Instant.now());
        campaignRepository.save(savedCampaign);

        auditService.record("CAMPAIGN_CREATED", "CAMPAIGN", savedCampaign.getReference(),
                null, "recipients=" + targets.size() + ", dispatched=" + dispatched
                        + ", channels=" + channels, http);
        return CampaignDto.from(savedCampaign);
    }

    @Transactional(readOnly = true)
    public Page<CampaignDto> campaigns(Pageable pageable) {
        return campaignRepository.findAllByOrderByCreatedAtDesc(pageable).map(CampaignDto::from);
    }

    // ═══ Règles automatiques (configuration métier) ═══════════════

    @Transactional(readOnly = true)
    public List<EventRuleDto> eventRules() {
        return eventRuleRepository.findAllByOrderByEventTypeAsc().stream().map(EventRuleDto::from).toList();
    }

    @Transactional
    public EventRuleDto updateEventRule(Long id, UpdateEventRuleRequest request, HttpServletRequest http) {
        CommunicationEventRule rule = eventRuleRepository.findById(id)
                .orElseThrow(() -> new BusinessException("RULE_NOT_FOUND", "Règle introuvable."));
        if (request.channels() != null && !request.channels().isBlank()) {
            rule.setChannels(String.join(",", resolveChannels(List.of(request.channels()))));
        }
        if (request.priority() != null) rule.setPriority(request.priority());
        if (request.dayOffset() != null) rule.setDayOffset(request.dayOffset());
        if (request.enabled() != null) rule.setEnabled(request.enabled());
        rule.setUpdatedAt(Instant.now());
        CommunicationEventRule saved = eventRuleRepository.save(rule);
        auditService.record("EVENT_RULE_UPDATED", "COMMUNICATION_RULE", String.valueOf(id), null, null, http);
        return EventRuleDto.from(saved);
    }

    // ═══ Anti-doublon (relances automatiques) ════════════════════

    /**
     * Communications automatiques récentes d'un contribuable pour un type
     * d'événement — utilisé par le scheduler pour éviter les doublons.
     */
    @Transactional(readOnly = true)
    public List<Message> findRecentAutomatic(Long taxpayerId, String messageType, Instant since) {
        if (taxpayerId == null) {
            return List.of();
        }
        return messageRepository.findRecentAutomatic(taxpayerId, messageType, since,
                PageRequest.of(0, 1, Sort.by(Sort.Direction.DESC, "createdAt")));
    }

    // ═══ Résolution des destinataires ═════════════════════════════

    record Target(Long userId, Long taxpayerId, String email, String phoneNormalized, String language) {
    }

    List<Target> resolveTargets(ComposeRequest request) {
        if (request.audience() != null && !"SINGLE".equalsIgnoreCase(request.audience())) {
            return resolveAudience(request.audience(), request.taxTypeCode(), request.taxpayerIds());
        }
        if (request.taxpayerIds() != null && !request.taxpayerIds().isEmpty()) {
            return resolveAudience("IDS", null, request.taxpayerIds());
        }
        if (request.taxpayerId() != null) {
            return taxpayerRepository.findById(request.taxpayerId())
                    .map(t -> List.of(toTarget(t)))
                    .orElseThrow(() -> new BusinessException("TAXPAYER_NOT_FOUND", "Contribuable introuvable."));
        }
        Long userId = request.userId();
        if (userId == null && request.username() != null && !request.username().isBlank()) {
            userId = userRepository.findByUsername(request.username().trim()).map(User::getId)
                    .orElseThrow(() -> new BusinessException("RECIPIENT_NOT_FOUND",
                            "Destinataire inconnu : " + request.username()));
        }
        if (userId != null) {
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new BusinessException("RECIPIENT_NOT_FOUND", "Destinataire introuvable."));
            if (!user.isEnabled()) {
                throw new BusinessException("RECIPIENT_DISABLED", "Le compte du destinataire est désactivé.");
            }
            Taxpayer taxpayer = taxpayerRepository.findByUserId(userId).orElse(null);
            return List.of(new Target(userId,
                    taxpayer == null ? null : taxpayer.getId(),
                    user.getEmail(),
                    taxpayer == null ? null : taxpayer.getPhoneNormalized(),
                    taxpayer == null ? "FR" : taxpayer.getLanguage()));
        }
        throw new BusinessException("NO_RECIPIENT", "Aucun destinataire spécifié.");
    }

    private List<Target> resolveAudience(String audience, String taxTypeCode, List<Long> ids) {
        LinkedHashSet<Target> targets = new LinkedHashSet<>();
        if ("IDS".equalsIgnoreCase(audience) && ids != null) {
            for (Long taxpayerId : ids) {
                taxpayerRepository.findById(taxpayerId).ifPresent(t -> targets.add(toTarget(t)));
            }
            targets.removeIf(t -> t.userId == null);
            return new ArrayList<>(targets);
        }
        String audienceKey = audience == null ? "ALL" : audience.toUpperCase();
        switch (audienceKey) {
            case "ALL", "ALL_TAXPAYERS" -> taxpayerRepository.findByStatus(
                            com.mnktax.taxpayer.entity.TaxpayerStatus.ACTIVE)
                    .forEach(t -> targets.add(toTarget(t)));
            case "WITH_DEBT", "HAS_DEBT" -> debtRepository.findTaxpayersWithOutstandingDebt()
                    .forEach(t -> targets.add(toTarget(t)));
            case "OVERDUE", "IN_LATE" -> debtRepository.findTaxpayersWithOverdueDebt(LocalDate.now())
                    .forEach(t -> targets.add(toTarget(t)));
            case "TAX_TYPE" -> {
                if (taxTypeCode == null || taxTypeCode.isBlank()) {
                    throw new BusinessException("TAX_TYPE_REQUIRED",
                            "Le filtre par impôt nécessite un code impôt.");
                }
                taxpayerRepository.findByTaxTypeCode(taxTypeCode).forEach(t -> targets.add(toTarget(t)));
            }
            case "DUE_SOON" -> {
                LocalDate today = LocalDate.now();
                obligationRepository.findDueBetween(today, today.plusDays(7)).stream()
                        .map(o -> o.getTaxpayer())
                        .forEach(t -> targets.add(toTarget(t)));
            }
            default -> throw new BusinessException("AUDIENCE_UNKNOWN", "Audience inconnue : " + audience);
        }
        // Un contribuable sans compte utilisateur ne peut rien recevoir.
        targets.removeIf(t -> t.userId == null);
        return new ArrayList<>(targets);
    }

    private Target toTarget(Taxpayer taxpayer) {
        return new Target(taxpayer.getUserId(), taxpayer.getId(),
                taxpayer.getEmail(), taxpayer.getPhoneNormalized(), taxpayer.getLanguage());
    }

    // ═══ Helpers ══════════════════════════════════════════════════

    private List<String> resolveChannels(List<String> channels) {
        LinkedHashSet<String> result = new LinkedHashSet<>();
        if (channels != null) {
            for (String channel : channels) {
                if (channel == null) continue;
                for (String part : channel.split(",")) {
                    String value = part.trim().toUpperCase();
                    if (value.isEmpty()) continue;
                    try {
                        result.add(CommunicationChannel.valueOf(value).name());
                    } catch (IllegalArgumentException ex) {
                        throw new BusinessException("INVALID_CHANNEL", "Canal inconnu : " + value);
                    }
                }
            }
        }
        if (result.isEmpty()) result.add("IN_APP");
        return new ArrayList<>(result);
    }

    private MessagePriority parsePriority(String priority) {
        if (priority == null || priority.isBlank()) return MessagePriority.NORMAL;
        return switch (priority.toUpperCase()) {
            case "LOW", "NORMAL" -> MessagePriority.NORMAL;
            case "HIGH", "IMPORTANT" -> MessagePriority.IMPORTANT;
            case "URGENT" -> MessagePriority.URGENT;
            default -> throw new BusinessException("INVALID_PRIORITY", "Priorité inconnue : " + priority);
        };
    }

    private Instant parseInstant(String value) {
        if (value == null || value.isBlank()) return null;
        try {
            Instant parsed = Instant.parse(value);
            if (parsed.isBefore(Instant.now())) {
                throw new BusinessException("SCHEDULE_IN_PAST", "La date de programmation est dans le passé.");
            }
            return parsed;
        } catch (java.time.format.DateTimeParseException ex) {
            throw new BusinessException("INVALID_SCHEDULE_DATE", "Date de programmation invalide (ISO attendu).");
        }
    }

    private String resolveSenderName() {
        Long senderId = SecurityUtils.currentUserId();
        if (senderId == null) return SecurityUtils.currentUsername();
        return userRepository.findById(senderId)
                .map(u -> (u.getFirstName() + " " + u.getLastName()).trim())
                .filter(s -> !s.isBlank())
                .orElse(SecurityUtils.currentUsername());
    }

    private Map<String, String> baseVariables(Target target) {
        String name = "";
        String nif = "";
        if (target.taxpayerId != null) {
            Taxpayer taxpayer = taxpayerRepository.findById(target.taxpayerId).orElse(null);
            if (taxpayer != null) {
                name = taxpayer.getName() == null ? "" : taxpayer.getName();
                nif = taxpayer.getNif() == null ? "" : taxpayer.getNif();
            }
        }
        return Map.of("taxpayer_name", name, "nif", nif);
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }

    private static double round1(double value) {
        return Math.round(value * 10.0) / 10.0;
    }
}
