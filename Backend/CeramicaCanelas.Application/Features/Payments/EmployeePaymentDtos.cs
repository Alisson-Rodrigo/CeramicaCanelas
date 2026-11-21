using CeramicaCanelas.Domain.Enums.Payments;
namespace CeramicaCanelas.Application.Features.Payments;

// Retained only for old shared API clients. New employee payments have one meaning: accountant amount minus selected internal vouchers.
public enum EmployeeAccountantAmountMode { SalaryBalance = 1, FinalNet = 2 }
public sealed record EmployeeVoucherSelectionRequest(Guid VoucherId, decimal Amount);
public sealed record EmployeeSettlementDto(decimal? AccountantProvidedAmount, decimal InternalVoucherDeduction,
    decimal NetPayable, decimal? FirstFortnightAccountantAmount, decimal FirstFortnightNet,
    DateTime? FirstFortnightPaidAt, string? AccountantReference, string? AccountantNotes, bool IsLegacyCalculation);
public sealed record EmployeeAbsenceReviewDto(bool IsReviewed, DateTime? ReviewedAt, string? ReviewedBy);
public sealed record ReviewEmployeeAbsenceRequest(bool IsReviewed, int Revision, string? Notes = null);
public sealed record EmployeeVoucherDiscountDto(Guid CalculationId, int Year, int Month, Fortnight Fortnight,
    decimal Amount, PaymentCalculationStatus Status, DateTime CalculatedAt, DateTime? PaidAt);
public sealed record EmployeeVoucherDto(Guid Id, Guid PaymentPersonId, string Description, DateOnly Date,
    int ReferenceYear, int ReferenceMonth, decimal? TotalValue, decimal? DeductedValue, decimal? PendingBalance,
    bool AllowPartialDiscount, bool AvailableForDiscount, VoucherStatus Status,
    IReadOnlyCollection<EmployeeVoucherDiscountDto> Discounts);
public sealed record RegisterEmployeeAccountantSummaryRequest(int Year, int Month, string Reference, string? Notes = null);
public sealed record EmployeeAccountantSubmissionDto(Guid Id, Guid PaymentPersonId, int Year, int Month,
    string Reference, DateTime RecordedAt, string RecordedBy, AccountantSummaryDto Summary);
public sealed record EmployeeBonusRuleDto(Guid Id, DateOnly EffectiveFrom, decimal FullAbsenceValue, decimal HalfAbsenceValue);
public sealed record AccountantEmployeeDto(Guid Id, string Name);
public sealed record EmployeeTimeEntryRequest(DateOnly Date, int PositiveMinutes, int NegativeMinutes,
    string Notes, bool IsCancelled = false, int Revision = 0, bool CorrectClosedPeriod = false);
public sealed record EmployeeTimeEntryDto(Guid Id, DateOnly Date, int PositiveMinutes, int NegativeMinutes,
    string Notes, bool IsCancelled, int Revision, string RecordedBy);
public sealed record EmployeeHoursSummaryDto(long PositiveMinutes, long NegativeMinutes, long BalanceMinutes, IReadOnlyCollection<EmployeeTimeEntryDto> Occurrences);
public sealed record AccountantAbsenceOccurrenceDto(DateOnly Date, bool IsHalf);
public sealed record AccountantHoursDto(long PositiveMinutes, long NegativeMinutes, long BalanceMinutes)
{
    public string PositiveHours => EmployeeTimeFormatting.Format(PositiveMinutes);
    public string NegativeHours => EmployeeTimeFormatting.Format(-NegativeMinutes);
    public string BalanceHours => EmployeeTimeFormatting.Format(BalanceMinutes);
}
public static class EmployeeTimeFormatting
{
    public static string Format(long minutes) => $"{(minutes < 0 ? "-" : "+")}{Math.Abs(minutes) / 60:00}:{Math.Abs(minutes) % 60:00}";
}
public sealed record EmployeeBonusReportDto(Guid? SettlementId, Guid PaymentPersonId, string PersonName, int Year, int Month,
    decimal OriginalBonus, int? FullAbsences, int? HalfAbsences, decimal? FullAbsenceDeduction,
    decimal? HalfAbsenceDeduction, decimal AbsenceDeduction, decimal AppliedDeduction, decimal FinalBonus,
    bool IsClosed, bool IsCancelled, bool IncludedInLegacyPayroll);
public sealed record EmployeeVoucherSheetRow(Guid VoucherId, Guid PaymentPersonId, string PersonName, DateOnly VoucherDate,
    decimal? OriginalValue, decimal FirstFortnightDiscount, decimal SecondFortnightDiscount,
    decimal DiscountedInCompetence, decimal? TotalDiscounted, decimal? PendingBalance,
    int Year, int Month, decimal PaidDiscountsInCompetence, decimal ReservedDiscountsInCompetence);