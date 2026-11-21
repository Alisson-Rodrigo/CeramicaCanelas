using CeramicaCanelas.Domain.Enums.Payments;

namespace CeramicaCanelas.Application.Features.Payments;

public sealed record CreatePaymentPersonRequest(string Name, EmploymentType EmploymentType, decimal MonthlyValue, decimal MonthlyBonus = 0m, DateOnly? AdmissionDate = null, bool ContractualDsrAuthorized = false);
public sealed record UpdateSalaryRequest(decimal MonthlyValue, decimal? MonthlyBonus = null, DateOnly? AdmissionDate = null, bool? ContractualDsrAuthorized = null);
public sealed record PaymentPersonDto(Guid Id, string Name, EmploymentType EmploymentType, bool IsActive, decimal MonthlyValue, decimal MonthlyBonus = 0m, DateOnly? AdmissionDate = null, bool ContractualDsrAuthorized = false);

public sealed record PaymentRulesRequest(DateOnly EffectiveFrom, decimal EmployeeFirstFortnightPercent, decimal ContractorFirstFortnightPercent, decimal FullAbsenceValue, decimal HalfAbsenceValue, int? MonthlyWorkMinutes, decimal? PositiveHourMultiplier, decimal? NegativeHourMultiplier, decimal? NightHourMultiplier, decimal? ContractorAbsenceDailyValue = null, decimal? ContractorDsrValue = null, bool HalfAbsenceGeneratesDsr = false);
public sealed record PaymentRulesDto(Guid Id, DateOnly EffectiveFrom, decimal EmployeeFirstFortnightPercent, decimal ContractorFirstFortnightPercent, decimal FullAbsenceValue, decimal HalfAbsenceValue, int? MonthlyWorkMinutes, decimal? PositiveHourMultiplier, decimal? NegativeHourMultiplier, decimal? NightHourMultiplier, decimal? ContractorAbsenceDailyValue = null, decimal? ContractorDsrValue = null, bool HalfAbsenceGeneratesDsr = false);

public sealed record VoucherCompetenceRequest(int Year, int Month, bool Skip = false);
public sealed record CreateVoucherRequest(Guid PaymentPersonId, string Description, decimal? TotalValue, decimal InstallmentValue, DateOnly Date, int StartYear, int StartMonth, VoucherPeriodicity Periodicity, int IntervalMonths, int? InstallmentCount, IReadOnlyCollection<VoucherCompetenceRequest>? Competences, bool AllowPartialDiscount = false);
public sealed record VoucherDto(Guid Id, Guid PaymentPersonId, string PersonName, string Description, decimal? TotalValue, decimal InstallmentValue, decimal? RemainingBalance, int StartYear, int StartMonth, VoucherPeriodicity Periodicity, int IntervalMonths, int? InstallmentCount, int AppliedInstallments, VoucherStatus Status);

public sealed record ManualPaymentEntryRequest(string Description, decimal Amount);
public sealed record CalculatePaymentRequest(Guid PaymentPersonId, int CompetenceYear, int CompetenceMonth, Fortnight Fortnight, decimal BonusValue, int FullAbsences, int HalfAbsences, int PositiveMinutes, int NegativeMinutes, int NightMinutes, IReadOnlyCollection<Guid>? ExcludedVoucherIds, IReadOnlyCollection<ManualPaymentEntryRequest>? Additions, IReadOnlyCollection<ManualPaymentEntryRequest>? Deductions, decimal? AccountantAmount = null, IReadOnlyCollection<EmployeeVoucherSelectionRequest>? VoucherSelections = null, string? AccountantReference = null, string? AccountantNotes = null, EmployeeAccountantAmountMode AccountantAmountMode = EmployeeAccountantAmountMode.SalaryBalance);
public sealed record PaymentItemDto(PaymentItemKind Kind, string Description, decimal Amount, int? QuantityMinutes, decimal? Quantity, Guid? VoucherId, Guid? AbsenceId = null, DateOnly? DsrWeekStart = null);
public sealed record PaymentPreviewDto(Guid PaymentPersonId, string PersonName, EmploymentType EmploymentType, int CompetenceYear, int CompetenceMonth, Fortnight Fortnight, decimal BaseValue, decimal FortnightPercent, decimal FirstFortnightPaid, decimal GrossValue, decimal AdditionValue, decimal DeductionValue, decimal NetValue, IReadOnlyCollection<PaymentItemDto> Items)
{
    [System.Text.Json.Serialization.JsonIgnore(Condition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull)]
    public EmployeeSettlementDto? EmployeeSettlement { get; init; }
    public decimal InstallmentBase => Items.Where(x => x.Kind == PaymentItemKind.FortnightBase).Sum(x => x.Amount);
    public decimal OriginalBonus => Items.Where(x => x.Kind == PaymentItemKind.Bonus).Sum(x => x.Amount);
    public decimal BonusDeduction => Items.Where(x => x.Kind == PaymentItemKind.BonusAbsenceDeduction).Sum(x => x.Amount);
    public decimal FinalBonus => Math.Max(0m, OriginalBonus - BonusDeduction);
    public decimal AbsenceDeduction => Items.Where(x => x.Kind is PaymentItemKind.FullAbsence or PaymentItemKind.HalfAbsence).Sum(x => x.Amount);
    public int DsrWeeks => Items.Count(x => x.Kind == PaymentItemKind.Dsr);
    public decimal DsrDeduction => Items.Where(x => x.Kind == PaymentItemKind.Dsr).Sum(x => x.Amount);
}
public sealed record PaymentHistoryDto(Guid Id, Guid PaymentPersonId, string PersonName, EmploymentType EmploymentType, int CompetenceYear, int CompetenceMonth, Fortnight Fortnight, decimal BaseValue, decimal NetValue, decimal FirstFortnightValue, decimal SecondFortnightValue, decimal MonthlyTotalValue, PaymentCalculationStatus Status, DateTime CalculatedAt, DateTime? PaidAt, IReadOnlyCollection<PaymentItemDto> Items)
{
    [System.Text.Json.Serialization.JsonIgnore(Condition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull)]
    public EmployeeSettlementDto? EmployeeSettlement { get; init; }
}
public sealed record PaymentExportFileDto(byte[] Content, string ContentType, string FileName);
