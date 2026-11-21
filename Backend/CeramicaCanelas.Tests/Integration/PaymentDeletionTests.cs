using System.Net;
using System.Net.Http.Json;
using CeramicaCanelas.Application.Features.Payments;
using CeramicaCanelas.Domain.Entities.Payments;
using CeramicaCanelas.Domain.Enums.Payments;
using FluentAssertions;
using Microsoft.AspNetCore.TestHost;

namespace CeramicaCanelas.Tests.Integration;

public sealed class PaymentDeletionTests
{
    private static readonly DeletePaymentEntryRequest Delete = new("Lancamento incorreto");

    [Fact]
    public async Task DeletePersonHidesWorkerAndPreservesPaidHistory()
    {
        var h = new PaymentHarness();
        var calculation = await h.Service.ConfirmAsync(h.Request(), default);
        await h.Service.MarkPaidAsync(calculation.Id, DateTime.UtcNow, default);
        await h.Service.DeletePersonAsync(h.Person.Id, Delete, "operator", default);
        (await h.Service.GetPeopleAsync(default)).Should().BeEmpty();
        h.Person.IsActive.Should().BeFalse();
        h.Calculations.Single().NetValue.Should().Be(calculation.NetValue);
        h.Calculations.Single().Status.Should().Be(PaymentCalculationStatus.Paid);
        h.Audits.Should().Contain(x => x.Action == "PersonDeleted" && x.UserId == "operator");
        Func<Task> reactivate = () => h.Service.UpdatePersonStatusAsync(h.Person.Id, true, default);
        await reactivate.Should().ThrowAsync<InvalidOperationException>();
        Func<Task> addAbsence = () => h.Absence(18);
        await addAbsence.Should().ThrowAsync<InvalidOperationException>();
    }

    [Fact]
    public async Task DeleteAbsenceCancelsWithoutErasingOriginalAndRequiresRevision()
    {
        var h = new PaymentHarness();
        var absence = await h.Absence(2);
        Func<Task> stale = () => h.Service.DeleteAbsenceAsync(h.Person.Id, absence.Id, Delete, "operator", default);
        await stale.Should().ThrowAsync<InvalidOperationException>();
        await h.Service.DeleteAbsenceAsync(h.Person.Id, absence.Id, Delete with { Revision = absence.Revision }, "operator", default);
        h.Absences.Should().ContainSingle().Which.IsCancelled.Should().BeTrue();
        (await h.Service.PreviewAsync(h.Request(), default)).AbsenceDeduction.Should().Be(0);
    }

    [Fact]
    public async Task DeleteVoucherKeepsAppliedHistoryButStopsFutureInstallments()
    {
        var h = new PaymentHarness();
        var voucher = Voucher(h);
        h.Vouchers.Add(voucher);
        await h.Service.ConfirmAsync(h.Request(), default);
        var second = await h.Service.ConfirmAsync(h.Request(Fortnight.Second), default);
        await h.Service.DeleteVoucherAsync(voucher.Id, Delete, "operator", default);
        voucher.Status.Should().Be(VoucherStatus.Cancelled);
        voucher.AppliedInstallments.Should().Be(1);
        second.Items.Should().Contain(x => x.VoucherId == voucher.Id && x.Amount == 100);
    }

    [Fact]
    public async Task CancelUnpaidClosingReleasesDsrAndAllowsFreshClosing()
    {
        var h = new PaymentHarness();
        h.Rules.ContractorDsrValue = 30;
        await h.Absence(2);
        var first = await h.Service.ConfirmAsync(h.Request(), default);
        await h.Service.DeleteCalculationAsync(first.Id, Delete, "operator", default);
        h.Calculations[0].Status.Should().Be(PaymentCalculationStatus.Cancelled);
        h.Dsr[0].IsCancelled.Should().BeTrue();
        (await h.Service.GetMonthlySummaryAsync(h.Person.Id, 2026, 11, default)).OriginalNetTotal.Should().Be(0);
        var replacement = await h.Service.ConfirmAsync(h.Request(), default);
        replacement.Id.Should().NotBe(first.Id);
        replacement.NetValue.Should().Be(first.NetValue);
        h.Dsr.Count(x => !x.IsCancelled).Should().Be(1);
        h.Calculations.Should().HaveCount(2);
    }

    [Fact]
    public async Task CancelClosingRestoresVoucherBalanceOnlyOnce()
    {
        var h = new PaymentHarness();
        var voucher = Voucher(h);
        h.Vouchers.Add(voucher);
        await h.Service.ConfirmAsync(h.Request(), default);
        var second = await h.Service.ConfirmAsync(h.Request(Fortnight.Second), default);
        voucher.RemainingBalance.Should().Be(0);
        await h.Service.DeleteCalculationAsync(second.Id, Delete, "operator", default);
        voucher.RemainingBalance.Should().Be(100);
        voucher.AppliedInstallments.Should().Be(0);
        voucher.Status.Should().Be(VoucherStatus.Active);
        Func<Task> repeat = () => h.Service.DeleteCalculationAsync(second.Id, Delete, "operator", default);
        await repeat.Should().ThrowAsync<InvalidOperationException>();
        voucher.RemainingBalance.Should().Be(100);
        (await h.Service.ConfirmAsync(h.Request(Fortnight.Second), default)).NetValue.Should().Be(second.NetValue);
    }

