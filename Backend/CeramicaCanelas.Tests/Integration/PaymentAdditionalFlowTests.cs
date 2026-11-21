using CeramicaCanelas.Application.Features.Payments;
using CeramicaCanelas.Domain.Enums.Payments;
using FluentAssertions;

namespace CeramicaCanelas.Tests.Integration;

public sealed class PaymentAdditionalFlowTests
{
    [Fact]
    public async Task DsrRequiresIndividualContractAuthorization()
    {
        var h = new PaymentHarness();
        h.Person.ContractualDsrAuthorized = false;
        h.Rules.ContractorDsrValue = 80;
        await h.Absence(2);
        var preview = await h.Service.PreviewAsync(h.Request(), default);
        preview.DsrWeeks.Should().Be(0);
        preview.NetValue.Should().Be(1500);
    }

    [Fact]
    public async Task CancelledAbsenceDoesNotAffectBonusOrDsr()
    {
        var h = new PaymentHarness();
        h.Rules.ContractorDsrValue = 30;
        var absence = await h.Absence(2);
        await h.Service.SaveAbsenceAsync(h.Person.Id, absence.Id,
            new(absence.Date, false, "Cancelamento", true, absence.Revision), "user-2", default);
        await h.Service.ConfirmAsync(h.Request(), default);
        var second = await h.Service.PreviewAsync(h.Request(Fortnight.Second), default);
        second.FinalBonus.Should().Be(400);
        h.Dsr.Should().BeEmpty();
    }

    [Fact]
    public async Task ExplicitCorrectionPreservesPaidSnapshot()
    {
        var h = new PaymentHarness();
        h.Rules.ContractorAbsenceDailyValue = 80;
        var absence = await h.Absence(2);
        var first = await h.Service.ConfirmAsync(h.Request(), default);
        await h.Service.MarkPaidAsync(first.Id, DateTime.UtcNow, default);
        await h.Service.SaveAbsenceAsync(h.Person.Id, absence.Id,
            new(absence.Date, true, "Correcao posterior documentada", Revision: absence.Revision, CorrectClosedPeriod: true),
            "user-2", default);
        var preview = await h.Service.PreviewAsync(h.Request(), default);
        preview.NetValue.Should().Be(first.NetValue);
        preview.AbsenceDeduction.Should().Be(80);
        h.Absences.Single().IsHalf.Should().BeTrue();
    }

    [Fact]
    public async Task SalaryOnlyUpdatePreservesBonus()
    {
        var h = new PaymentHarness();
        await h.Service.UpdateSalaryAsync(h.Person.Id, new(3500), default);
        h.Person.MonthlyBonus.Should().Be(400);
    }

    [Fact]
    public async Task DsrCrossingMonthIsChargedOnlyInFollowingPeriod()
    {
        var h = new PaymentHarness();
        h.Rules.ContractorDsrValue = 30;
        await h.Absence(30, month: 10);
        await h.Service.ConfirmAsync(h.Request(month: 10), default);
        await h.Service.ConfirmAsync(h.Request(Fortnight.Second, 10), default);
        h.Dsr.Should().BeEmpty();
        await h.Service.ConfirmAsync(h.Request(), default);
        h.Dsr.Should().ContainSingle();
        h.Dsr.Single().WeekStart.Should().Be(new DateOnly(2026, 10, 26));
        h.Dsr.Single().AbsenceIds.Should().Contain(h.Absences.Single().Id.ToString());
    }

    [Fact]
    public async Task MonthlySummarySeparatesOriginalClosingFromCorrections()
    {
        var h = new PaymentHarness();
        var first = await h.Service.ConfirmAsync(h.Request(), default);
        await h.Service.ConfirmAsync(h.Request(Fortnight.Second), default);
        await h.Service.CreateAdjustmentAsync(first.Id, new("extra", 20, "Complemento"), "user-1", default);
        var summary = await h.Service.GetMonthlySummaryAsync(h.Person.Id, 2026, 11, default);
        summary.IsClosed.Should().BeTrue();
        summary.OriginalNetTotal.Should().Be(3400);
        summary.AdjustmentTotal.Should().Be(20);
    }
    [Fact]
    public async Task OddCentMonthlyValueIsNotOverpaidAcrossTwoHalves()
    {
        var h = new PaymentHarness();
        h.Person.MonthlyValue = 3000.01m;
        h.Person.MonthlyBonus = 0;
        var first = await h.Service.ConfirmAsync(h.Request(), default);
        var second = await h.Service.ConfirmAsync(h.Request(Fortnight.Second), default);
        (first.NetValue + second.NetValue).Should().Be(3000.01m);
    }
    [Fact]
    public async Task MovingAnAlreadyDeductedAbsenceDoesNotChargeItAgain()
    {
        var h = new PaymentHarness();
        h.Rules.ContractorAbsenceDailyValue = 80;
        h.Rules.ContractorDsrValue = 30;
        var absence = await h.Absence(2);
        await h.Service.ConfirmAsync(h.Request(), default);
        await h.Service.SaveAbsenceAsync(h.Person.Id, absence.Id,
            new(new(2026, 11, 18), false, "Data corrigida", Revision: absence.Revision, CorrectClosedPeriod: true),
            "user-2", default);
        var second = await h.Service.PreviewAsync(h.Request(Fortnight.Second), default);
        second.AbsenceDeduction.Should().Be(0);
        second.DsrWeeks.Should().Be(0);
        second.FinalBonus.Should().Be(300);
    }
}
