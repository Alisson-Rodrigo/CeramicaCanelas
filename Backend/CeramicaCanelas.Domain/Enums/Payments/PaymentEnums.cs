namespace CeramicaCanelas.Domain.Enums.Payments;

public enum EmploymentType { Employee = 1, Contractor = 2 }
public enum Fortnight { First = 1, Second = 2 }
public enum PaymentCalculationStatus { Draft = 1, Calculated = 2, Paid = 3, Cancelled = 4 }
public enum VoucherStatus { Active = 1, PaidOff = 2, Paused = 3, Cancelled = 4 }
public enum VoucherPeriodicity { Monthly = 1, AlternateMonths = 2, EveryXMonths = 3, Single = 4, Custom = 5 }

public enum PaymentItemKind
{
    FortnightBase = 1,
    FirstFortnightPaid = 2,
    FullAbsence = 3,
    HalfAbsence = 4,
    PositiveHours = 5,
    NegativeHours = 6,
    NightHours = 7,
    Voucher = 8,
    Addition = 9,
    Deduction = 10,
    Bonus = 11,
    BonusAbsenceDeduction = 12
}
