package com.mnktax.taxpayer.dto;

import com.mnktax.taxpayer.entity.Taxpayer;
import com.mnktax.taxpayer.entity.TaxpayerStatus;
import com.mnktax.taxpayer.entity.TaxpayerType;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.List;

public final class TaxpayerDtos {

    private TaxpayerDtos() {
    }

    public record CreateTaxpayerRequest(
            @Size(max = 10, message = "Le NIF doit contenir au maximum 10 chiffres.")
            String nif,
            @NotNull(message = "Le type est requis.") TaxpayerType type,
            @NotBlank(message = "Le nom est requis.") @Size(max = 200) String name,
            @Size(max = 200) String businessName,
            @Size(max = 80) String firstName,
            @Size(max = 80) String lastName,
            @Size(max = 30) String phone,
            @Email(message = "Email invalide.") @Size(max = 120) String email,
            @Size(max = 255) String address,
            LocalDate birthDate,
            @Size(max = 200) String legalRepresentative,
            LocalDate registrationDate,
            Long taxCenterId,
            Long taxRegimeId,
            List<AddressDto> addresses,
            List<ActivityDto> activities
    ) {
    }

    public record UpdateTaxpayerRequest(
            @NotNull(message = "Le type est requis.") TaxpayerType type,
            @Size(max = 200) String name,
            @Size(max = 200) String businessName,
            @Size(max = 80) String firstName,
            @Size(max = 80) String lastName,
            @Size(max = 30) String phone,
            @Email(message = "Email invalide.") @Size(max = 120) String email,
            @Size(max = 255) String address,
            LocalDate birthDate,
            @Size(max = 200) String legalRepresentative,
            LocalDate registrationDate,
            Long taxCenterId,
            Long taxRegimeId,
            @NotNull(message = "Le statut est requis.") TaxpayerStatus status
    ) {
    }

    public record AddressDto(Long id, String type, String addressLine1, String addressLine2,
                             String city, String region, String country, String postalCode) {
    }

    public record ActivityDto(Long id, String code, String label, String description, boolean primary) {
    }

    public record TaxpayerSummaryDto(Long id, String nif, TaxpayerType type, String name, String businessName,
                                     String phone, String email, TaxpayerStatus status,
                                     String taxCenterCode, String taxRegimeCode, java.time.Instant createdAt) {
        public static TaxpayerSummaryDto from(Taxpayer t) {
            return new TaxpayerSummaryDto(t.getId(), t.getNif(), t.getType(),
                    t.getName(), t.getBusinessName(), t.getPhone(), t.getEmail(), t.getStatus(),
                    t.getTaxCenter() == null ? null : t.getTaxCenter().getCode(),
                    t.getTaxRegime() == null ? null : t.getTaxRegime().getCode(),
                    t.getCreatedAt());
        }
    }

    public record TaxpayerDetailDto(Long id, String nif, TaxpayerType type, String name, String businessName,
                                    String firstName, String lastName, String phone, String email, String address,
                                    LocalDate birthDate, String legalRepresentative, LocalDate registrationDate,
                                    TaxpayerStatus status, Long taxCenterId, String taxCenterCode, String taxCenterName,
                                    Long taxRegimeId, String taxRegimeCode, String taxRegimeName,
                                    List<AddressDto> addresses, List<ActivityDto> activities,
                                    long obligationsCount) {
        public static TaxpayerDetailDto from(Taxpayer t, long obligationsCount) {
            return new TaxpayerDetailDto(t.getId(), t.getNif(), t.getType(), t.getName(),
                    t.getBusinessName(), t.getFirstName(), t.getLastName(), t.getPhone(), t.getEmail(),
                    t.getAddress(), t.getBirthDate(), t.getLegalRepresentative(), t.getRegistrationDate(),
                    t.getStatus(),
                    t.getTaxCenter() == null ? null : t.getTaxCenter().getId(),
                    t.getTaxCenter() == null ? null : t.getTaxCenter().getCode(),
                    t.getTaxCenter() == null ? null : t.getTaxCenter().getName(),
                    t.getTaxRegime() == null ? null : t.getTaxRegime().getId(),
                    t.getTaxRegime() == null ? null : t.getTaxRegime().getCode(),
                    t.getTaxRegime() == null ? null : t.getTaxRegime().getName(),
                    t.getAddresses().stream().map(a -> new AddressDto(a.getId(), a.getType(), a.getAddressLine1(),
                            a.getAddressLine2(), a.getCity(), a.getRegion(), a.getCountry(), a.getPostalCode())).toList(),
                    t.getActivities().stream().map(a -> new ActivityDto(a.getId(), a.getCode(), a.getLabel(),
                            a.getDescription(), a.isPrimary())).toList(),
                    obligationsCount);
        }
    }

    public record TaxpayerStatsDto(
            long total,
            long active,
            long inactive,
            long suspended,
            long closed,
            long withDebt,
            long overdueDebts,
            long pendingDeclarations
    ) {
    }
}
