using CeramicaCanelas.Domain.Abstract;
using CeramicaCanelas.Domain.Enums.Payments;

namespace CeramicaCanelas.Domain.Entities.Payments;

public sealed class PaymentPerson : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public EmploymentType EmploymentType { get; set; }
    public bool IsActive { get; set; } = true;
    public bool IsDeleted { get; set; }
    public decimal MonthlyValue { get; set; }
    public decimal MonthlyBonus { get; set; }
    public bool ContractualDsrAuthorized { get; set; }
    public DateOnly? AdmissionDate { get; set; }
    public int Revision { get; set; }
    public ICollection<Voucher> Vouchers { get; set; } = new List<Voucher>();
    public ICollection<PaymentCalculation> Calculations { get; set; } = new List<PaymentCalculation>();
}

public sealed class PaymentRuleConfiguration : BaseEntity
{
    public DateOnly EffectiveFrom { get; set; }
    public decimal EmployeeFirstFortnightPercent { get; set; }
    public decimal ContractorFirstFortnightPercent { get; set; }
    public decimal FullAbsenceValue { get; set; } = 100m;
    public decimal HalfAbsenceValue { get; set; } = 50m;
    public decimal? ContractorAbsenceDailyValue { get; set; }
    public decimal? ContractorDsrValue { get; set; }
    public bool HalfAbsenceGeneratesDsr { get; set; }
    public int? MonthlyWorkMinutes { get; set; }
    public decimal? PositiveHourMultiplier { get; set; }
    public decimal? NegativeHourMultiplier { get; set; }
    public decimal? NightHourMultiplier { get; set; }
}

public sealed class Voucher : BaseEntity
{
    public Guid PaymentPersonId { get; set; }
    public PaymentPerson PaymentPerson { get; set; } = null!;
    public string Description { get; set; } = string.Empty;
    public decimal? TotalValue { get; set; }
    public decimal InstallmentValue { get; set; }
    public decimal? RemainingBalance { get; set; }
    public DateOnly Date { get; set; }
    public int StartYear { get; set; }
    public int StartMonth { get; set; }
    public VoucherPeriodicity Periodicity { get; set; }
    public int IntervalMonths { get; set; } = 1;
    public int? InstallmentCount { get; set; }
    public bool AllowPartialDiscount { get; set; }
    public int AppliedInstallments { get; set; }
    public int Revision { get; set; }
    public VoucherStatus Status { get; set; } = VoucherStatus.Active;
    public ICollection<VoucherCompetence> Competences { get; set; } = new List<VoucherCompetence>();
}

public sealed class VoucherCompetence : BaseEntity
{
    public Guid VoucherId { get; set; }
    public Voucher Voucher { get; set; } = null!;
    public int Year { get; set; }
    public int Month { get; set; }
    public bool Skip { get; set; }
}

public sealed class PaymentCalculation : BaseEntity
{
    public Guid PaymentPersonId { get; set; }
    public PaymentPerson PaymentPerson { get; set; } = null!;
    public Guid PaymentRuleConfigurationId { get; set; }
    public PaymentRuleConfiguration PaymentRuleConfiguration { get; set; } = null!;
    public string PersonName { get; set; } = string.Empty;
    public EmploymentType EmploymentType { get; set; }
    public int CompetenceYear { get; set; }
    public int CompetenceMonth { get; set; }
    public Fortnight Fortnight { get; set; }
    public decimal BaseValue { get; set; }
    public decimal FortnightPercent { get; set; }
    public decimal FirstFortnightPaid { get; set; }
    public decimal GrossValue { get; set; }
    public decimal AdditionValue { get; set; }
    public decimal DeductionValue { get; set; }
    public decimal NetValue { get; set; }
    public decimal FirstFortnightValue { get; set; }
    public decimal SecondFortnightValue { get; set; }
    public decimal MonthlyTotalValue { get; set; }
    public PaymentCalculationStatus Status { get; set; } = PaymentCalculationStatus.Calculated;
    public DateTime CalculatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? PaidAt { get; set; }
    public int? EmployeePaymentFlowVersion { get; set; }
    public decimal? EmployeeSystemSalaryValue { get; set; }
    public decimal? EmployeeSystemNetValue { get; set; }
    public decimal? EmployeeAccountantAmount { get; set; }
    public string? EmployeeAccountantReference { get; set; }
    public string? EmployeeAccountantNotes { get; set; }
    public int? EmployeeAccountantAmountMode { get; set; }
    public decimal? EmployeeFirstGrossValue { get; set; }
    public DateTime? EmployeeFirstPaidAt { get; set; }
    public int Revision { get; set; }
    public ICollection<PaymentCalculationItem> Items { get; set; } = new List<PaymentCalculationItem>();
}

