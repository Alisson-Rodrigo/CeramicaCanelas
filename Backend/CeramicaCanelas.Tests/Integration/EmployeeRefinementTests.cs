using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using CeramicaCanelas.Application.Features.Payments;
using CeramicaCanelas.Domain.Entities.Payments;
using CeramicaCanelas.Domain.Enums.Payments;
using FluentAssertions;
using Microsoft.AspNetCore.TestHost;

namespace CeramicaCanelas.Tests.Integration;

public sealed class EmployeeRefinementTests
{
    private static PaymentHarness Employee(decimal bonus = 400)
    {
        var h = new PaymentHarness(); h.Person.EmploymentType = EmploymentType.Employee; h.Person.MonthlyValue = 2000; h.Person.MonthlyBonus = bonus; return h;
    }
    private static Voucher Voucher(PaymentHarness h, decimal total)
    {
        var v = new Voucher { PaymentPersonId = h.Person.Id, Description = "Vale interno", TotalValue = total, RemainingBalance = total,
            InstallmentValue = total, Date = new(2026, 11, 1), StartYear = 2026, StartMonth = 11, Periodicity = VoucherPeriodicity.Single, InstallmentCount = 1, AllowPartialDiscount = true };
        h.Vouchers.Add(v); return v;
    }
    private static CalculatePaymentRequest Request(PaymentHarness h, Fortnight period = Fortnight.First, decimal amount = 800,
        Voucher? voucher = null, decimal selected = 0) => h.Request(period, accountant: amount) with { VoucherSelections = voucher == null ? null : [new(voucher.Id, selected)] };
    private static async Task FirstPaid(PaymentHarness h, Voucher? voucher = null, decimal selected = 0)
    { var first = await h.Service.ConfirmAsync(Request(h, voucher: voucher, selected: selected), default); await h.Service.MarkPaidAsync(first.Id, DateTime.UtcNow, default); }

