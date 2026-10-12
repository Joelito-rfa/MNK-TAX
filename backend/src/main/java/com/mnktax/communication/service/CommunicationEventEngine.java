package com.mnktax.communication.service;

import com.mnktax.communication.dto.CommunicationDtos.ComposeRequest;
import com.mnktax.communication.dto.CommunicationDtos.ComposeResult;
import com.mnktax.communication.entity.CommunicationEventRule;
import com.mnktax.communication.entity.CommunicationEventType;
import com.mnktax.communication.repository.CommunicationEventRuleRepository;
import com.mnktax.message.entity.MessageContextType;
import com.mnktax.taxpayer.entity.Taxpayer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Moteur de notification automatique :
 * ÉVÉNEMENT → règles activées → modèle → langue du contribuable → canaux → file
 * d'envoi → statuts réels.
 *
 * Les délais (J-7, J-3, J+1, J+7, J+15…) vivent dans communication_event_rules
 * (configuration métier) — jamais dans le frontend. Les canaux effectivement
 * utilisés sont l'intersection entre la règle et les préférences du contribuable.
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
                        Map<String, String> variables) {
        onEvent(eventType, taxpayer, variables, null, null);
    }

    /**
     * Variante contextualisée (rappels d'échéance) : la référence contextuelle sert
     * d'anti-doublon exact (chaque palier J-7/J-3/J-1/J-0 envoie une seule fois).
     */
    public void onEvent(CommunicationEventType eventType, Taxpayer taxpayer,
                        Map<String, String> variables,
                        MessageContextType contextType, String contextRef) {
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

            for (CommunicationEventRule rule : rules) {
                List<String> channels = effectiveChannels(rule, taxpayer);
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
                        true, null, null, null, null,
                        contextType,
                        contextRef);
                ComposeResult result = communicationService.compose(request, null);
                log.info("Événement {} : communication {} canaux={} destinataire={}",
                        eventType, rule.getTemplateCode(), String.join(",", channels), taxpayer.getNif());
            }
        } catch (Exception ex) {
            log.error("Échec du moteur de notification pour {} (contribuable {}) : {}",
                    eventType, taxpayer == null ? "?" : taxpayer.getNif(), ex.getMessage(), ex);
        }
    }

    /**
     * Intersection des canaux de la règle et des préférences du contribuable.
     * Repli sur IN_APP si l'intersection est vide (le canal interne est toujours
     * disponible et ne dépend d'aucun fournisseur externe).
     */
    private List<String> effectiveChannels(CommunicationEventRule rule, Taxpayer taxpayer) {
        List<String> ruleChannels = splitCsv(rule.getChannels());
        List<String> preferred = splitCsv(taxpayer.getPreferredChannels());
        List<String> intersection = ruleChannels.stream().filter(preferred::contains).toList();
        if (intersection.isEmpty()) {
            return List.of("IN_APP");
        }
        return intersection;
    }

    private static List<String> splitCsv(String value) {
        if (value == null || value.isBlank()) {
            return List.of();
        }
        return Arrays.stream(value.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toList();
    }
}
