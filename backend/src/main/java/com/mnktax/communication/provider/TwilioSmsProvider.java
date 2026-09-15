package com.mnktax.communication.provider;

import com.mnktax.communication.config.CommunicationProperties;
import com.twilio.Twilio;
import com.twilio.rest.api.v2010.account.Message;
import com.twilio.type.PhoneNumber;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * Fournisseur SMS réel : Twilio.
 * Credentials exclusivement via variables d'environnement :
 * SMS_PROVIDER=twilio, SMS_ACCOUNT_SID, SMS_AUTH_TOKEN, SMS_FROM_NUMBER.
 *
 * Sans configuration, isConfigured() == false : aucun SMS n'est prétendu envoyé.
 */
@Component
public class TwilioSmsProvider implements SmsProvider {

    private static final Logger log = LoggerFactory.getLogger(TwilioSmsProvider.class);

    private final CommunicationProperties properties;
    private volatile boolean initialized = false;

    public TwilioSmsProvider(CommunicationProperties properties) {
        this.properties = properties;
    }

    @PostConstruct
    void init() {
        CommunicationProperties.Sms sms = properties.getSms();
        if ("twilio".equalsIgnoreCase(sms.getProvider())
                && notBlank(sms.getAccountSid()) && notBlank(sms.getAuthToken())) {
            try {
                Twilio.init(sms.getAccountSid(), sms.getAuthToken());
                initialized = true;
                log.info("Fournisseur SMS Twilio initialisé.");
            } catch (Exception ex) {
                log.error("Échec d'initialisation Twilio : {}", ex.getMessage());
            }
        } else {
            log.info("Aucun fournisseur SMS configuré — le canal SMS restera indisponible.");
        }
    }

    @Override
    public boolean isConfigured() {
        return initialized && notBlank(properties.getSms().getFromNumber());
    }

    @Override
    public String providerName() {
        return "TWILIO";
    }

    @Override
    public ProviderResult send(String toNormalized, String text) {
        if (!isConfigured()) {
            return ProviderResult.failure("Service SMS non configuré (fournisseur absent).", false);
        }
        try {
            Message message = Message.creator(
                    new PhoneNumber(toNormalized),
                    new PhoneNumber(properties.getSms().getFromNumber()),
                    text
            ).create();
            log.info("SMS transmis à {} (SID {})", toNormalized, message.getSid());
            return ProviderResult.ok(message.getSid());
        } catch (com.twilio.exception.TwilioException ex) {
            log.warn("Échec Twilio vers {} : {}", toNormalized, ex.getMessage());
            String msg = String.valueOf(ex.getMessage());
            boolean retryable = msg.contains("429") || msg.contains("503") || msg.contains("timeout");
            return ProviderResult.failure("Échec SMS : " + msg, retryable);
        } catch (Exception ex) {
            log.warn("Erreur inattendue SMS vers {}", toNormalized, ex);
            return ProviderResult.failure("Erreur SMS : " + ex.getMessage(), true);
        }
    }

    private static boolean notBlank(String value) {
        return value != null && !value.isBlank();
    }
}