    [Theory]
    [InlineData(800)] [InlineData(735.41)] [InlineData(0)]
    public async Task FirstPreservesManualValueWithoutCalculatingFortyPercent(decimal amount)
    {
        var h = Employee(); var result = await h.Service.ConfirmAsync(Request(h, amount: amount), default);
        result.NetValue.Should().Be(amount); result.EmployeeSettlement!.AccountantProvidedAmount.Should().Be(amount);
        result.Items.Should().NotContain(x => x.Kind == PaymentItemKind.Bonus);
    }
    [Theory] [InlineData(Fortnight.First)] [InlineData(Fortnight.Second)]
    public async Task ManualAmountIsRequiredForBothFortnights(Fortnight period)
    {
        var h = Employee(); if (period == Fortnight.Second) await FirstPaid(h);
        Func<Task> action = () => h.Service.PreviewAsync(h.Request(period), default);
        await action.Should().ThrowAsync<InvalidOperationException>();
    }
    [Fact]
    public async Task FirstSelectedVoucherPreservesOriginalValueAndConsumesOnlyOnConfirmation()
    {
        var h = Employee(); var v = Voucher(h, 150);
        (await h.Service.PreviewAsync(Request(h), default)).NetValue.Should().Be(800);
        var request = Request(h, voucher: v, selected: 150);
        var preview = await h.Service.PreviewAsync(request, default);
        preview.NetValue.Should().Be(650); preview.EmployeeSettlement!.AccountantProvidedAmount.Should().Be(800);
        preview.EmployeeSettlement.InternalVoucherDeduction.Should().Be(150); v.RemainingBalance.Should().Be(150);
        var saved = await h.Service.ConfirmAsync(request, default);
        saved.NetValue.Should().Be(650); v.RemainingBalance.Should().Be(0);
        h.Calculations.Single().EmployeeAccountantAmount.Should().Be(800);
    }
    [Fact]
    public async Task PartialDiscountsInBothPeriodsDoNotDoubleSpend()
    {
        var h = Employee(); var v = Voucher(h, 300);
        await FirstPaid(h, v, 100); v.RemainingBalance.Should().Be(200); v.Status.Should().Be(VoucherStatus.Active);
        var request = Request(h, Fortnight.Second, 1200, v, 200);
        var second = await h.Service.ConfirmAsync(request, default);
        second.NetValue.Should().Be(1000); second.EmployeeSettlement!.AccountantProvidedAmount.Should().Be(1200);
        v.RemainingBalance.Should().Be(0);
        Func<Task> duplicate = () => h.Service.ConfirmAsync(request, default); await duplicate.Should().ThrowAsync<InvalidOperationException>();
        var ledger = (await h.Service.GetEmployeeVouchersAsync(h.Person.Id, 2026, 11, Fortnight.Second, default)).Single();
        ledger.Discounts.Should().HaveCount(2); ledger.DeductedValue.Should().Be(300);
    }
    [Fact]
    public async Task UnselectedVoucherRemainsPendingUntilSecond()
    {
        var h = Employee(); var v = Voucher(h, 300); await FirstPaid(h);
        v.RemainingBalance.Should().Be(300);
        var second = await h.Service.ConfirmAsync(Request(h, Fortnight.Second, 1130, v, 300), default);
        second.NetValue.Should().Be(830); second.EmployeeSettlement!.AccountantProvidedAmount.Should().Be(1130);
    }
    [Fact]
    public async Task DuplicateSelectionsAndOverBalanceAreRejected()
    {
        var h = Employee(); var v = Voucher(h, 300);
        Func<Task> duplicate = () => h.Service.PreviewAsync(Request(h) with { VoucherSelections = [new(v.Id, 100), new(v.Id, 100)] }, default);
        await duplicate.Should().ThrowAsync<InvalidOperationException>();
        Func<Task> excess = () => h.Service.PreviewAsync(Request(h, voucher: v, selected: 301), default);
        await excess.Should().ThrowAsync<InvalidOperationException>(); v.RemainingBalance.Should().Be(300);
    }
    [Fact]
    public async Task ManualAmountCannotBeChangedBySalaryOrAttendance()
    {
        var h = Employee(); await h.Absence(2); await h.Absence(3, true);
        h.Person.MonthlyValue = 9999;
        (await h.Service.PreviewAsync(Request(h, amount: 731.22m), default)).NetValue.Should().Be(731.22m);
    }
    [Theory] [InlineData(330, 135, 195)] [InlineData(60, 135, -75)]
    public async Task MonthlyHoursAreSeparateAndNeverConvertedToMoney(int positive, int negative, int balance)
    {
        var h = Employee();
        await h.Service.SaveEmployeeTimeEntryAsync(h.Person.Id, null, new(new(2026, 11, 2), positive, 0, "Positivas"), "operator", default);
        await h.Service.SaveEmployeeTimeEntryAsync(h.Person.Id, null, new(new(2026, 11, 3), 0, negative, "Negativas"), "operator", default);
        var report = await h.Service.GetAccountantSummaryAsync(h.Person.Id, 2026, 11, default);
        report.Hours.PositiveMinutes.Should().Be(positive); report.Hours.NegativeMinutes.Should().Be(negative); report.Hours.BalanceMinutes.Should().Be(balance);
        report.Hours.BalanceHours.Should().Be(balance == 195 ? "+03:15" : "-01:15");
        (await h.Service.PreviewAsync(Request(h), default)).NetValue.Should().Be(800);
    }
    [Fact]
    public async Task AccountantReportContainsOnlyAttendanceAndHours()
    {
        var h = Employee(); Voucher(h, 300); await h.Absence(2); await h.Absence(18, true);
        var report = await h.Service.GetAccountantSummaryAsync(h.Person.Id, 2026, 11, default);
        report.FullAbsences.Should().Be(1); report.HalfAbsences.Should().Be(1); report.Occurrences.Should().HaveCount(2);
        var json = JsonSerializer.Serialize(report, new JsonSerializerOptions(JsonSerializerDefaults.Web));
        json.Should().NotContain("voucher").And.NotContain("bonus").And.NotContain("monthlyValue").And.NotContain("firstFortnight").And.NotContain("netValue");
    }
    [Fact]
    public async Task SnapshotOfMonthlyReportDoesNotContainVouchersAndSurvivesCorrection()
    {
        var h = Employee(); var absence = await h.Absence(2); Voucher(h, 300);
        await h.Service.RegisterEmployeeAccountantSummaryAsync(h.Person.Id, new(2026, 11, "Resumo mensal"), "operator", default);
        h.Submissions.Single().SummaryJson.Should().NotContain("Voucher").And.NotContain("Bonus");
        await h.Service.SaveAbsenceAsync(h.Person.Id, absence.Id, new(absence.Date, true, "Correcao", Revision: absence.Revision), "operator", default);
        var saved = (await h.Service.GetEmployeeAccountantSubmissionsAsync(h.Person.Id, 2026, 11, default)).Single();
        saved.Summary.FullAbsences.Should().Be(1); saved.Summary.HalfAbsences.Should().Be(0);
    }
    [Theory]
    [InlineData(0, 0, 400)] [InlineData(2, 1, 150)] [InlineData(8, 2, 0)]
    public async Task MonthlyBonusIsSeparateFromPayrollAndUsesFixedReductions(int full, int half, decimal expected)
    {
        var h = Employee();
        for (var i = 0; i < full; i++) await h.Absence(i + 1);
        for (var i = 0; i < half; i++) await h.Absence(i + 20, true);
        await FirstPaid(h);
        var second = await h.Service.ConfirmAsync(Request(h, Fortnight.Second, 1200), default);
        second.NetValue.Should().Be(1200); second.Items.Should().NotContain(x => x.Kind == PaymentItemKind.Bonus || x.Kind == PaymentItemKind.BonusAbsenceDeduction);
        var bonus = (await h.Service.GetEmployeeBonusReportAsync(h.Person.Id, 2026, 11, default)).Single();
        bonus.OriginalBonus.Should().Be(400); bonus.FullAbsences.Should().Be(full); bonus.HalfAbsences.Should().Be(half);
        bonus.FullAbsenceDeduction.Should().Be(full * 100); bonus.HalfAbsenceDeduction.Should().Be(half * 50);
        bonus.FinalBonus.Should().Be(expected); bonus.IsClosed.Should().BeTrue();
        await h.Service.UpdateSalaryAsync(h.Person.Id, new(4000, 900), default);
        (await h.Service.GetEmployeeBonusReportAsync(h.Person.Id, 2026, 11, default)).Single().FinalBonus.Should().Be(expected);
    }
    [Fact]
    public async Task VoucherSheetIsInternalAndSeparatesFirstAndSecondApplications()
    {
        var h = Employee(); var v = Voucher(h, 300); await FirstPaid(h, v, 100);
        await h.Service.ConfirmAsync(Request(h, Fortnight.Second, 1200, v, 200), default);
        var row = (await h.Service.GetEmployeeVoucherSheetAsync(h.Person.Id, 2026, 11, default)).Single();
        row.FirstFortnightDiscount.Should().Be(100); row.SecondFortnightDiscount.Should().Be(200); row.TotalDiscounted.Should().Be(300); row.PendingBalance.Should().Be(0);
        row.PaidDiscountsInCompetence.Should().Be(100); row.ReservedDiscountsInCompetence.Should().Be(200);
        var file = await h.Service.ExportEmployeeVoucherSheetAsync(h.Person.Id, 2026, 11, default);
        file.FileName.Should().EndWith(".csv"); Encoding.UTF8.GetString(file.Content).Should().Contain("100,00").And.Contain("200,00").And.Contain("2026-11");
    }
    [Fact]
    public async Task CancellationRestoresVoucherAndMonthlyBonusCanBeReclosedWithoutDuplicates()
    {
        var h = Employee(); var v = Voucher(h, 300); await FirstPaid(h);
        var second = await h.Service.ConfirmAsync(Request(h, Fortnight.Second, 1200, v, 100), default);
        await h.Service.DeleteCalculationAsync(second.Id, new("Correcao"), "operator", default);
        v.RemainingBalance.Should().Be(300); h.Bonuses.Single().IsCancelled.Should().BeTrue();
        await h.Service.ConfirmAsync(Request(h, Fortnight.Second, 1200, v, 100), default);
        h.Bonuses.Count(x => !x.IsCancelled).Should().Be(1);
    }
    [Fact]
    public async Task PaidHistoryAndReportedAmountAreNeverRecalculated()
    {
        var h = Employee(); var v = Voucher(h, 150); var request = Request(h, voucher: v, selected: 150);
        var first = await h.Service.ConfirmAsync(request, default); await h.Service.MarkPaidAsync(first.Id, DateTime.UtcNow, default);
        await h.Service.UpdateSalaryAsync(h.Person.Id, new(8000, 700), default);
        var saved = await h.Service.PreviewAsync(request with { AccountantAmount = 900 }, default);
        saved.NetValue.Should().Be(650); saved.EmployeeSettlement!.AccountantProvidedAmount.Should().Be(800);
        Func<Task> pay = () => h.Service.MarkPaidAsync(first.Id, DateTime.UtcNow, default); await pay.Should().ThrowAsync<InvalidOperationException>();
    }
    [Fact]
    public async Task LegacyBonusIsNotRecreatedOrAddedToOldPayments()
    {
        var h = Employee(); h.Calculations.Add(new() { PaymentPersonId = h.Person.Id, PersonName = "Historico", EmploymentType = EmploymentType.Employee,
            CompetenceYear = 2026, CompetenceMonth = 11, Fortnight = Fortnight.Second, NetValue = 1400,
            Items = [new() { Kind = PaymentItemKind.Bonus, Amount = 400 }, new() { Kind = PaymentItemKind.BonusAbsenceDeduction, Amount = 100 }] });
        var bonus = (await h.Service.GetEmployeeBonusReportAsync(h.Person.Id, 2026, 11, default)).Single();
        bonus.FinalBonus.Should().Be(300); bonus.IncludedInLegacyPayroll.Should().BeTrue(); h.Bonuses.Should().BeEmpty(); h.Calculations.Single().NetValue.Should().Be(1400);
    }
    [Fact]
    public async Task HourRevisionsAndDateUniquenessAreValidated()
    {
        var h = Employee(); var entry = await h.Service.SaveEmployeeTimeEntryAsync(h.Person.Id, null, new(new(2026, 11, 2), 30, 0, "Registro"), "operator", default);
        Func<Task> duplicate = () => h.Service.SaveEmployeeTimeEntryAsync(h.Person.Id, null, new(entry.Date, 0, 10, "Duplicada"), "operator", default);
        await duplicate.Should().ThrowAsync<InvalidOperationException>();
        Func<Task> stale = () => h.Service.SaveEmployeeTimeEntryAsync(h.Person.Id, entry.Id, new(entry.Date, 20, 0, "Correcao", Revision: 0), "operator", default);
        await stale.Should().ThrowAsync<InvalidOperationException>();
    }
    [Fact]
    public async Task ContractorRulesAndVoucherFlowRemainUnchanged()
    {
        var h = new PaymentHarness(); var v = Voucher(h, 150); await h.Service.ConfirmAsync(h.Request(), default);
        (await h.Service.ConfirmAsync(h.Request(Fortnight.Second), default)).NetValue.Should().Be(1750);
        h.Bonuses.Should().BeEmpty(); v.RemainingBalance.Should().Be(0);
        Func<Task> hours = () => h.Service.GetEmployeeHoursSummaryAsync(h.Person.Id, 2026, 11, default); await hours.Should().ThrowAsync<InvalidOperationException>();
    }
    [Fact]
    public async Task ApiRecordsManualFirstAmountAndExportsOnlyMonthlyAttendance()
    {
        var h = Employee(); var v = Voucher(h, 150);
        using var host = await PaymentApiTests.Host(h); using var client = host.GetTestClient();
        using var form = new MultipartFormDataContent();
        foreach (var pair in new Dictionary<string, string> { ["PaymentPersonId"] = h.Person.Id.ToString(), ["CompetenceYear"] = "2026", ["CompetenceMonth"] = "11", ["Fortnight"] = "1", ["AccountantAmount"] = "800", ["VoucherSelectionsJson"] = $"[{{\"voucherId\":\"{v.Id}\",\"amount\":150}}]" }) form.Add(new StringContent(pair.Value), pair.Key);
        var response = await client.PostAsync("/api/employee-payments/calculations", form); response.StatusCode.Should().Be(HttpStatusCode.Created);
        (await response.Content.ReadFromJsonAsync<PaymentHistoryDto>())!.NetValue.Should().Be(650);
        var report = await client.GetStringAsync($"/api/employee-payments/people/{h.Person.Id}/accountant-summary?year=2026&month=11");
        report.Should().NotContain("voucher").And.NotContain("bonus").And.NotContain("accountantProvidedAmount");
    }
}
