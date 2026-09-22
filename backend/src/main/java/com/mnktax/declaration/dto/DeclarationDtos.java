package com.mnktax.declaration.dto;

import com.mnktax.declaration.entity.Declaration;
import com.mnktax.declaration.entity.DeclarationAnnexe;
import com.mnktax.declaration.entity.DeclarationHistory;
import com.mnktax.declaration.entity.DeclarationLine;
import com.mnktax.declaration.entity.DeclarationStatus;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public final class DeclarationDtos {

    private DeclarationDtos() {
    }

    public record LineRequest(
            Integer lineNumber,
            @NotBlank(message = "Le libellé est requis.") String label,
            @NotNull(message = "Le montant est requis.") @PositiveOrZero BigDecimal amount
    ) {
    }

    public record CreateDeclarationRequest(
            @NotNull(message = "L'ID du contribuable est requis.") Long taxpayerId,
            @NotBlank(message = "Le code de l'impôt est requis.") String taxTypeCode,
            @NotBlank(message = "La période est requise.") String period,
            String exercice,
            String regime,
            @NotNull @PositiveOrZero BigDecimal taxBase,
            @PositiveOrZero BigDecimal declaredAmount,
            BigDecimal taux,
            LocalDate dateEcheance,
            Long taxCenterId,
            Long declarationOrigineId,
            List<@Valid LineRequest> lines
    ) {
    }

    public record UpdateDeclarationRequest(
            @NotNull @PositiveOrZero BigDecimal taxBase,
            @PositiveOrZero BigDecimal declaredAmount,
            BigDecimal taux,
            String exercice,
            String regime,
            LocalDate dateEcheance,
            Long taxCenterId,
            List<@Valid LineRequest> lines
    ) {
    }

    public record ValidateRequest(String comment) {
    }

    public record RejectRequest(
            @NotBlank(message = "Le motif est requis.") String motif
    ) {
    }

    public record CorrectionRequest(
            @NotBlank(message = "Le motif est requis.") String motif
    ) {
    }

    public record RectificativeRequest(
            BigDecimal taxBase,
            BigDecimal declaredAmount,
            BigDecimal taux,
            String exercice,
            String regime,
            LocalDate dateEcheance,
            List<@Valid LineRequest> lines
    ) {
    }

    public record DeclarationDto(
            Long id, String reference, Long taxpayerId, String nif, String taxpayerName,
            Long taxTypeId, String taxTypeCode, String taxTypeName, String period,
            String exercice, String regime,
            LocalDate submissionDate, DeclarationStatus status, BigDecimal taxBase,
            BigDecimal declaredAmount, BigDecimal taux, BigDecimal calculatedTax,
            BigDecimal penalites, BigDecimal totalAPayer, BigDecimal montantPaye, BigDecimal resteAPayer,
            LocalDate dateEcheance, LocalDate dueDate,
            boolean rectificative, Long declarationOrigineId, String motifCorrection,
            Long taxCenterId, String taxCenterName,
            String submittedBy, Instant submittedAt, String validatedBy, Instant validatedAt,
            String validationComment, Instant createdAt, Instant updatedAt,
            List<LineDto> lines, List<AnnexeDto> annexes, int historyCount
    ) {
        public static DeclarationDto from(Declaration d) {
            return new DeclarationDto(
                    d.getId(), d.getReference(),
                    d.getTaxpayer().getId(), d.getTaxpayer().getNif(), d.getTaxpayer().getName(),
                    d.getTaxType().getId(), d.getTaxType().getCode(), d.getTaxType().getName(),
                    d.getPeriod(), d.getExercice(), d.getRegime(),
                    d.getSubmissionDate(), d.getStatus(), d.getTaxBase(),
                    d.getDeclaredAmount(), d.getTaux(), d.getCalculatedTax(),
                    d.getPenalites(), d.getTotalAPayer(), d.getMontantPaye(), d.getResteAPayer(),
                    d.getDateEcheance(), d.getDueDate(),
                    d.isRectificative(),
                    d.getDeclarationOrigine() != null ? d.getDeclarationOrigine().getId() : null,
                    d.getMotifCorrection(),
                    d.getTaxCenter() != null ? d.getTaxCenter().getId() : null,
                    d.getTaxCenter() != null ? d.getTaxCenter().getName() : null,
                    d.getSubmittedBy(), d.getSubmittedAt(),
                    d.getValidatedBy(), d.getValidatedAt(),
                    d.getValidationComment(), d.getCreatedAt(), d.getUpdatedAt(),
                    d.getLines() == null ? List.of() : d.getLines().stream().map(LineDto::from).toList(),
                    d.getAnnexes() == null ? List.of() : d.getAnnexes().stream().map(AnnexeDto::from).toList(),
                    d.getHistory() == null ? 0 : d.getHistory().size()
            );
        }

        public static DeclarationDto fromReport(Declaration d) {
            return new DeclarationDto(
                    d.getId(), d.getReference(),
                    d.getTaxpayer().getId(), d.getTaxpayer().getNif(), d.getTaxpayer().getName(),
                    d.getTaxType().getId(), d.getTaxType().getCode(), d.getTaxType().getName(),
                    d.getPeriod(), d.getExercice(), d.getRegime(),
                    d.getSubmissionDate(), d.getStatus(), d.getTaxBase(),
                    d.getDeclaredAmount(), d.getTaux(), d.getCalculatedTax(),
                    d.getPenalites(), d.getTotalAPayer(), d.getMontantPaye(), d.getResteAPayer(),
                    d.getDateEcheance(), d.getDueDate(),
                    d.isRectificative(), null, d.getMotifCorrection(),
                    d.getTaxCenter() != null ? d.getTaxCenter().getId() : null,
                    d.getTaxCenter() != null ? d.getTaxCenter().getName() : null,
                    d.getSubmittedBy(), d.getSubmittedAt(),
                    d.getValidatedBy(), d.getValidatedAt(),
                    d.getValidationComment(), d.getCreatedAt(), d.getUpdatedAt(),
                    List.of(), List.of(), 0
            );
        }
    }

    public record LineDto(Long id, int lineNumber, String label, BigDecimal amount) {
        public static LineDto from(DeclarationLine line) {
            return new LineDto(line.getId(), line.getLineNumber(), line.getLabel(), line.getAmount());
        }
    }

    public record AnnexeDto(Long id, String nom, String fichier, String typeMime, Long taille,
                            String categorie, boolean obligatoire, String uploadedBy, Instant createdAt) {
        public static AnnexeDto from(DeclarationAnnexe a) {
            return new AnnexeDto(a.getId(), a.getNom(), a.getFichier(), a.getTypeMime(),
                    a.getTaille(), a.getCategorie(), a.isObligatoire(), a.getUploadedBy(), a.getCreatedAt());
        }
    }

    public record HistoryDto(Long id, String username, String action, String ancienStatut,
                             String nouveauStatut, String commentaire, Instant createdAt) {
        public static HistoryDto from(DeclarationHistory h) {
            return new HistoryDto(h.getId(), h.getUsername(), h.getAction(),
                    h.getAncienStatut(), h.getNouveauStatut(), h.getCommentaire(), h.getCreatedAt());
        }
    }

    public record StatisticsDto(
            long total, long aDeclarer, long brouillons, long enAttente,
            long validees, long payees, long rejetees, long aCorriger, long enControle,
            BigDecimal montantDeclare, BigDecimal montantPaye, BigDecimal resteAPayer
    ) {
    }

    public record CalendarEntryDto(
            Long id, String reference, String nif, String taxpayerName,
            String taxTypeCode, String period, LocalDate dateEcheance,
            DeclarationStatus status
    ) {
        public static CalendarEntryDto from(Declaration d) {
            return new CalendarEntryDto(
                    d.getId(), d.getReference(),
                    d.getTaxpayer().getNif(), d.getTaxpayer().getName(),
                    d.getTaxType().getCode(), d.getPeriod(),
                    d.getDateEcheance() != null ? d.getDateEcheance() : d.getDueDate(),
                    d.getStatus()
            );
        }
    }
}
