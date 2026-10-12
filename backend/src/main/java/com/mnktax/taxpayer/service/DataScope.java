package com.mnktax.taxpayer.service;

import com.mnktax.auth.entity.Role;
import com.mnktax.common.exception.BusinessException;
import com.mnktax.common.util.SecurityUtils;
import com.mnktax.taxpayer.entity.Taxpayer;
import com.mnktax.taxpayer.repository.TaxpayerRepository;
import org.springframework.stereotype.Component;

/**
 * Isolation des données par ligne (« row-level scoping »).
 *
 * <p>Les permissions sont verticales : elles protègent les endpoints, pas les lignes.
 * Un compte {@code TAXPAYER} disposant de {@code TAXPAYER_READ}, {@code DEBT_READ},
 * {@code DECLARATION_READ}, {@code PAYMENT_READ} ou {@code RECEIPT_READ} pourrait donc
 * lire l'intégralité du registre. Ce composant ramène l'utilisateur courant sur son seul
 * dossier, rattaché via {@code taxpayers.user_id} (cf. V17__add_user_id_to_taxpayer.sql).</p>
 *
 * <p>Les rôles internes ne sont pas concernés : ils conservent la vue d'ensemble.</p>
 */
@Component
public class DataScope {

    private final TaxpayerRepository taxpayerRepository;

    public DataScope(TaxpayerRepository taxpayerRepository) {
        this.taxpayerRepository = taxpayerRepository;
    }

    /** Vrai si l'utilisateur courant est un contribuable (et non un agent / admin). */
    public boolean isSelfService() {
        return SecurityUtils.hasRole(Role.TAXPAYER);
    }

    /** Dossier du contribuable associé à l'utilisateur courant, ou {@code null} si non rattaché. */
    public Long currentTaxpayerId() {
        Long userId = SecurityUtils.currentUserId();
        if (userId == null) {
            return null;
        }
        return taxpayerRepository.findByUserId(userId).map(Taxpayer::getId).orElse(null);
    }

    /**
     * Remplace un filtre {@code taxpayerId} fourni par l'appelant par celui de l'utilisateur
     * courant. Un contribuable qui tente d'en lire un autre reçoit un 403.
     */
    public Long effectiveTaxpayerId(Long requestedTaxpayerId) {
        if (!isSelfService()) {
            return requestedTaxpayerId;
        }
        Long own = currentTaxpayerId();
        if (own == null) {
            throw new BusinessException("FORBIDDEN",
                    "Aucun dossier contribuable n'est rattaché à votre compte.");
        }
        if (requestedTaxpayerId != null && !requestedTaxpayerId.equals(own)) {
            throw new BusinessException("FORBIDDEN", "Vous ne pouvez consulter que votre propre dossier.");
        }
        return own;
    }

    /**
     * Interdit les agrégats globaux (statistiques, calendrier) aux contribuables :
     * ces endpoints agrègent l'ensemble du registre et divulguent des données
     * financières d'autres contribuables.
     */
    public void assertNotSelfService(String feature) {
        if (isSelfService()) {
            throw new BusinessException("FORBIDDEN",
                    "Les statistiques globales (" + feature + ") ne sont pas accessibles aux contribuables.");
        }
    }

    /**
     * Vérifie qu'un contribuable a le droit de lire la ligne dont l'identifiant de dossier
     * est fourni. Sans effet pour les rôles internes.
     */
    public void requireOwnership(Long taxpayerId) {
        if (!isSelfService()) {
            return;
        }
        Long own = currentTaxpayerId();
        if (own == null || taxpayerId == null || !own.equals(taxpayerId)) {
            throw new BusinessException("FORBIDDEN", "Vous ne pouvez consulter que votre propre dossier.");
        }
    }
}
