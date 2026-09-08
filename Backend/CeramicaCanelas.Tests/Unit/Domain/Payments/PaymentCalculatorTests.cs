using CeramicaCanelas.Domain.Enums.Payments;
using CeramicaCanelas.Domain.Services.Payments;
using FluentAssertions;

namespace CeramicaCanelas.Tests.Unit.Domain.Payments;

public sealed class PaymentCalculatorTests
{
    private static readonly PaymentRules Rules = new(40m, 50m, 100m, 50m, 10_000, 1m, 1m, 1.2m);

    [Fact]
    public void EmployeeFirstFortnightUsesOnlyPercentage()
    {
        var result = PaymentCalculator.Calculate(Input(EmploymentType.Employee, Fortnight.First, bonus: 300m, full: 2), Rules);
        result.NetValue.Should().Be(1000m);
        result.Items.Should().ContainSingle();
    }

    [Fact]
    public void EmployeeSecondFortnightAppliesBonusAndAbsences()
    {
        var result = PaymentCalculator.Calculate(Input(EmploymentType.Employee, Fortnight.Second, bonus: 200m, firstPaid: 1000m, full: 1, half: 1), Rules);
        result.GrossValue.Should().Be(1700m);
        result.DeductionValue.Should().Be(275m);
        result.NetValue.Should().Be(1425m);
        result.Items.Should().Contain(x => x.Description == "Desconto salarial - falta inteira" && x.Amount == 83.33m);
        result.Items.Should().Contain(x => x.Description == "Desconto da bonificacao - falta inteira" && x.Amount == 100m);
    }

    [Fact]
    public void ContractorSecondFortnightAppliesIndividualBonus()
    {
        var result = PaymentCalculator.Calculate(Input(EmploymentType.Contractor, Fortnight.Second, bonus: 300m), Rules);
        result.NetValue.Should().Be(1550m);
        result.Items.Should().Contain(x => x.Kind == PaymentItemKind.Bonus && x.Amount == 300m);
    }

    [Fact]
    public void ContractorFirstFortnightAppliesAbsenceWithoutBonus()
    {
        var result = PaymentCalculator.Calculate(Input(EmploymentType.Contractor, Fortnight.First, bonus: 300m, full: 1), Rules);
        result.NetValue.Should().Be(1166.67m);
        result.Items.Should().NotContain(x => x.Kind == PaymentItemKind.Bonus);
        result.Items.Should().NotContain(x => x.Description.Contains("bonificacao"));
    }

    [Fact]
    public void TwoHalfAbsencesBecomeOneFullAbsence()
    {
        var result = PaymentCalculator.Calculate(Input(EmploymentType.Employee, Fortnight.Second, firstPaid: 1000m, half: 2), Rules);
        result.DeductionValue.Should().Be(83.33m);
        result.Items.Should().ContainSingle(x => x.Kind == PaymentItemKind.FullAbsence && x.Quantity == 1m && x.Description.Contains("salarial"));
    }

    [Fact]
    public void AbsenceBonusDiscountDoesNotConsumeSalaryBeyondBonus()
    {
        var result = PaymentCalculator.Calculate(Input(EmploymentType.Employee, Fortnight.Second, bonus: 60m, firstPaid: 1000m, full: 1), Rules);
        result.DeductionValue.Should().Be(143.33m);
        result.Items.Should().Contain(x => x.Description == "Desconto da bonificacao - falta inteira" && x.Amount == 60m);
    }

    [Fact]
    public void NegativeAbsencesAreRejected()
    {
        var action = () => PaymentCalculator.Calculate(Input(EmploymentType.Contractor, Fortnight.First, full: -1), Rules);
        action.Should().Throw<InvalidOperationException>();
    }

    private static PaymentCalculationInput Input(EmploymentType type, Fortnight fortnight, decimal bonus = 0m, decimal firstPaid = 0m, int full = 0, int half = 0) =>
        new(type, fortnight, 2500m, bonus, firstPaid, full, half, 0, 0, 0, [], [], []);
}
