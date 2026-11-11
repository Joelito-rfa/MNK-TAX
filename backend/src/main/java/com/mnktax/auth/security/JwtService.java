package com.mnktax.auth.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.time.Instant;
import java.util.Date;
import java.util.Map;
import java.util.function.Function;

@Service
public class JwtService {

    /**
     * Ancienne valeur de repli publiée dans le dépôt : refusée explicitement
     * pour empêcher tout déploiement de signer ses jetons avec un secret connu.
     */
    private static final String LEGACY_INSECURE_SECRET =
            "Y2hhbmdlLW1lLWludGVybmFsLXNlY3JldC1mb3ItbW5rLXRheC1wcm90b3R5cGUtMDAx";

    private static final int MIN_SECRET_BYTES = 32;

    private final SecretKey signingKey;
    private final long accessTtlSeconds;
    private final long refreshTtlSeconds;

    public JwtService(@Value("${mnk-tax.jwt.secret}") String secret,
                      @Value("${mnk-tax.jwt.access-token-ttl:3600}") long accessTtlSeconds,
                      @Value("${mnk-tax.jwt.refresh-token-ttl:604800}") long refreshTtlSeconds) {
        this.signingKey = buildSigningKey(secret);
        this.accessTtlSeconds = accessTtlSeconds;
        this.refreshTtlSeconds = refreshTtlSeconds;
    }

    private static SecretKey buildSigningKey(String secret) {
        if (secret == null || secret.isBlank()) {
            throw new IllegalStateException(
                    "JWT_SECRET est obligatoire : définissez un secret aléatoire (openssl rand -base64 64).");
        }
        if (LEGACY_INSECURE_SECRET.equals(secret.trim())) {
            throw new IllegalStateException(
                    "JWT_SECRET utilise l'ancienne valeur de démonstration, publiquement connue. "
                            + "Générez un nouveau secret (openssl rand -base64 64).");
        }
        byte[] keyBytes;
        try {
            keyBytes = Decoders.BASE64.decode(secret.trim());
        } catch (RuntimeException ex) {
            throw new IllegalStateException("JWT_SECRET doit être une chaîne encodée en Base64.", ex);
        }
        if (keyBytes.length < MIN_SECRET_BYTES) {
            throw new IllegalStateException(
                    "JWT_SECRET doit décoder au moins " + MIN_SECRET_BYTES + " octets (256 bits).");
        }
        return Keys.hmacShaKeyFor(keyBytes);
    }

    public String generateAccessToken(UserDetails userDetails, Map<String, Object> extraClaims) {
        Instant now = Instant.now();
        return Jwts.builder()
                .claims(extraClaims)
                .subject(userDetails.getUsername())
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusSeconds(accessTtlSeconds)))
                .signWith(signingKey)
                .compact();
    }

    public String generateRefreshToken(UserDetails userDetails) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(userDetails.getUsername())
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusSeconds(refreshTtlSeconds)))
                .signWith(signingKey)
                .compact();
    }

    public long getAccessTtlSeconds() {
        return accessTtlSeconds;
    }

    public long getRefreshTtlSeconds() {
        return refreshTtlSeconds;
    }

    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    public boolean isTokenValid(String token, UserDetails userDetails) {
        final String username = extractUsername(token);
        return username.equals(userDetails.getUsername()) && !isTokenExpired(token);
    }

    private boolean isTokenExpired(String token) {
        return extractClaim(token, Claims::getExpiration).before(new Date());
    }

    private <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        return claimsResolver.apply(extractAllClaims(token));
    }

    private Claims extractAllClaims(String token) {
        return Jwts.parser().verifyWith(signingKey).build().parseSignedClaims(token).getPayload();
    }
}
