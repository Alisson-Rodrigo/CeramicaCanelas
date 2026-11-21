using CeramicaCanelas.Domain.Enums.Payments;
namespace CeramicaCanelas.Domain.Services.Payments;

// Payroll amounts are supplied by the accountant. Only internal voucher arithmetic is performed here.
public static class EmployeePaymentCalculator
{
    public static PaymentCalculationResult Calculate(PaymentCalculationInput input, PaymentRules rules)
    {
        if (input.EmploymentType != EmploymentType.Employee || !Enum.IsDefined(input.Fortnight))
            throw new InvalidOperationException("Calculo exclusivo de funcionarios.");
        if (!input.AccountantAmount.HasValue || input.AccountantAmount < 0 || input.AccountantAmount != Round(input.AccountantAmount.Value))
            throw new InvalidOperationException("Informe manualmente o valor retornado pelo contador, com ate duas casas decimais.");
        if (input.PositiveMinutes != 0 || input.NegativeMinutes != 0 || input.NightMinutes != 0)
            throw new InvalidOperationException("Registre as horas no controle de apuracao. Horas nao sao convertidas em dinheiro.");
        if (input.Additions.Count > 0 || input.Deductions.Count > 0)
            throw new InvalidOperationException("O contador deve informar o valor salarial final. Neste pagamento sao descontados apenas os vales internos selecionados.");
        if (input.Vouchers.Any(x => x.Amount <= 0 || x.Amount != Round(x.Amount) || string.IsNullOrWhiteSpace(x.Description)))
            throw new InvalidOperationException("Vale invalido.");
        if (input.FullAbsences < 0 || input.HalfAbsences < 0) throw new InvalidOperationException("Quantidades invalidas.");
        var amount = input.AccountantAmount.Value;
        var vouchers = input.Vouchers.Sum(x => x.Amount);
        if (vouchers > amount) throw new InvalidOperationException("Os vales selecionados ultrapassam o valor do pagamento. Selecione um desconto parcial menor.");
        var items = new List<CalculatedPaymentItem> { new(PaymentItemKind.FortnightBase, "Valor original informado pelo contador", amount) };
        foreach (var v in input.Vouchers) items.Add(new(PaymentItemKind.Voucher, v.Description, v.Amount, VoucherId: v.VoucherId));
        return new(0, amount, 0, vouchers, Round(amount - vouchers), items);
    }
    private static decimal Round(decimal value) => Math.Round(value, 2, MidpointRounding.AwayFromZero);
}
