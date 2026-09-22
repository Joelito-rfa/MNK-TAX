package com.mnktax.communication.service;

import com.mnktax.communication.dto.CommunicationDtos.ComposeRequest;
import com.mnktax.communication.dto.CommunicationDtos.ComposeResult;
import com.mnktax.communication.entity.CommunicationEventType;
import com.mnktax.communication.repository.CommunicationEventRuleRepository;
import com.mnktax.common.util.SecurityUtils;
import com.mnktax.taxpayer.entity.Taxpayer;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Moteur de notification automatique :
 * ÉVÉNEMENT → règles activées → modèle → langue du contribuable → canaux →
 * file d'envoi → statuts réels.
 *
 * Les délais (J-7, J-3, J+1, J+7, J+15…) vivent dans communication_event_rules
 * (configuration métier) — jamais dans le frontend.
 */
@Service
public class CommunicationEventEngine {

    private static final Logger log = LoggerFactory.getLogger(CommunicationEventEngine.class);

    private final CommunicationEventRuleRepository ruleRepository;
    private final CommunicationService communicationService;

    public CommunicationEventEngine(CommunicationEventRuleRepository ruleRepository,
                                    CommunicationService communicationService) {
        this.ruleRepository = ruleRepository;
        this.communicationService = communicationService;
    }

    /**
     * Déclenche les communications configurées pour un événement métier.
     * Silencieux : une erreur de notification ne doit jamais casser le flux métier.
     */
    public void onEvent(CommunicationEventType eventType, Taxpayer taxpayer,
                        Map<String, String> variables, HttpServletRequest http) {
        try {
            if (taxpayer == null || taxpayer.getUserId() == null) {
                return;
            }
            var rules = ruleRepository.findByEventTypeAndEnabledTrue(eventType);
            if (rules.isEmpty()) {
                return;
            }
            Map<String, String> vars = new HashMap<>();
            if (variables != null) {
                vars.putAll(variables);
            }
            vars.putIfAbsent("taxpayer_name", taxpayer.getName() == null ? "" : taxpayer.getName());
            vars.putIfAbsent("nif", taxpayer.getNif() == null ? "" : taxpayer.getNif());

            for (var rule : rules) {
                List<String> channels = List.of(rule.getChannels().split(","));
                ComposeRequest request = new ComposeRequest(
                        taxpayer.getId(),
                        taxpayer.getUserId(),
                        null,
                        "SINGLE",
                        null,
                        null,
                        channels,
                        null,                     // sujet issu du modèle
                        null,                     // contenu issu du modèle
                        rule.getTemplateCode(),
                        null,                     // langue du contribuable
                        rule.getPriority(),
                        eventType.name(),
                        null,
                        true, null, null, null, null);
                ComposeResult result = communicationService.compose(request, http);
                log.info("Événement {} : communication {} canaux={} destinataire={}",
                        eventType, rule.getTemplateCode(), rule.getChannels(), taxpayer.getNif());
            }
        } catch (Exception ex) {
            log.error("Échec du moteur de notification pour {} (contribuable {}) : {}",
                    eventType, taxpayer == null ? "?" : taxpayer.getNif(), ex.getMessage(), ex);
        }
    }

    /** Variante sans contexte HTTP (scheduler). */
    public void onEvent(CommunicationEventType eventType, Taxpayer taxpayer, Map<String, String> variables) {
        onEvent(eventType, taxpayer, variables, null);
    }
}