    [Fact]
    public async Task PaidClosingCannotBeDeleted()
    {
        var h = new PaymentHarness();
        var first = await h.Service.ConfirmAsync(h.Request(), default);
        await h.Service.MarkPaidAsync(first.Id, DateTime.UtcNow, default);
        Func<Task> delete = () => h.Service.DeleteCalculationAsync(first.Id, Delete, "operator", default);
        await delete.Should().ThrowAsync<InvalidOperationException>();
        h.Calculations.Single().Status.Should().Be(PaymentCalculationStatus.Paid);
    }

    [Fact]
    public async Task FirstCannotBeCancelledWhileSecondIsClosed()
    {
        var h = new PaymentHarness();
        var first = await h.Service.ConfirmAsync(h.Request(), default);
        var second = await h.Service.ConfirmAsync(h.Request(Fortnight.Second), default);
        Func<Task> delete = () => h.Service.DeleteCalculationAsync(first.Id, Delete, "operator", default);
        await delete.Should().ThrowAsync<InvalidOperationException>();
        await h.Service.DeleteCalculationAsync(second.Id, Delete, "operator", default);
        await h.Service.DeleteCalculationAsync(first.Id, Delete, "operator", default);
    }

    [Fact]
    public async Task ClosingWithAdjustmentsCannotBeDeleted()
    {
        var h = new PaymentHarness();
        var first = await h.Service.ConfirmAsync(h.Request(), default);
        await h.Service.CreateAdjustmentAsync(first.Id, new("ajuste", 10, "Complemento"), "operator", default);
        Func<Task> delete = () => h.Service.DeleteCalculationAsync(first.Id, Delete, "operator", default);
        await delete.Should().ThrowAsync<InvalidOperationException>();
    }

    [Fact]
    public async Task PreparationDeletionIsAuditedAndCannotDeleteClosedPeriod()
    {
        var h = new PaymentHarness();
        var preparation = await h.Service.SavePreparationAsync(new(h.Request(), true), "operator", default);
        await h.Service.DeletePreparationAsync(preparation.Id, Delete with { Revision = preparation.Revision }, "operator", default);
        h.Preparations.Should().BeEmpty();
        h.Audits.Should().Contain(x => x.Action == "PreparationDeleted" && x.Before.Contains("RequestJson"));
        preparation = await h.Service.SavePreparationAsync(new(h.Request(), false), "operator", default);
        await h.Service.ConfirmAsync(h.Request(), default);
        Func<Task> delete = () => h.Service.DeletePreparationAsync(preparation.Id, Delete with { Revision = preparation.Revision }, "operator", default);
        await delete.Should().ThrowAsync<InvalidOperationException>();
    }

    [Theory]
    [InlineData("people")]
    [InlineData("vouchers")]
    [InlineData("preparations")]
    [InlineData("calculations")]
    public async Task ApiDeleteRoutesReturnNoContent(string resource)
    {
        var h = new PaymentHarness();
        var id = h.Person.Id;
        var request = Delete;
        if (resource == "vouchers") { var voucher = Voucher(h); h.Vouchers.Add(voucher); id = voucher.Id; }
        if (resource == "preparations") { var preparation = await h.Service.SavePreparationAsync(new(h.Request(), false), "operator", default); id = preparation.Id; request = Delete with { Revision = preparation.Revision }; }
        if (resource == "calculations") id = (await h.Service.ConfirmAsync(h.Request(), default)).Id;
        using var host = await PaymentApiTests.Host(h);
        using var client = host.GetTestClient();
        using var message = new HttpRequestMessage(HttpMethod.Delete, $"/api/payments/{resource}/{id}") { Content = JsonContent.Create(request) };
        (await client.SendAsync(message)).StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task ApiDeleteAbsenceRequiresExplicitCorrectionForClosedPeriod()
    {
        var h = new PaymentHarness();
        var absence = await h.Absence(2);
        await h.Service.ConfirmAsync(h.Request(), default);
        using var host = await PaymentApiTests.Host(h);
        using var client = host.GetTestClient();
        var url = $"/api/payments/people/{h.Person.Id}/absences/{absence.Id}";
        using var blocked = new HttpRequestMessage(HttpMethod.Delete, url) { Content = JsonContent.Create(Delete with { Revision = absence.Revision }) };
        (await client.SendAsync(blocked)).StatusCode.Should().Be(HttpStatusCode.BadRequest);
        using var corrected = new HttpRequestMessage(HttpMethod.Delete, url) { Content = JsonContent.Create(Delete with { Revision = absence.Revision, CorrectClosedPeriod = true }) };
        (await client.SendAsync(corrected)).StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    private static Voucher Voucher(PaymentHarness h) => new()
    {
        PaymentPersonId = h.Person.Id, Description = "Vale", InstallmentValue = 100,
        TotalValue = 100, RemainingBalance = 100, StartYear = 2026, StartMonth = 11,
        Periodicity = VoucherPeriodicity.Monthly
    };
}
