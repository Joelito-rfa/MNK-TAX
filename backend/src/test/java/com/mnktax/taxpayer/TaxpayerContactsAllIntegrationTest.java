package com.mnktax.taxpayer;

import com.mnktax.taxpayer.dto.TaxpayerDtos;
import com.mnktax.taxpayer.entity.Taxpayer;
import com.mnktax.taxpayer.entity.TaxpayerStatus;
import com.mnktax.taxpayer.entity.TaxpayerType;
import com.mnktax.taxpayer.repository.TaxpayerRepository;
import com.mnktax.taxpayer.service.TaxpayerService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.time.Instant;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * La sélection du contributeur dans le composeur doit proposer l'intégralité
 * du registre (et non une liste vide ou paginée).
 */
@SpringBootTest
@ActiveProfiles("test")
class TaxpayerContactsAllIntegrationTest {

    @Autowired private TaxpayerService taxpayerService;
    @Autowired private TaxpayerRepository taxpayerRepository;

    private void register(String nif, String name) {
        if (taxpayerRepository.findByNif(nif).isPresent()) return;
        taxpayerRepository.save(Taxpayer.builder()
                .nif(nif)
                .type(TaxpayerType.PERSON)
                .name(name)
                .email(nif + "@demo.mg")
                .phone("034 00 000 00")
                .phoneNormalized("+261340000000")
                .language("FR")
                .status(TaxpayerStatus.ACTIVE)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build());
    }

    @Test
    @DisplayName("Tous les contribuables enregistrés sont proposés, triés par nom")
    void allContactsReturnsWholeRegister() {
        register("1200000001", "Zorro contributed");
        register("1200000002", "Alpha contributed");
        register("1200000003", "Mid contributed");

        List<TaxpayerDtos.TaxpayerContactDto> all = taxpayerService.allContacts();

        assertTrue(all.size() >= 3, "Le registre doit contenir au moins les 3 contribuables de test");
        List<String> names = all.stream().map(TaxpayerDtos.TaxpayerContactDto::name).toList();
        assertTrue(names.contains("Alpha contributed"));
        assertTrue(names.contains("Mid contributed"));
        assertTrue(names.contains("Zorro contributed"));
        // Tri par nom : "Alpha contributed" avant "Mid contributed".
        assertTrue(names.indexOf("Alpha contributed") < names.indexOf("Mid contributed"),
                "La liste doit être triée par nom");
        // Les coordonnées de communication sont bien renseignées.
        TaxpayerDtos.TaxpayerContactDto first = all.stream()
                .filter(c -> "Alpha contributed".equals(c.name())).findFirst().orElseThrow();
        assertEquals("1200000002", first.nif());
        assertEquals("1200000002@demo.mg", first.email());
        assertEquals("+261340000000", first.phoneNormalized());
    }
}
