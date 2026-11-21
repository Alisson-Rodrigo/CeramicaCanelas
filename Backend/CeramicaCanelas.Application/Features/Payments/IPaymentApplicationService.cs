using CeramicaCanelas.Domain.Enums.Payments;

namespace CeramicaCanelas.Application.Features.Payments;

public interface IPaymentApplicationService
{
    Task<IReadOnlyCollection<PaymentPersonDto>> GetPeopleAsync(CancellationToken cancellationToken);
    Task<PaymentPersonDto> CreatePersonAsync(CreatePaymentPersonRequest request, CancellationToken cancellationToken, string actor = "system");
    Task UpdateSalaryAsync(Guid personId, UpdateSalaryRequest request, CancellationToken cancellationToken, string actor = "system");
    Task UpdatePersonStatusAsync(Guid personId, bool isActive, CancellationToken cancellationToken, string actor = "system");
    Task<IReadOnlyCollection<PaymentRulesDto>> GetRulesAsync(CancellationToken cancellationToken);
    Task<PaymentRulesDto> CreateRulesAsync(PaymentRulesRequest request, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<VoucherDto>> GetVouchersAsync(Guid? personId, CancellationToken cancellationToken);
    Task<VoucherDto> CreateVoucherAsync(CreateVoucherRequest request, CancellationToken cancellationToken);
    Task UpdateVoucherStatusAsync(Guid voucherId, VoucherStatus status, CancellationToken cancellationToken);
    Task<PaymentPreviewDto> PreviewAsync(CalculatePaymentRequest request, CancellationToken cancellationToken);
    Task<PaymentHistoryDto> ConfirmAsync(CalculatePaymentRequest request, CancellationToken cancellationToken, string actor = "system");
    Task<IReadOnlyCollection<PaymentHistoryDto>> GetHistoryAsync(Guid? personId, int? year, int? month, Fortnight? fortnight, CancellationToken cancellationToken);
    Task<PaymentExportFileDto> ExportPaymentsAsync(Guid? personId, int? year, int? month, Fortnight? fortnight, CancellationToken cancellationToken);
    Task<PaymentExportFileDto> ExportBonusesAsync(Guid? personId, int? year, int? month, Fortnight? fortnight, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<AbsenceDto>> GetAbsencesAsync(Guid personId, int year, int month, CancellationToken ct);
    Task<AbsenceDto> SaveAbsenceAsync(Guid personId, Guid? id, AbsenceRequest request, string actor, CancellationToken ct);
    Task<List<CeramicaCanelas.Domain.Entities.Payments.PaymentAudit>> GetAuditAsync(Guid personId, CancellationToken ct);
    Task<List<CeramicaCanelas.Domain.Entities.Payments.PaymentDsrCharge>> GetDsrAsync(Guid personId, CancellationToken ct);
    Task<AccountantSummaryDto> GetAccountantSummaryAsync(Guid personId, int year, int month, CancellationToken ct);
    Task<CeramicaCanelas.Domain.Entities.Payments.PaymentPreparation> SavePreparationAsync(PreparationRequest request, string actor, CancellationToken ct);
    Task<CeramicaCanelas.Domain.Entities.Payments.PaymentPreparation?> GetPreparationAsync(Guid personId, int year, int month, Fortnight fortnight, CancellationToken ct);
    Task<CeramicaCanelas.Domain.Entities.Payments.PaymentAdjustment> CreateAdjustmentAsync(Guid calculationId, AdjustmentRequest request, string actor, CancellationToken ct);
    Task<List<CeramicaCanelas.Domain.Entities.Payments.PaymentAdjustment>> GetAdjustmentsAsync(Guid calculationId, CancellationToken ct);
    Task PayAdjustmentAsync(Guid calculationId, AdjustmentPaidRequest request, string actor, CancellationToken ct);
    Task<MonthlyPaymentSummaryDto> GetMonthlySummaryAsync(Guid personId, int year, int month, CancellationToken ct);
    Task DeletePersonAsync(Guid personId, DeletePaymentEntryRequest request, string actor, CancellationToken ct);
    Task DeleteAbsenceAsync(Guid personId, Guid absenceId, DeletePaymentEntryRequest request, string actor, CancellationToken ct);
    Task DeleteVoucherAsync(Guid voucherId, DeletePaymentEntryRequest request, string actor, CancellationToken ct);
    Task DeletePreparationAsync(Guid preparationId, DeletePaymentEntryRequest request, string actor, CancellationToken ct);
    Task DeleteCalculationAsync(Guid calculationId, DeletePaymentEntryRequest request, string actor, CancellationToken ct);
    Task<IReadOnlyCollection<EmployeeVoucherDto>> GetEmployeeVouchersAsync(Guid personId, int year, int month, Fortnight fortnight, CancellationToken ct);
    Task ReviewEmployeeAbsenceAsync(Guid personId, Guid absenceId, ReviewEmployeeAbsenceRequest request, string actor, CancellationToken ct);
    Task<EmployeeAccountantSubmissionDto> RegisterEmployeeAccountantSummaryAsync(Guid personId, RegisterEmployeeAccountantSummaryRequest request, string actor, CancellationToken ct);
    Task<IReadOnlyCollection<EmployeeAccountantSubmissionDto>> GetEmployeeAccountantSubmissionsAsync(Guid personId, int year, int month, CancellationToken ct);
    Task<PaymentExportFileDto> ExportEmployeePaymentsAsync(Guid? personId, int? year, int? month, Fortnight? fortnight, bool bonusesOnly, CancellationToken ct);
    Task<EmployeeHoursSummaryDto> GetEmployeeHoursSummaryAsync(Guid personId, int year, int month, CancellationToken ct);
    Task<EmployeeTimeEntryDto> SaveEmployeeTimeEntryAsync(Guid personId, Guid? id, EmployeeTimeEntryRequest request, string actor, CancellationToken ct);
    Task<IReadOnlyCollection<EmployeeVoucherSheetRow>> GetEmployeeVoucherSheetAsync(Guid? personId, int year, int month, CancellationToken ct);
    Task<PaymentExportFileDto> ExportEmployeeVoucherSheetAsync(Guid? personId, int year, int month, CancellationToken ct);
    Task<IReadOnlyCollection<EmployeeBonusReportDto>> GetEmployeeBonusReportAsync(Guid? personId, int year, int month, CancellationToken ct);
    Task<PaymentExportFileDto> ExportEmployeeBonusReportAsync(Guid? personId, int year, int month, CancellationToken ct);
    Task<PaymentExportFileDto> ExportEmployeeAccountantReportAsync(Guid? personId, int year, int month, CancellationToken ct);
    Task MarkPaidAsync(Guid calculationId, DateTime paidAt, CancellationToken cancellationToken, string actor = "system");
}
