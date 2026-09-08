using CeramicaCanelas.Domain.Enums.Payments;

namespace CeramicaCanelas.Domain.Services.Payments;

public sealed record PaymentRules(decimal EmployeeFirstFortnightPercent, decimal ContractorFirstFortnightPercent, decimal FullAbsenceValue, decimal HalfAbsenceValue, int? MonthlyWorkMinutes, decimal? PositiveHourMultiplier, decimal? NegativeHourMultiplier, decimal? NightHourMultiplier);
public sealed record PaymentEntry(string Description, decimal Amount, Guid? VoucherId = null);
public sealed record PaymentCalculationInput(EmploymentType EmploymentType, Fortnight Fortnight, decimal MonthlyValue, decimal BonusValue, decimal FirstFortnightPaid, int FullAbsences, int HalfAbsences, int PositiveMinutes, int NegativeMinutes, int NightMinutes, IReadOnlyCollection<PaymentEntry> Vouchers, IReadOnlyCollection<PaymentEntry> Additions, IReadOnlyCollection<PaymentEntry> Deductions);
public sealed record CalculatedPaymentItem(PaymentItemKind Kind, string Description, decimal Amount, int? QuantityMinutes = null, decimal? Quantity = null, Guid? VoucherId = null);
public sealed record PaymentCalculationResult(decimal FortnightPercent, decimal GrossValue, decimal AdditionValue, decimal DeductionValue, decimal NetValue, IReadOnlyCollection<CalculatedPaymentItem> Items);

public static class PaymentCalculator
{
    public static PaymentCalculationResult Calculate(PaymentCalculationInput input, PaymentRules rules)
    {
        Validate(input, rules);
        var firstPercent = input.EmploymentType == EmploymentType.Employee ? rules.EmployeeFirstFortnightPercent : rules.ContractorFirstFortnightPercent;
        var fortnightPercent = input.Fortnight == Fortnight.First ? firstPercent : 100m - firstPercent;

        if (input.EmploymentType == EmploymentType.Employee && input.Fortnight == Fortnight.First)
        {
            var firstValue = Round(input.MonthlyValue * firstPercent / 100m);
            return new(firstPercent, firstValue, 0m, 0m, firstValue, [new(PaymentItemKind.FortnightBase, "Primeira quinzena", firstValue)]);
        }

        var baseValue = input.EmploymentType == EmploymentType.Employee && input.Fortnight == Fortnight.Second
            ? Round(input.MonthlyValue - input.FirstFortnightPaid)
            : Round(input.MonthlyValue * fortnightPercent / 100m);
        var items = new List<CalculatedPaymentItem> { new(PaymentItemKind.FortnightBase, "Valor-base da quinzena", baseValue) };
        if (input.EmploymentType == EmploymentType.Employee && input.Fortnight == Fortnight.Second)
            items.Add(new(PaymentItemKind.FirstFortnightPaid, "Valor pago na primeira quinzena", input.FirstFortnightPaid));

        var gross = baseValue;
        if (input.Fortnight == Fortnight.Second && input.BonusValue > 0m)
        {
            var bonus = Round(input.BonusValue);
            gross += bonus;
            items.Add(new(PaymentItemKind.Bonus, "Bonificacao", bonus));
        }

        decimal additions = 0m;
        decimal deductions = 0m;
        var fullAbsences = input.FullAbsences + input.HalfAbsences / 2;
        var halfAbsences = input.HalfAbsences % 2;
        var absenceHourValue = input.MonthlyValue / 30m / 8m;
        if (fullAbsences > 0)
        {
            var amount = Round(fullAbsences * absenceHourValue * 8m);
            deductions += amount;
            items.Add(new(PaymentItemKind.FullAbsence, "Desconto salarial - falta inteira", amount, Quantity: fullAbsences));
        }
        if (halfAbsences > 0)
        {
            var amount = Round(halfAbsences * absenceHourValue * 4m);
            deductions += amount;
            items.Add(new(PaymentItemKind.HalfAbsence, "Desconto salarial - meia falta", amount, Quantity: halfAbsences));
        }

        if (input.Fortnight == Fortnight.Second && input.BonusValue > 0m)
        {
            var remainingBonus = Round(input.BonusValue);
            if (fullAbsences > 0)
            {
                var amount = Math.Min(remainingBonus, Round(fullAbsences * rules.FullAbsenceValue));
                if (amount > 0m)
                {
                    deductions += amount;
                    remainingBonus -= amount;
                    items.Add(new(PaymentItemKind.BonusAbsenceDeduction, "Desconto da bonificacao - falta inteira", amount, Quantity: fullAbsences));
                }
            }
            if (halfAbsences > 0 && remainingBonus > 0m)
            {
                var amount = Math.Min(remainingBonus, Round(halfAbsences * rules.HalfAbsenceValue));
                deductions += amount;
                items.Add(new(PaymentItemKind.BonusAbsenceDeduction, "Desconto da bonificacao - meia falta", amount, Quantity: halfAbsences));
            }
        }
        if (input.PositiveMinutes > 0)
        {
            var amount = CalculateMinutes(input.MonthlyValue, input.PositiveMinutes, rules.MonthlyWorkMinutes!.Value, rules.PositiveHourMultiplier!.Value);
            additions += amount;
            items.Add(new(PaymentItemKind.PositiveHours, "Horas positivas", amount, input.PositiveMinutes));
        }
        if (input.NegativeMinutes > 0)
        {
            var amount = CalculateMinutes(input.MonthlyValue, input.NegativeMinutes, rules.MonthlyWorkMinutes!.Value, rules.NegativeHourMultiplier!.Value);
            deductions += amount;
            items.Add(new(PaymentItemKind.NegativeHours, "Horas negativas", amount, input.NegativeMinutes));
        }
        if (input.NightMinutes > 0)
        {
            var amount = CalculateMinutes(input.MonthlyValue, input.NightMinutes, rules.MonthlyWorkMinutes!.Value, rules.NightHourMultiplier!.Value);
            additions += amount;
            items.Add(new(PaymentItemKind.NightHours, "Horas noturnas", amount, input.NightMinutes));
        }
        foreach (var entry in input.Vouchers)
        {
            var amount = Round(entry.Amount);
            deductions += amount;
            items.Add(new(PaymentItemKind.Voucher, entry.Description, amount, VoucherId: entry.VoucherId));
        }
        foreach (var entry in input.Additions)
        {
            var amount = Round(entry.Amount);
            additions += amount;
            items.Add(new(PaymentItemKind.Addition, entry.Description, amount));
        }
        foreach (var entry in input.Deductions)
        {
            var amount = Round(entry.Amount);
            deductions += amount;
            items.Add(new(PaymentItemKind.Deduction, entry.Description, amount));
        }

        gross = Round(gross);
        additions = Round(additions);
        deductions = Round(deductions);
        return new(fortnightPercent, gross, additions, deductions, Round(gross + additions - deductions), items);
    }

