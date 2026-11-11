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
    private final DemoProvider demoProvider = new DemoProvider();

    public Mail getMail() { return mail; }
    public Sms getSms() { return sms; }
    public Queue getQueue() { return queue; }
    public Test getTest() { return test; }
    public DemoProvider getDemoProvider() { return demoProvider; }

    /**
     * true lorsque le fournisseur de démonstration (log uniquement) est actif :
     * les canaux EMAIL/SMS simulés sont alors traités comme configurés, sans
     * envoi réel — utile pour une démo de bout en bout sans credentials.
     */
    public boolean isDemoProviderEnabled() {
        return demoProvider.isEnabled();
    }

    /**
     * true si le fournisseur MailerSend utilise encore son domaine d'essai
     * ({@code *.mlsender.net}) : le compte sandbox est alors limité à
     * 2 destinataires uniques, quel que soit le nombre d'envois.
     */
    public boolean isMailerSendTrialSender() {
        String from = mail.getFromAddress();
        return "mailersend".equalsIgnoreCase(mail.getProvider())
                && from != null
                && from.toLowerCase(java.util.Locale.ROOT).endsWith(".mlsender.net");
    }

    /**
     * Vérifie la présence effective de MAIL_HOST, qu'il provienne des variables
     * d'environnement, de {@code .env.local} (profil dev) ou d'application.yml.
     */
    public boolean isMailHostConfigured() {
        return mail.getHost() != null && !mail.getHost().isBlank();
    }

    public static class Mail {
        /** Fournisseur email : smtp (défaut) ou mailersend (API HTTPS). */
        private String provider = "smtp";
        /** Jeton API MailerSend — utilisé uniquement si provider=mailersend. */
        private String apiToken = "";
        private String apiUrl = "https://api.mailersend.com/v1/email";
        /** true dès qu'un SMTP réel est renseigné (MAIL_HOST). */
        private boolean enabled = false;
        private String host = "";
        private int port = 587;
        private String username = "";
        private String password = "";
        private boolean smtpAuth = true;
        private boolean starttls = true;
        /** Connexion TLS implicite (port 465). */
        private boolean ssl = false;
        /** Hôtes de confiance TLS (vide = validation standard). */
        private String sslTrust = "";
        private boolean debug = false;
        private String fromAddress = "no-reply@mnk-tax.mg";
        private String fromName = "MNK-TAX — Administration fiscale";
        private String baseUrl = "http://localhost:5177";
        /** Expéditeurs supplémentaires autorisés (sélecteur UI) — ex. COMM_EXTRA_SENDERS. */
        private java.util.List<String> extraSenders = new java.util.ArrayList<>();

        public String getProvider() { return provider; }
        public void setProvider(String provider) { this.provider = provider == null ? "smtp" : provider; }
        public String getApiToken() { return apiToken; }
        public void setApiToken(String apiToken) { this.apiToken = apiToken == null ? "" : apiToken; }
        public String getApiUrl() { return apiUrl; }
        public void setApiUrl(String apiUrl) {
            this.apiUrl = apiUrl == null || apiUrl.isBlank()
                    ? "https://api.mailersend.com/v1/email" : apiUrl;
        }
        public boolean isEnabled() { return enabled; }
        public void setEnabled(boolean enabled) { this.enabled = enabled; }
        public String getHost() { return host; }
        public void setHost(String host) { this.host = host == null ? "" : host; }
        public int getPort() { return port; }
        public void setPort(int port) { this.port = port; }
        public String getUsername() { return username; }
        public void setUsername(String username) { this.username = username == null ? "" : username; }
        public String getPassword() { return password; }
        public void setPassword(String password) { this.password = password == null ? "" : password; }
        public boolean isSmtpAuth() { return smtpAuth; }
        public void setSmtpAuth(boolean smtpAuth) { this.smtpAuth = smtpAuth; }
        public boolean isStarttls() { return starttls; }
        public void setStarttls(boolean starttls) { this.starttls = starttls; }
        public boolean isSsl() { return ssl; }
        public void setSsl(boolean ssl) { this.ssl = ssl; }
        public String getSslTrust() { return sslTrust; }
        public void setSslTrust(String sslTrust) { this.sslTrust = sslTrust == null ? "" : sslTrust; }
        public boolean isDebug() { return debug; }
        public void setDebug(boolean debug) { this.debug = debug; }
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

        /** Filet de sécurité : relance les emails en échec après épuisement des tentatives. */
        private boolean autoRetryEnabled = true;
        /** Nombre maximal de cycles de relance automatique par livraison. */
        private int autoRetryMaxCycles = 6;
        /** Ne relance pas un échec plus vieux que N heures. */
        private long autoRetryMaxAgeHours = 72;
        /** Délai de base entre deux cycles de relance (progressif : base × (cycle + 1)). */
        private long autoRetryBackoffMinutes = 15;
        /** Une livraison SENDING sans nouvelle tentative depuis N minutes est considérée interrompue. */
        private long staleSendingMinutes = 10;

        public int getBatchSize() { return batchSize; }
        public void setBatchSize(int batchSize) { this.batchSize = batchSize; }
        public int getMaxAttempts() { return maxAttempts; }
        public void setMaxAttempts(int maxAttempts) { this.maxAttempts = maxAttempts; }
        public long getRetryBackoffMinutes() { return retryBackoffMinutes; }
        public void setRetryBackoffMinutes(long retryBackoffMinutes) { this.retryBackoffMinutes = retryBackoffMinutes; }
        public boolean isAutoRetryEnabled() { return autoRetryEnabled; }
        public void setAutoRetryEnabled(boolean autoRetryEnabled) { this.autoRetryEnabled = autoRetryEnabled; }
        public int getAutoRetryMaxCycles() { return autoRetryMaxCycles; }
        public void setAutoRetryMaxCycles(int autoRetryMaxCycles) { this.autoRetryMaxCycles = autoRetryMaxCycles; }
        public long getAutoRetryMaxAgeHours() { return autoRetryMaxAgeHours; }
        public void setAutoRetryMaxAgeHours(long autoRetryMaxAgeHours) { this.autoRetryMaxAgeHours = autoRetryMaxAgeHours; }
        public long getAutoRetryBackoffMinutes() { return autoRetryBackoffMinutes; }
        public void setAutoRetryBackoffMinutes(long autoRetryBackoffMinutes) { this.autoRetryBackoffMinutes = autoRetryBackoffMinutes; }
        public long getStaleSendingMinutes() { return staleSendingMinutes; }
        public void setStaleSendingMinutes(long staleSendingMinutes) { this.staleSendingMinutes = staleSendingMinutes; }
    }

    /**
     * Fournisseur de démonstration : aucune dépendance externe, se contente de
     * journaliser l'envoi et de le marquer SENT. Activable/désactivable via
     * COMM_DEMO_PROVIDER.
     */
    public static class DemoProvider {
        private boolean enabled = true;

        public boolean isEnabled() { return enabled; }
        public void setEnabled(boolean enabled) { this.enabled = enabled; }
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
