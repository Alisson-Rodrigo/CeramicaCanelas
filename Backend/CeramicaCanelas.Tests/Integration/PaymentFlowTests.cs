using CeramicaCanelas.Application.Features.Payments;
using CeramicaCanelas.Domain.Enums.Payments;
using FluentAssertions;
namespace CeramicaCanelas.Tests.Integration;
public sealed class PaymentFlowTests
{
    [Fact]
    public async Task ContractorTwoPeriodsUseMonthlyBonusAndPeriodDeductions()
    {
        var h = new PaymentHarness(); h.Rules.ContractorAbsenceDailyValue = 80; h.Rules.ContractorDsrValue = 30;
        await h.Absence(2); await h.Absence(3); await h.Absence(5); await h.Absence(18, true);
        var first = await h.Service.ConfirmAsync(h.Request(), default);
        first.NetValue.Should().Be(1230); h.Dsr.Should().ContainSingle();
        var second = await h.Service.ConfirmAsync(h.Request(Fortnight.Second), default);
        second.NetValue.Should().Be(1510); // 1500 - 40 + (400 - 350), half does not trigger DSR
        h.Dsr.Should().ContainSingle();
        second.Items.Where(x => x.Kind == PaymentItemKind.BonusAbsenceDeduction).Should().HaveCount(4);
    }
    [Fact]
    public async Task DsrCrossingFortnightNeverDuplicates()
    {
        var h = new PaymentHarness(); h.Rules.ContractorDsrValue = 30;
        await h.Absence(14, month: 10); await h.Absence(16, month: 10);
        await h.Service.ConfirmAsync(h.Request(month: 10), default); h.Dsr.Should().BeEmpty();
        await h.Service.ConfirmAsync(h.Request(Fortnight.Second, 10), default); h.Dsr.Should().ContainSingle();
        (await h.Service.PreviewAsync(h.Request(Fortnight.Second, 10), default)).DsrWeeks.Should().Be(1);
    }
    [Fact]
    public async Task EmployeeAccountantReportAndNoSalaryDeduction()
    {
        var h = new PaymentHarness(); h.Person.EmploymentType = EmploymentType.Employee;
        await h.Absence(2); await h.Absence(18, true);
        var first = await h.Service.ConfirmAsync(h.Request(accountant: 1200), default); first.NetValue.Should().Be(1200);
        await h.Service.MarkPaidAsync(first.Id, DateTime.UtcNow, default);
        (await h.Service.ConfirmAsync(h.Request(Fortnight.Second, accountant: 1700), default)).NetValue.Should().Be(1700);
        var report = await h.Service.GetAccountantSummaryAsync(h.Person.Id, 2026, 11, default);
        report.FullAbsences.Should().Be(1); report.HalfAbsences.Should().Be(1); report.Occurrences.Should().HaveCount(2);
    }
    [Fact]
    public async Task HistoricalClosingDoesNotChangeWithContractOrBonus()
    {
        var h = new PaymentHarness(); var first = await h.Service.ConfirmAsync(h.Request(), default);
        await h.Service.UpdateSalaryAsync(h.Person.Id, new(5000, 900), default);
        var history = await h.Service.GetHistoryAsync(h.Person.Id, 2026, 11, null, default);
        history.Single().NetValue.Should().Be(first.NetValue); history.Single().BaseValue.Should().Be(3000);
        h.Audits.Should().Contain(x => x.Action == "ContractUpdated");
    }
    [Fact]
    public async Task DuplicateClosingAndDuplicatePaymentAreRejected()
    {
        var h = new PaymentHarness(); var first = await h.Service.ConfirmAsync(h.Request(), default);
        Func<Task> duplicate = () => h.Service.ConfirmAsync(h.Request(), default); await duplicate.Should().ThrowAsync<InvalidOperationException>();
        await h.Service.MarkPaidAsync(first.Id, DateTime.UtcNow, default);
        Func<Task> pay = () => h.Service.MarkPaidAsync(first.Id, DateTime.UtcNow, default); await pay.Should().ThrowAsync<InvalidOperationException>();
    }
    [Fact]
    public async Task AbsenceCorrectionIsAuditedAndClosedPeriodIsLocked()
    {
        var h = new PaymentHarness(); var absence = await h.Absence(2);
        await h.Service.SaveAbsenceAsync(h.Person.Id, absence.Id, new(absence.Date, true, "Correcao", Revision: absence.Revision), "user-2", default);
        h.Audits.Should().Contain(x => x.Action == "AbsenceUpdated" && x.Before.Contains("false") && x.UserId == "user-2");
        await h.Service.ConfirmAsync(h.Request(), default);
        Func<Task> edit = () => h.Service.SaveAbsenceAsync(h.Person.Id, absence.Id, new(absence.Date, false, "Correcao", Revision: 2), "user-2", default);
        await edit.Should().ThrowAsync<InvalidOperationException>();
    }
    [Fact] public async Task DuplicateAbsenceRejected() { var h = new PaymentHarness(); await h.Absence(2); Func<Task> action = () => h.Absence(2, true); await action.Should().ThrowAsync<InvalidOperationException>(); }
    [Fact] public async Task MonthlyBonusCannotBeOverriddenInCalculation() { var h = new PaymentHarness(); Func<Task> action = () => h.Service.PreviewAsync(h.Request() with { BonusValue = 100 }, default); await action.Should().ThrowAsync<InvalidOperationException>(); }
    [Fact]
    public async Task AdjustmentPreservesPaidValueAndCannotBePaidTwice()
    {
        var h = new PaymentHarness(); var first = await h.Service.ConfirmAsync(h.Request(), default); await h.Service.MarkPaidAsync(first.Id, DateTime.UtcNow, default);
        await h.Service.CreateAdjustmentAsync(first.Id, new("correcao-1", -50, "Correcao documentada"), "user-1", default);
        h.Calculations.Single().NetValue.Should().Be(first.NetValue);
        await h.Service.PayAdjustmentAsync(first.Id, new("correcao-1", DateTime.UtcNow), "user-1", default);
        Func<Task> twice = () => h.Service.PayAdjustmentAsync(first.Id, new("correcao-1", DateTime.UtcNow), "user-1", default); await twice.Should().ThrowAsync<InvalidOperationException>();
    }
    [Fact]
    public async Task PreparationMovesFromOpenToReviewToClosed()
    {
        var h = new PaymentHarness(); var p = await h.Service.SavePreparationAsync(new(h.Request(), false), "user-1", default); p.Status.Should().Be(PaymentCalculationStatus.Draft);
        await h.Service.SavePreparationAsync(new(h.Request(), true, p.Revision), "user-1", default); p.Status.Should().Be(PaymentCalculationStatus.InReview);
        await h.Service.ConfirmAsync(h.Request(), default); p.Status.Should().Be(PaymentCalculationStatus.Calculated);
    }
}
