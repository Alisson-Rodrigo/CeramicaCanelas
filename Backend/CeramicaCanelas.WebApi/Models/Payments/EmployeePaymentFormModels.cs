using CeramicaCanelas.Application.Features.Payments;
using CeramicaCanelas.Domain.Enums.Payments;
using CeramicaCanelas.WebApi.ModelBinders;
using Microsoft.AspNetCore.Mvc;

namespace CeramicaCanelas.WebApi.Models.Payments;

// The employee module never asks the frontend to choose an employment category.
public sealed class CreateEmployeePaymentPersonForm
{
    public string Name { get; set; } = string.Empty;
    [ModelBinder(BinderType = typeof(FlexibleDecimalModelBinder))] public decimal MonthlyValue { get; set; }
    [ModelBinder(BinderType = typeof(FlexibleDecimalModelBinder))] public decimal MonthlyBonus { get; set; }
    public DateOnly? AdmissionDate { get; set; }
    public CreatePaymentPersonRequest ToRequest() => new(Name, EmploymentType.Employee, MonthlyValue, MonthlyBonus, AdmissionDate);
}

public sealed class UpdateEmployeePaymentSalaryForm
{
    [ModelBinder(BinderType = typeof(FlexibleDecimalModelBinder))] public decimal MonthlyValue { get; set; }
    [ModelBinder(BinderType = typeof(FlexibleDecimalModelBinder))] public decimal? MonthlyBonus { get; set; }
    public DateOnly? AdmissionDate { get; set; }
    public UpdateSalaryRequest ToRequest() => new(MonthlyValue, MonthlyBonus, AdmissionDate);
}

public sealed class EmployeeVoucherForm
{
    public string Description { get; set; } = string.Empty;
    [ModelBinder(BinderType = typeof(FlexibleDecimalModelBinder))] public decimal Value { get; set; }
    public DateOnly Date { get; set; }
    public int ReferenceYear { get; set; }
    public int ReferenceMonth { get; set; }
    public CreateVoucherRequest ToRequest(Guid personId) => new(personId, Description, Value, Value, Date,
        ReferenceYear, ReferenceMonth, VoucherPeriodicity.Single, 1, null, null, true);
}

public sealed class EmployeeCalculationForm
{
    public Guid PaymentPersonId { get; set; }
    public int CompetenceYear { get; set; }
    public int CompetenceMonth { get; set; }
    public Fortnight Fortnight { get; set; }
    public string? VoucherSelectionsJson { get; set; }
    public string? AdditionsJson { get; set; }
    public string? DeductionsJson { get; set; }
    [ModelBinder(BinderType = typeof(FlexibleDecimalModelBinder))] public decimal? AccountantAmount { get; set; }
    public string? AccountantReference { get; set; }
    public string? AccountantNotes { get; set; }
    public CalculatePaymentRequest ToRequest() => new(PaymentPersonId, CompetenceYear, CompetenceMonth, Fortnight,
        0, 0, 0, 0, 0, 0, null,
        PaymentFormJson.DeserializeCollection<ManualPaymentEntryRequest>(AdditionsJson, nameof(AdditionsJson)),
        PaymentFormJson.DeserializeCollection<ManualPaymentEntryRequest>(DeductionsJson, nameof(DeductionsJson)),
        AccountantAmount, PaymentFormJson.DeserializeCollection<EmployeeVoucherSelectionRequest>(VoucherSelectionsJson, nameof(VoucherSelectionsJson)),
        AccountantReference, AccountantNotes);
}
