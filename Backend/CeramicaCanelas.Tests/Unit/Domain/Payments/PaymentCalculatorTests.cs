using CeramicaCanelas.Domain.Enums.Payments;
using CeramicaCanelas.Domain.Services.Payments;
using CeramicaCanelas.Domain.Entities.Payments;
using FluentAssertions;
namespace CeramicaCanelas.Tests.Unit.Domain.Payments;
public sealed class PaymentCalculatorTests
{
    private static readonly PaymentRules Rules = new(40, 50, 100, 50, 10000, 1, 1, 1.2m);
    private static PaymentCalculationInput Input(EmploymentType type = EmploymentType.Employee, Fortnight fortnight = Fortnight.Second, decimal bonus = 400, int full = 0, int half = 0, decimal? accountant = 1500) => new(type, fortnight, 2500, bonus, 1000, full, half, 0, 0, 0, [], [], [], accountant);
    [Fact]
    public void EmployeeFirstUsesManualAccountantValue()
    {
        var r = PaymentCalculator.Calculate(Input(fortnight: Fortnight.First, full: 3, accountant: 987.65m), Rules);
        r.NetValue.Should().Be(987.65m); r.Items.Should().ContainSingle();
    }
    [Fact] public void EmployeeRequiresManualAmount() { Action a = () => PaymentCalculator.Calculate(Input(accountant: null), Rules); a.Should().Throw<InvalidOperationException>(); }
    [Fact]
    public void EmployeeAbsencesNeverDeductSalary()
    {
        var r = PaymentCalculator.Calculate(Input(full: 1, half: 2), Rules);
        r.NetValue.Should().Be(1500); r.DeductionValue.Should().Be(0);
        r.Items.Should().NotContain(x => x.Kind == PaymentItemKind.FullAbsence || x.Kind == PaymentItemKind.HalfAbsence);
    }
    [Theory]
    [InlineData(1, 0)]
    [InlineData(0, 1)]
    [InlineData(0, 2)]
    [InlineData(9, 9)]
    public void EmployeePayrollDoesNotApplyAttendanceReductions(int full, int half)
    {
        var r = PaymentCalculator.Calculate(Input(full: full, half: half), Rules); r.DeductionValue.Should().Be(0); r.NetValue.Should().Be(1500);
    }
    [Theory]
    [InlineData(Fortnight.First)]
    [InlineData(Fortnight.Second)]
    public void ContractorGetsHalf(Fortnight fortnight)
    {
        PaymentCalculator.Calculate(Input(EmploymentType.Contractor, fortnight, bonus: 0), Rules).NetValue.Should().Be(1250);
    }
    [Fact]
    public void FirstNeverPaysBonus()
    {
        var r = PaymentCalculator.Calculate(Input(EmploymentType.Contractor, Fortnight.First, full: 1), Rules);
        r.NetValue.Should().Be(1250); r.Items.Should().NotContain(x => x.Kind == PaymentItemKind.Bonus);
    }
    [Fact]
    public void ContractorAbsenceDeductionRequiresExplicitConfiguration()
    {
        var r = PaymentCalculator.Calculate(Input(EmploymentType.Contractor, Fortnight.First, full: 1, half: 1), Rules with { ContractorAbsenceDailyValue = 80 }); r.DeductionValue.Should().Be(120);
    }
    [Fact]
    public void BonusUsesWholeMonth()
    {
        var r = PaymentCalculator.Calculate(Input(EmploymentType.Contractor) with { MonthlyFullAbsences = 1, MonthlyHalfAbsences = 2 }, Rules); r.NetValue.Should().Be(1450);
    }
    [Fact] public void NegativeAbsencesRejected() { Action a = () => PaymentCalculator.Calculate(Input(full: -1), Rules); a.Should().Throw<InvalidOperationException>(); }
    [Fact] public void NegativeAccountantAmountRejected() { Action a = () => PaymentCalculator.Calculate(Input(accountant: -1), Rules); a.Should().Throw<InvalidOperationException>(); }
    [Fact]
    public void ConfigurableBonusRatesKeepHalfOccurrencesSeparate()
    {
        var r = PaymentCalculator.Calculate(Input(EmploymentType.Contractor, half: 2), Rules with { FullAbsenceValue = 70, HalfAbsenceValue = 20 }); r.DeductionValue.Should().Be(40);
    }
    private static PaymentAbsence Abs(int day, bool half = false) => new() { Date = new DateOnly(2026, 11, day), IsHalf = half };
    [Fact] public void ThreeAbsencesInOneWeekProduceOneDsr() => PaymentWeek.Eligible(new[] { Abs(2), Abs(3), Abs(5) }, new(2026, 11, 1), new(2026, 11, 15), false, new HashSet<DateOnly>()).Should().ContainSingle();
    [Fact] public void DifferentWeeksProduceDistinctDsr() => PaymentWeek.Eligible(new[] { Abs(2), Abs(11) }, new(2026, 11, 1), new(2026, 11, 15), false, new HashSet<DateOnly>()).Should().HaveCount(2);
    [Fact]
    public void HalfAbsenceEligibilityIsExplicit()
    {
        var abs = new[] { Abs(2, true) };
        PaymentWeek.Eligible(abs, new(2026, 11, 1), new(2026, 11, 15), false, new HashSet<DateOnly>()).Should().BeEmpty();
        PaymentWeek.Eligible(abs, new(2026, 11, 1), new(2026, 11, 15), true, new HashSet<DateOnly>()).Should().ContainSingle();
    }
    [Fact]
    public void WeekCrossingFortnightIsAssignedOnceToSunday()
    {
        var abs = new[] { new PaymentAbsence { Date = new(2026, 10, 14) }, new PaymentAbsence { Date = new(2026, 10, 16) } };
        PaymentWeek.Eligible(abs, new(2026, 10, 1), new(2026, 10, 15), false, new HashSet<DateOnly>()).Should().BeEmpty();
        PaymentWeek.Eligible(abs, new(2026, 10, 16), new(2026, 10, 31), false, new HashSet<DateOnly>()).Should().ContainSingle();
    }
    [Fact]
    public void WeekCrossingMonthAndYearIsAssignedToNextMonth()
    {
        var abs = new[] { new PaymentAbsence { Date = new(2026, 12, 31) } };
        PaymentWeek.Eligible(abs, new(2026, 12, 16), new(2026, 12, 31), false, new HashSet<DateOnly>()).Should().BeEmpty();
        PaymentWeek.Eligible(abs, new(2027, 1, 1), new(2027, 1, 15), false, new HashSet<DateOnly>()).Should().ContainSingle();
    }
    [Fact] public void ChargedWeekCannotBeRepeated() => PaymentWeek.Eligible(new[] { Abs(2) }, new(2026, 11, 1), new(2026, 11, 15), false, new HashSet<DateOnly> { new(2026, 11, 2) }).Should().BeEmpty();
}
