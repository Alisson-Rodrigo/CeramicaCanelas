using CeramicaCanelas.Domain.Enums.Payments;

namespace CeramicaCanelas.Application.Features.Payments;

public interface IPaymentApplicationService
{
    Task<IReadOnlyCollection<PaymentPersonDto>> GetPeopleAsync(CancellationToken cancellationToken);
    Task<PaymentPersonDto> CreatePersonAsync(CreatePaymentPersonRequest request, CancellationToken cancellationToken);
    Task UpdateSalaryAsync(Guid personId, UpdateSalaryRequest request, CancellationToken cancellationToken);
    Task UpdatePersonStatusAsync(Guid personId, bool isActive, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<PaymentRulesDto>> GetRulesAsync(CancellationToken cancellationToken);
    Task<PaymentRulesDto> CreateRulesAsync(PaymentRulesRequest request, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<VoucherDto>> GetVouchersAsync(Guid? personId, CancellationToken cancellationToken);
    Task<VoucherDto> CreateVoucherAsync(CreateVoucherRequest request, CancellationToken cancellationToken);
    Task UpdateVoucherStatusAsync(Guid voucherId, VoucherStatus status, CancellationToken cancellationToken);
    Task<PaymentPreviewDto> PreviewAsync(CalculatePaymentRequest request, CancellationToken cancellationToken);
    Task<PaymentHistoryDto> ConfirmAsync(CalculatePaymentRequest request, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<PaymentHistoryDto>> GetHistoryAsync(Guid? personId, int? year, int? month, Fortnight? fortnight, CancellationToken cancellationToken);
    Task<PaymentExportFileDto> ExportPaymentsAsync(Guid? personId, int? year, int? month, Fortnight? fortnight, CancellationToken cancellationToken);
    Task<PaymentExportFileDto> ExportBonusesAsync(Guid? personId, int? year, int? month, Fortnight? fortnight, CancellationToken cancellationToken);
    Task MarkPaidAsync(Guid calculationId, DateTime paidAt, CancellationToken cancellationToken);
}
