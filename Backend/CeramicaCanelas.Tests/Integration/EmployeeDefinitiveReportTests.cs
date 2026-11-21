using CeramicaCanelas.Application.Features.Payments;
using CeramicaCanelas.Domain.Entities.Payments;
using CeramicaCanelas.Domain.Enums.Payments;
using CeramicaCanelas.Infrastructure.Reports;
using CeramicaCanelas.Persistence;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using PdfSharpCore.Pdf.IO;
using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.TestHost;
using System.Text;
using System.Text.Json;

namespace CeramicaCanelas.Tests.Integration;

public sealed class EmployeeDefinitiveReportTests
{
    private static PaymentHarness Employee()
    { var h = new PaymentHarness(); h.Person.EmploymentType = EmploymentType.Employee; return h; }

    [Fact]
    public async Task ActualCounterAndBonusExportsAreValidIndependentPdfs()
    {
        var h = Employee();
        await h.Absence(2); await h.Absence(3, true);
        await h.Service.SaveEmployeeTimeEntryAsync(h.Person.Id, null, new(new(2026, 11, 4), 330, 135, "Registro"), "operator", default);
        var service = new PaymentApplicationService(h.Repository.Object, new PdfReportService());
        var counter = await service.ExportEmployeeAccountantReportAsync(h.Person.Id, 2026, 11, default);
        var bonus = await service.ExportEmployeeBonusReportAsync(h.Person.Id, 2026, 11, default);
        counter.Content.Take(5).Should().Equal("%PDF-"u8.ToArray()); bonus.Content.Take(5).Should().Equal("%PDF-"u8.ToArray());
        using var counterPdf = PdfReader.Open(new MemoryStream(counter.Content), PdfDocumentOpenMode.ReadOnly);
        using var bonusPdf = PdfReader.Open(new MemoryStream(bonus.Content), PdfDocumentOpenMode.ReadOnly);
        counterPdf.PageCount.Should().BeGreaterThan(0); bonusPdf.PageCount.Should().BeGreaterThan(0);
        counter.FileName.Should().Contain("contador"); bonus.FileName.Should().Contain("bonificacao");
    }
    [Fact]
    public async Task LegacyCounterSnapshotIsProjectedWithoutInternalPayrollData()
    {
        var h = Employee();
        var raw = JsonSerializer.Serialize(new { Person = new { h.Person.Id, h.Person.Name, MonthlyValue = 2000, MonthlyBonus = 400 }, Year = 2026, Month = 11,
            FullAbsences = 1, HalfAbsences = 0, Occurrences = new[] { new { Date = new DateOnly(2026, 11, 2), IsHalf = false, IsCancelled = false }, new { Date = new DateOnly(2026, 11, 3), IsHalf = true, IsCancelled = true } },
            EmployeeClosing = new { Vouchers = new[] { new { Amount = 100 } }, NetValue = 650, FirstFortnight = new { NetValue = 650 } } });
        h.Submissions.Add(new() { PaymentPersonId = h.Person.Id, Year = 2026, Month = 11, SummaryJson = raw });
        var returned = (await h.Service.GetEmployeeAccountantSubmissionsAsync(h.Person.Id, 2026, 11, default)).Single();
        var json = JsonSerializer.Serialize(returned.Summary);
        json.Should().NotContain("Voucher").And.NotContain("Bonus").And.NotContain("NetValue").And.NotContain("MonthlyValue");
        returned.Summary.Occurrences.Should().ContainSingle(); h.Submissions.Single().SummaryJson.Should().Be(raw);
    }
    [Fact]
    public void MigrationPreservesOldOperationalReferenceWithoutTouchingInventory()
    {
        using var context = new DefaultContext(new DbContextOptionsBuilder<DefaultContext>().UseNpgsql("Host=localhost;Database=model_only;Username=model;Password=model").Options);
        var sql = context.GetService<IMigrator>().GenerateScript("20261116165505_RefineEmployeeFortnightAndVouchers", "20261116185852_EmployeeManualPaymentsAndSeparatedReports");
        sql.Should().Contain("RENAME COLUMN \"EmployeeId\" TO \"LegacyOperationalReference\"");
        sql.Should().NotContain("DROP COLUMN \"EmployeeId\"").And.NotContain("DELETE FROM").And.NotContain("UPDATE \"PaymentCalculations\"");
        context.Model.FindEntityType(typeof(PaymentPerson))!.FindProperty("EmployeeId").Should().BeNull();
        context.Model.FindEntityType(typeof(CeramicaCanelas.Domain.Entities.Almoxarifado.ProductExit))!.FindProperty("EmployeeId").Should().NotBeNull();
    }
    [Fact]
    public async Task HoursApiReportsPositiveAndNegativeTotalsWithoutSalaryFields()
    {
        var h = Employee(); using var host = await PaymentApiTests.Host(h); using var client = host.GetTestClient();
        var url = $"/api/employee-payments/people/{h.Person.Id}/hours";
        (await client.PostAsJsonAsync(url, new EmployeeTimeEntryRequest(new(2026, 11, 2), 330, 135, "Conferido"))).StatusCode.Should().Be(HttpStatusCode.OK);
        var report = await client.GetFromJsonAsync<AccountantSummaryDto>($"/api/employee-payments/people/{h.Person.Id}/accountant-summary?year=2026&month=11");
        report!.Hours.PositiveHours.Should().Be("+05:30"); report.Hours.NegativeHours.Should().Be("-02:15"); report.Hours.BalanceHours.Should().Be("+03:15");
        var json = JsonSerializer.Serialize(report); json.Should().NotContain("AccountantProvidedAmount").And.NotContain("Bonus").And.NotContain("Voucher");
    }
    [Fact]
    public async Task VoucherSheetEscapesSpreadsheetFormulasInNames()
    {
        var h = Employee(); h.Person.Name = "=2+2";
        h.Vouchers.Add(new() { PaymentPersonId = h.Person.Id, Date = new(2026, 11, 1), TotalValue = 100, RemainingBalance = 100 });
        var file = await h.Service.ExportEmployeeVoucherSheetAsync(h.Person.Id, 2026, 11, default);
        var csv = Encoding.UTF8.GetString(file.Content); csv.Should().Contain("\"'=2+2\"").And.NotContain("\"=2+2\"");
    }
    [Fact]
    public async Task PartialSelectionDoesNotNeedAnObsoleteVoucherConfigurationFlag()
    {
        var h = Employee(); var v = new Voucher { PaymentPersonId = h.Person.Id, Date = new(2026, 11, 1), StartYear = 2026, StartMonth = 11,
            TotalValue = 300, RemainingBalance = 300, Description = "Vale", AllowPartialDiscount = false };
        h.Vouchers.Add(v);
        var calculation = await h.Service.ConfirmAsync(h.Request(accountant: 800) with { VoucherSelections = [new(v.Id, 100)] }, default);
        calculation.NetValue.Should().Be(700); v.RemainingBalance.Should().Be(200);
    }
}
