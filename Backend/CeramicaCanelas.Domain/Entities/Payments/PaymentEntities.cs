using CeramicaCanelas.Domain.Abstract;
using CeramicaCanelas.Domain.Enums.Payments;

namespace CeramicaCanelas.Domain.Entities.Payments;

public sealed class PaymentPerson : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public EmploymentType EmploymentType { get; set; }
    public bool IsActive { get; set; } = true;
    public decimal MonthlyValue { get; set; }
    public Guid? EmployeeId { get; set; }
    public Employee? Employee { get; set; }
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
    public int AppliedInstallments { get; set; }
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
}
