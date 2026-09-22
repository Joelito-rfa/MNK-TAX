package com.mnktax.communication.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Configuration du centre de communication — uniquement via variables
 * d'environnement / application.yml. Aucun credential dans le code.
 */
@ConfigurationProperties(prefix = "mnk-tax.communication")
public class CommunicationProperties {

    private final Mail mail = new Mail();
    private final Sms sms = new Sms();
    private final Queue queue = new Queue();
    private final Test test = new Test();

    public Mail getMail() { return mail; }
    public Sms getSms() { return sms; }
    public Queue getQueue() { return queue; }
    public Test getTest() { return test; }

    /** Vérifie la présence effective de MAIL_HOST dans l'environnement. */
    public boolean isMailHostConfigured() {
        String host = System.getenv("MAIL_HOST");
        if (host == null || host.isBlank()) {
            host = System.getProperty("MAIL_HOST");
        }
        return host != null && !host.isBlank();
    }

    public static class Mail {
        /** true dès que spring.mail.host est renseigné (SMTP réel). */
        private boolean enabled = false;
        private String fromAddress = "no-reply@mnk-tax.mg";
        private String fromName = "MNK-TAX — Administration fiscale";
        private String baseUrl = "http://localhost:5177";
        /** Expéditeurs supplémentaires autorisés (sélecteur UI) — ex. COMM_EXTRA_SENDERS. */
        private java.util.List<String> extraSenders = new java.util.ArrayList<>();

        public boolean isEnabled() { return enabled; }
        public void setEnabled(boolean enabled) { this.enabled = enabled; }
        public String getFromAddress() { return fromAddress; }
        public void setFromAddress(String fromAddress) { this.fromAddress = fromAddress; }
        public String getFromName() { return fromName; }
        public void setFromName(String fromName) { this.fromName = fromName; }
        public String getBaseUrl() { return baseUrl; }
        public void setBaseUrl(String baseUrl) { this.baseUrl = baseUrl; }
        public java.util.List<String> getExtraSenders() { return extraSenders; }
        public void setExtraSenders(java.util.List<String> extraSenders) {
            this.extraSenders = extraSenders == null ? new java.util.ArrayList<>() : extraSenders;
        }
    }

    public static class Sms {
        /** false tant qu'aucun fournisseur SMS réel n'est configuré → aucun faux statut "envoyé". */
        private boolean enabled = false;
        private String provider = "none"; // none | twilio
        private String accountSid;
        private String authToken;
        private String fromNumber;

        public boolean isEnabled() { return enabled; }
        public void setEnabled(boolean enabled) { this.enabled = enabled; }
        public String getProvider() { return provider; }
        public void setProvider(String provider) { this.provider = provider; }
        public String getAccountSid() { return accountSid; }
        public void setAccountSid(String accountSid) { this.accountSid = accountSid; }
        public String getAuthToken() { return authToken; }
        public void setAuthToken(String authToken) { this.authToken = authToken; }
        public String getFromNumber() { return fromNumber; }
        public void setFromNumber(String fromNumber) { this.fromNumber = fromNumber; }
    }

    public static class Queue {
        private int batchSize = 50;
        private int maxAttempts = 3;
        private long retryBackoffMinutes = 5;

        public int getBatchSize() { return batchSize; }
        public void setBatchSize(int batchSize) { this.batchSize = batchSize; }
        public int getMaxAttempts() { return maxAttempts; }
        public void setMaxAttempts(int maxAttempts) { this.maxAttempts = maxAttempts; }
        public long getRetryBackoffMinutes() { return retryBackoffMinutes; }
        public void setRetryBackoffMinutes(long retryBackoffMinutes) { this.retryBackoffMinutes = retryBackoffMinutes; }
    }

    public static class Test {
        /** Adresse email / numéro de test explicite — utilisé uniquement pour l'envoi test admin. */
        private String emailRecipient;
        private String smsRecipient;

        public String getEmailRecipient() { return emailRecipient; }
        public void setEmailRecipient(String emailRecipient) { this.emailRecipient = emailRecipient; }
        public String getSmsRecipient() { return smsRecipient; }
        public void setSmsRecipient(String smsRecipient) { this.smsRecipient = smsRecipient; }
    }
}
