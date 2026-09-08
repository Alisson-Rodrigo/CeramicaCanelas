using CeramicaCanelas.Domain.Enums.Payments;

namespace CeramicaCanelas.Application.Features.Payments;

public sealed record CreatePaymentPersonRequest(string Name, EmploymentType EmploymentType, decimal MonthlyValue, Guid? EmployeeId);
public sealed record UpdateSalaryRequest(decimal MonthlyValue);
public sealed record PaymentPersonDto(Guid Id, string Name, EmploymentType EmploymentType, bool IsActive, decimal MonthlyValue);

public sealed record PaymentRulesRequest(DateOnly EffectiveFrom, decimal EmployeeFirstFortnightPercent, decimal ContractorFirstFortnightPercent, decimal FullAbsenceValue, decimal HalfAbsenceValue, int? MonthlyWorkMinutes, decimal? PositiveHourMultiplier, decimal? NegativeHourMultiplier, decimal? NightHourMultiplier);
public sealed record PaymentRulesDto(Guid Id, DateOnly EffectiveFrom, decimal EmployeeFirstFortnightPercent, decimal ContractorFirstFortnightPercent, decimal FullAbsenceValue, decimal HalfAbsenceValue, int? MonthlyWorkMinutes, decimal? PositiveHourMultiplier, decimal? NegativeHourMultiplier, decimal? NightHourMultiplier);

public sealed record VoucherCompetenceRequest(int Year, int Month, bool Skip = false);
public sealed record CreateVoucherRequest(Guid PaymentPersonId, string Description, decimal? TotalValue, decimal InstallmentValue, DateOnly Date, int StartYear, int StartMonth, VoucherPeriodicity Periodicity, int IntervalMonths, int? InstallmentCount, IReadOnlyCollection<VoucherCompetenceRequest>? Competences);
public sealed record VoucherDto(Guid Id, Guid PaymentPersonId, string PersonName, string Description, decimal? TotalValue, decimal InstallmentValue, decimal? RemainingBalance, int StartYear, int StartMonth, VoucherPeriodicity Periodicity, int IntervalMonths, int? InstallmentCount, int AppliedInstallments, VoucherStatus Status);

public sealed record ManualPaymentEntryRequest(string Description, decimal Amount);
public sealed record CalculatePaymentRequest(Guid PaymentPersonId, int CompetenceYear, int CompetenceMonth, Fortnight Fortnight, decimal BonusValue, int FullAbsences, int HalfAbsences, int PositiveMinutes, int NegativeMinutes, int NightMinutes, IReadOnlyCollection<Guid>? ExcludedVoucherIds, IReadOnlyCollection<ManualPaymentEntryRequest>? Additions, IReadOnlyCollection<ManualPaymentEntryRequest>? Deductions);
public sealed record PaymentItemDto(PaymentItemKind Kind, string Description, decimal Amount, int? QuantityMinutes, decimal? Quantity, Guid? VoucherId);
public sealed record PaymentPreviewDto(Guid PaymentPersonId, string PersonName, EmploymentType EmploymentType, int CompetenceYear, int CompetenceMonth, Fortnight Fortnight, decimal BaseValue, decimal FortnightPercent, decimal FirstFortnightPaid, decimal GrossValue, decimal AdditionValue, decimal DeductionValue, decimal NetValue, IReadOnlyCollection<PaymentItemDto> Items);
public sealed record PaymentHistoryDto(Guid Id, Guid PaymentPersonId, string PersonName, EmploymentType EmploymentType, int CompetenceYear, int CompetenceMonth, Fortnight Fortnight, decimal BaseValue, decimal NetValue, decimal FirstFortnightValue, decimal SecondFortnightValue, decimal MonthlyTotalValue, PaymentCalculationStatus Status, DateTime CalculatedAt, DateTime? PaidAt, IReadOnlyCollection<PaymentItemDto> Items);
public sealed record PaymentExportFileDto(byte[] Content, string ContentType, string FileName);
