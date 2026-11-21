using System.Text.Json;
using CeramicaCanelas.Application.Features.Payments;
using CeramicaCanelas.Domain.Enums.Payments;
using CeramicaCanelas.WebApi.ModelBinders;
using Microsoft.AspNetCore.Mvc;

namespace CeramicaCanelas.WebApi.Models.Payments;

public sealed class CreatePaymentPersonForm
{
    public string Name { get; set; } = string.Empty; public EmploymentType EmploymentType { get; set; }
    [ModelBinder(BinderType = typeof(FlexibleDecimalModelBinder))] public decimal MonthlyValue { get; set; }
    [ModelBinder(BinderType = typeof(FlexibleDecimalModelBinder))] public decimal MonthlyBonus { get; set; }
    public DateOnly? AdmissionDate { get; set; }
    public bool ContractualDsrAuthorized { get; set; }
    public CreatePaymentPersonRequest ToRequest() => new(Name, EmploymentType, MonthlyValue, MonthlyBonus, AdmissionDate, ContractualDsrAuthorized);
}
public sealed class UpdateSalaryForm
{
    [ModelBinder(BinderType = typeof(FlexibleDecimalModelBinder))] public decimal MonthlyValue { get; set; }
    [ModelBinder(BinderType = typeof(FlexibleDecimalModelBinder))] public decimal? MonthlyBonus { get; set; }
    public DateOnly? AdmissionDate { get; set; }
    public bool? ContractualDsrAuthorized { get; set; }
    public UpdateSalaryRequest ToRequest() => new(MonthlyValue, MonthlyBonus, AdmissionDate, ContractualDsrAuthorized);
}
public sealed class UpdatePaymentPersonStatusForm { public bool IsActive { get; set; } }

public sealed class PaymentRulesForm
{
    public DateOnly EffectiveFrom { get; set; }
    [ModelBinder(BinderType = typeof(FlexibleDecimalModelBinder))] public decimal EmployeeFirstFortnightPercent { get; set; }
    [ModelBinder(BinderType = typeof(FlexibleDecimalModelBinder))] public decimal ContractorFirstFortnightPercent { get; set; }
    [ModelBinder(BinderType = typeof(FlexibleDecimalModelBinder))] public decimal FullAbsenceValue { get; set; } = 100m;
    [ModelBinder(BinderType = typeof(FlexibleDecimalModelBinder))] public decimal HalfAbsenceValue { get; set; } = 50m;
    public int? MonthlyWorkMinutes { get; set; }
    [ModelBinder(BinderType = typeof(FlexibleDecimalModelBinder))] public decimal? PositiveHourMultiplier { get; set; }
    [ModelBinder(BinderType = typeof(FlexibleDecimalModelBinder))] public decimal? NegativeHourMultiplier { get; set; }
    [ModelBinder(BinderType = typeof(FlexibleDecimalModelBinder))] public decimal? NightHourMultiplier { get; set; }
    [ModelBinder(BinderType = typeof(FlexibleDecimalModelBinder))] public decimal? ContractorAbsenceDailyValue { get; set; }
    [ModelBinder(BinderType = typeof(FlexibleDecimalModelBinder))] public decimal? ContractorDsrValue { get; set; }
    public bool HalfAbsenceGeneratesDsr { get; set; }
    public PaymentRulesRequest ToRequest() => new(EffectiveFrom, EmployeeFirstFortnightPercent, ContractorFirstFortnightPercent, FullAbsenceValue, HalfAbsenceValue, MonthlyWorkMinutes, PositiveHourMultiplier, NegativeHourMultiplier, NightHourMultiplier, ContractorAbsenceDailyValue, ContractorDsrValue, HalfAbsenceGeneratesDsr);
}

public sealed class CreateVoucherForm
{
    public Guid PaymentPersonId { get; set; }
    public string Description { get; set; } = string.Empty;
    [ModelBinder(BinderType = typeof(FlexibleDecimalModelBinder))] public decimal? TotalValue { get; set; }
    [ModelBinder(BinderType = typeof(FlexibleDecimalModelBinder))] public decimal InstallmentValue { get; set; }
    public DateOnly Date { get; set; }
    public int StartYear { get; set; }
    public int StartMonth { get; set; }
    public VoucherPeriodicity Periodicity { get; set; }
    public int IntervalMonths { get; set; } = 1; public int? InstallmentCount { get; set; }
    public string? CompetencesJson { get; set; }
    public bool AllowPartialDiscount { get; set; }
    public CreateVoucherRequest ToRequest() => new(PaymentPersonId, Description, TotalValue, InstallmentValue, Date, StartYear, StartMonth, Periodicity, IntervalMonths, InstallmentCount, PaymentFormJson.DeserializeCollection<VoucherCompetenceRequest>(CompetencesJson, nameof(CompetencesJson)), AllowPartialDiscount);
}
public sealed class UpdateVoucherStatusForm { public VoucherStatus Status { get; set; } }

public sealed class CalculatePaymentForm
{
    public Guid PaymentPersonId { get; set; }
    public int CompetenceYear { get; set; }
    public int CompetenceMonth { get; set; }
    public Fortnight Fortnight { get; set; }
    [ModelBinder(BinderType = typeof(FlexibleDecimalModelBinder))] public decimal BonusValue { get; set; }
    public int FullAbsences { get; set; }
    public int HalfAbsences { get; set; }
    public int PositiveMinutes { get; set; }
    public int NegativeMinutes { get; set; }
    public int NightMinutes { get; set; }
    public string? ExcludedVoucherIdsJson { get; set; }
    public string? AdditionsJson { get; set; }
    public string? DeductionsJson { get; set; }
    [ModelBinder(BinderType = typeof(FlexibleDecimalModelBinder))] public decimal? AccountantAmount { get; set; }
    public string? VoucherSelectionsJson { get; set; }
    public string? AccountantReference { get; set; }
    public string? AccountantNotes { get; set; }
    public EmployeeAccountantAmountMode AccountantAmountMode { get; set; } = EmployeeAccountantAmountMode.SalaryBalance;
    public CalculatePaymentRequest ToRequest() => new(PaymentPersonId, CompetenceYear, CompetenceMonth, Fortnight, BonusValue, FullAbsences, HalfAbsences, PositiveMinutes, NegativeMinutes, NightMinutes, PaymentFormJson.DeserializeCollection<Guid>(ExcludedVoucherIdsJson, nameof(ExcludedVoucherIdsJson)), PaymentFormJson.DeserializeCollection<ManualPaymentEntryRequest>(AdditionsJson, nameof(AdditionsJson)), PaymentFormJson.DeserializeCollection<ManualPaymentEntryRequest>(DeductionsJson, nameof(DeductionsJson)), AccountantAmount, PaymentFormJson.DeserializeCollection<EmployeeVoucherSelectionRequest>(VoucherSelectionsJson, nameof(VoucherSelectionsJson)), AccountantReference, AccountantNotes, AccountantAmountMode);
}
public sealed class MarkPaymentPaidForm { public DateTime PaidAt { get; set; } }

internal static class PaymentFormJson
{
    private static readonly JsonSerializerOptions Options = new() { PropertyNameCaseInsensitive = true };
    public static IReadOnlyCollection<T>? DeserializeCollection<T>(string? json, string fieldName)
    {
        if (string.IsNullOrWhiteSpace(json)) return null;
        try { return JsonSerializer.Deserialize<List<T>>(json, Options) ?? throw new InvalidOperationException($"O campo {fieldName} deve conter uma lista JSON."); }
        catch (JsonException) { throw new InvalidOperationException($"O campo {fieldName} contem um JSON invalido."); }
    }
}