    private static void Validate(PaymentCalculationInput input, PaymentRules rules)
    {
        if (input.MonthlyValue <= 0m) throw new InvalidOperationException("O valor mensal deve ser maior que zero.");
        if (input.BonusValue < 0m) throw new InvalidOperationException("A bonificacao nao pode ser negativa.");
        if (input.FullAbsences < 0 || input.HalfAbsences < 0) throw new InvalidOperationException("As quantidades de faltas nao podem ser negativas.");
        if (input.PositiveMinutes < 0 || input.NegativeMinutes < 0 || input.NightMinutes < 0) throw new InvalidOperationException("Os minutos nao podem ser negativos.");
        if (rules.EmployeeFirstFortnightPercent is < 0m or > 100m || rules.ContractorFirstFortnightPercent is < 0m or > 100m) throw new InvalidOperationException("Os percentuais devem estar entre zero e cem.");
        if (rules.FullAbsenceValue <= 0m || rules.HalfAbsenceValue <= 0m) throw new InvalidOperationException("Os valores de falta devem ser maiores que zero.");
        if (input.Vouchers.Any(x => x.Amount <= 0m) || input.Additions.Any(x => x.Amount <= 0m) || input.Deductions.Any(x => x.Amount <= 0m)) throw new InvalidOperationException("Os valores de ajustes e vales devem ser maiores que zero.");
        if (input.PositiveMinutes + input.NegativeMinutes + input.NightMinutes > 0 && (rules.MonthlyWorkMinutes is null or <= 0 || rules.PositiveHourMultiplier is null or <= 0m || rules.NegativeHourMultiplier is null or <= 0m || rules.NightHourMultiplier is null or <= 0m))
            throw new InvalidOperationException("Configure a carga mensal e os multiplicadores antes de informar horas.");
    }

    private static decimal CalculateMinutes(decimal monthlyValue, int minutes, int monthlyMinutes, decimal multiplier) => Round(monthlyValue / monthlyMinutes * minutes * multiplier);
    private static decimal Round(decimal value) => Math.Round(value, 2, MidpointRounding.AwayFromZero);
}