public sealed class PaymentCalculationItem : BaseEntity
{
    public Guid PaymentCalculationId { get; set; }
    public PaymentCalculation PaymentCalculation { get; set; } = null!;
    public PaymentItemKind Kind { get; set; }
    public string Description { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public int? QuantityMinutes { get; set; }
    public decimal? Quantity { get; set; }
    public Guid? VoucherId { get; set; }
    public Guid? AbsenceId { get; set; }
    public DateOnly? DsrWeekStart { get; set; }
}

public sealed class PaymentAbsence : BaseEntity
{
    public Guid PaymentPersonId { get; set; }
    public EmploymentType EmploymentType { get; set; }
    public DateOnly Date { get; set; }
    public bool IsHalf { get; set; }
    public bool IsCancelled { get; set; }
    public string Observation { get; set; } = string.Empty;
    public string RecordedBy { get; set; } = string.Empty;
    public bool IsReviewed { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public string? ReviewedBy { get; set; }
    public int Revision { get; set; }
}

public sealed class PaymentAudit : BaseEntity
{
    public Guid PaymentPersonId { get; set; }
    public Guid? SubjectId { get; set; }
    public string Action { get; set; } = string.Empty;
    public string Before { get; set; } = string.Empty;
    public string After { get; set; } = string.Empty;
    public string Reason { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
}

public sealed class PaymentDsrCharge : BaseEntity
{
    public Guid PaymentPersonId { get; set; }
    public Guid PaymentCalculationId { get; set; }
    public DateOnly WeekStart { get; set; }
    public bool IsCancelled { get; set; }
    public decimal Amount { get; set; }
    public string AbsenceIds { get; set; } = string.Empty;
}

public sealed class PaymentPreparation : BaseEntity
{
    public Guid PaymentPersonId { get; set; }
    public int Year { get; set; }
    public int Month { get; set; }
    public Fortnight Fortnight { get; set; }
    public PaymentCalculationStatus Status { get; set; } = PaymentCalculationStatus.Draft;
    public string RequestJson { get; set; } = string.Empty;
    public int Revision { get; set; }
}

public sealed class PaymentAdjustment : BaseEntity
{
    public Guid PaymentCalculationId { get; set; }
    public string Reference { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string Reason { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public DateTime? PaidAt { get; set; }
    public int Revision { get; set; }
}

public sealed class EmployeeAccountantSubmission : BaseEntity
{
    public Guid PaymentPersonId { get; set; }
    public int Year { get; set; }
    public int Month { get; set; }
    public string Reference { get; set; } = string.Empty;
    public string SummaryJson { get; set; } = string.Empty;
    public string RecordedBy { get; set; } = string.Empty;
}
public sealed class EmployeeTimeEntry : BaseEntity
{
    public Guid PaymentPersonId { get; set; }
    public DateOnly Date { get; set; }
    public int PositiveMinutes { get; set; }
    public int NegativeMinutes { get; set; }
    public string Notes { get; set; } = string.Empty;
    public bool IsCancelled { get; set; }
    public string RecordedBy { get; set; } = string.Empty;
    public int Revision { get; set; }
}

public sealed class EmployeeBonusSettlement : BaseEntity
{
    public Guid PaymentPersonId { get; set; }
    public Guid PaymentCalculationId { get; set; }
    public string PersonName { get; set; } = string.Empty;
    public int Year { get; set; }
    public int Month { get; set; }
    public string SourceAbsenceIds { get; set; } = string.Empty;
    public decimal OriginalValue { get; set; }
    public int FullAbsences { get; set; }
    public int HalfAbsences { get; set; }
    public decimal FullAbsenceDeduction { get; set; }
    public decimal HalfAbsenceDeduction { get; set; }
    public decimal DeductionValue { get; set; }
    public decimal NetValue { get; set; }
    public bool IsCancelled { get; set; }
    public int Revision { get; set; }
}