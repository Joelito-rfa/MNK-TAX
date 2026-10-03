package com.mnktax.tax.engine;

import com.mnktax.common.exception.BusinessException;
import com.mnktax.tax.entity.CalculationMethod;
import com.mnktax.tax.entity.TaxRegime;
import com.mnktax.tax.entity.TaxRule;
import com.mnktax.tax.entity.TaxType;
import com.mnktax.tax.repository.TaxRuleRepository;
import com.mnktax.taxpayer.entity.Taxpayer;
import com.mnktax.taxpayer.entity.TaxpayerType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RuleResolverTest {

    private static final LocalDate EFFECT_DATE = LocalDate.of(2026, 1, 15);

    @Mock
    private TaxRuleRepository ruleRepository;

    private RuleResolver resolver;

    @BeforeEach
    void setUp() {
        resolver = new RuleResolver(ruleRepository);
    }

    @Test
    @DisplayName("Le régime et l'activité du contribuable sont transmis à la résolution")
    void passesRegimeAndActivityToRepository() {
        when(ruleRepository.resolve(anyLong(), any(), any(), any(), any())).thenReturn(List.of(rule()));

        resolver.resolve(context(7L, "ACT-1"));

        verify(ruleRepository).resolve(1L, "COMPANY", 7L, "ACT-1", EFFECT_DATE);
    }

    @Test
    @DisplayName("Contribuable sans régime ni activité : les valeurs nulles sont transmises telles quelles")
    void passesNullRegimeAndActivity() {
        when(ruleRepository.resolve(anyLong(), any(), any(), any(), any())).thenReturn(List.of(rule()));

        resolver.resolve(context(null, null));

        verify(ruleRepository).resolve(1L, "COMPANY", null, null, EFFECT_DATE);
    }

    @Test
    @DisplayName("Première règle candidate retenue")
    void returnsFirstCandidate() {
        TaxRule specific = rule();
        when(ruleRepository.resolve(anyLong(), any(), any(), any(), any()))
                .thenReturn(List.of(specific, rule()));

        assertSame(specific, resolver.resolve(context(7L, null)));
    }

    @Test
    @DisplayName("Aucune règle applicable : erreur métier décrivant le contexte")
    void throwsWhenNoRuleFound() {
        when(ruleRepository.resolve(anyLong(), any(), any(), any(), any())).thenReturn(List.of());

        BusinessException ex = assertThrows(BusinessException.class, () -> resolver.resolve(context(7L, "ACT-1")));

        assertEquals("RULE_NOT_FOUND", ex.getCode());
        assertTrue(ex.getMessage().contains("MNZ-TEST"), ex.getMessage());
        assertTrue(ex.getMessage().contains("7"), "Le régime doit figurer dans le message : " + ex.getMessage());
        assertTrue(ex.getMessage().contains("ACT-1"), "L'activité doit figurer dans le message : " + ex.getMessage());
    }

    @Test
    @DisplayName("resolveOrNull renvoie null plutôt que de lever l'exception")
    void resolveOrNullSwallowsBusinessException() {
        when(ruleRepository.resolve(anyLong(), any(), any(), any(), any())).thenReturn(List.of());

        assertNull(resolver.resolveOrNull(context(7L, null)));
    }

    @Test
    @DisplayName("resolveOrNull renvoie la règle quand elle existe")
    void resolveOrNullReturnsRule() {
        TaxRule rule = rule();
        when(ruleRepository.resolve(anyLong(), any(), any(), any(), any())).thenReturn(List.of(rule));

        assertSame(rule, resolver.resolveOrNull(context(7L, null)));
    }

    private TaxContext context(Long regimeId, String activityCode) {
        return new TaxContext(taxpayer(regimeId), taxType(), "2026-01", EFFECT_DATE,
                new BigDecimal("1000000"), activityCode);
    }

    private Taxpayer taxpayer(Long regimeId) {
        return Taxpayer.builder()
                .type(TaxpayerType.COMPANY)
                .taxRegime(regimeId == null ? null : TaxRegime.builder().id(regimeId).code("RGT").build())
                .build();
    }

    private TaxType taxType() {
        return TaxType.builder().id(1L).code("MNZ-TEST").name("Impôt test").build();
    }

    private TaxRule rule() {
        return TaxRule.builder()
                .code("R-TEST")
                .calculationMethod(CalculationMethod.PERCENTAGE_OF_BASE)
                .rate(new BigDecimal("20"))
                .build();
    }
}
