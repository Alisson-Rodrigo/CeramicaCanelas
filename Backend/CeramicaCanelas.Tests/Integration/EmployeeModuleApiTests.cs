using System.Net;
using System.Net.Http.Json;
using CeramicaCanelas.Application.Contracts.Application.Services;
using CeramicaCanelas.Application.Features.Payments;
using CeramicaCanelas.Domain.Entities.Payments;
using CeramicaCanelas.Domain.Enums.Payments;
using FluentAssertions;
using Microsoft.AspNetCore.TestHost;
using Moq;

namespace CeramicaCanelas.Tests.Integration;

public sealed class EmployeeModuleApiTests
{
    [Fact]
    public async Task EmployeeListAndHistoryExcludeContractorsWithoutFrontendFilter()
    {
        var h = new PaymentHarness();
        var employee = new PaymentPerson { Name = "Funcionario", EmploymentType = EmploymentType.Employee, MonthlyValue = 2000 };
        h.Repository.Setup(x => x.GetPeopleAsync(It.IsAny<CancellationToken>())).ReturnsAsync([h.Person, employee]);
        h.Calculations.Add(new() { PaymentPersonId = h.Person.Id, EmploymentType = EmploymentType.Contractor, PersonName = h.Person.Name, CompetenceYear = 2026, CompetenceMonth = 11 });
        h.Calculations.Add(new() { PaymentPersonId = employee.Id, EmploymentType = EmploymentType.Employee, PersonName = employee.Name, CompetenceYear = 2026, CompetenceMonth = 11 });
        using var host = await PaymentApiTests.Host(h); using var client = host.GetTestClient();
        (await client.GetFromJsonAsync<List<PaymentPersonDto>>("/api/employee-payments/people"))!.Should().ContainSingle().Which.EmploymentType.Should().Be(EmploymentType.Employee);
        (await client.GetFromJsonAsync<List<PaymentHistoryDto>>("/api/employee-payments/calculations"))!.Should().ContainSingle().Which.PaymentPersonId.Should().Be(employee.Id);
        // Existing shared module is retained for compatibility.
        (await client.GetFromJsonAsync<List<PaymentPersonDto>>("/api/payments/people"))!.Should().HaveCount(2);
    }

    [Fact]
    public async Task EmployeeModuleRejectsContractorMutations()
    {
        var h = new PaymentHarness();
        using var host = await PaymentApiTests.Host(h); using var client = host.GetTestClient();
        using var delete = new HttpRequestMessage(HttpMethod.Delete, $"/api/employee-payments/people/{h.Person.Id}") { Content = JsonContent.Create(new DeletePaymentEntryRequest("Exclusao")) };
        (await client.SendAsync(delete)).StatusCode.Should().Be(HttpStatusCode.BadRequest);
        h.Person.IsDeleted.Should().BeFalse();
        using var form = CalculationForm(h.Person.Id);
        (await client.PostAsync("/api/employee-payments/calculations", form)).StatusCode.Should().Be(HttpStatusCode.BadRequest);
        h.Calculations.Should().BeEmpty();
        (await client.PostAsJsonAsync($"/api/employee-payments/people/{h.Person.Id}/absences", new AbsenceRequest(new(2026, 11, 2), false, "Teste"))).StatusCode.Should().Be(HttpStatusCode.BadRequest);
        h.Absences.Should().BeEmpty();
    }

    [Theory]
    [InlineData("calculations")]
    [InlineData("preparations")]
    [InlineData("vouchers")]
    public async Task EmployeeModuleRejectsContractorOwnedResources(string resource)
    {
        var h = new PaymentHarness();
        var id = Guid.NewGuid();
        if (resource == "calculations") h.Calculations.Add(new() { Id = id, PaymentPersonId = h.Person.Id, EmploymentType = EmploymentType.Contractor });
        if (resource == "preparations") h.Preparations.Add(new() { Id = id, PaymentPersonId = h.Person.Id });
        if (resource == "vouchers") h.Vouchers.Add(new() { Id = id, PaymentPersonId = h.Person.Id });
        using var host = await PaymentApiTests.Host(h); using var client = host.GetTestClient();
        using var delete = new HttpRequestMessage(HttpMethod.Delete, $"/api/employee-payments/{resource}/{id}") { Content = JsonContent.Create(new DeletePaymentEntryRequest("Exclusao", 0)) };
        (await client.SendAsync(delete)).StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task EmployeeFirstFortnightWorksThroughDedicatedModule()
    {
        var h = new PaymentHarness(); h.Person.EmploymentType = EmploymentType.Employee; h.Person.MonthlyValue = 2000;
        using var host = await PaymentApiTests.Host(h); using var client = host.GetTestClient();
        using var form = CalculationForm(h.Person.Id);
        var response = await client.PostAsync("/api/employee-payments/calculations", form);
        response.StatusCode.Should().Be(HttpStatusCode.Created);
        (await response.Content.ReadFromJsonAsync<PaymentHistoryDto>())!.NetValue.Should().Be(800);
        using var paidForm = new MultipartFormDataContent(); paidForm.Add(new StringContent("2026-11-15T12:00:00Z"), "PaidAt");
        using var paid = new HttpRequestMessage(HttpMethod.Patch, $"/api/employee-payments/calculations/{h.Calculations.Single().Id}/paid") { Content = paidForm };
        (await client.SendAsync(paid)).StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task DedicatedVoucherCreationUsesSimpleEmployeeContract()
    {
        var h = new PaymentHarness(); h.Person.EmploymentType = EmploymentType.Employee;
        using var host = await PaymentApiTests.Host(h); using var client = host.GetTestClient();
        using var form = new MultipartFormDataContent();
        foreach (var pair in new Dictionary<string, string> { ["Description"] = "Vale", ["Value"] = "300.00", ["Date"] = "2026-11-01", ["ReferenceYear"] = "2026", ["ReferenceMonth"] = "11", ["AllowPartialDiscount"] = "true" }) form.Add(new StringContent(pair.Value), pair.Key);
        (await client.PostAsync($"/api/employee-payments/people/{h.Person.Id}/vouchers", form)).StatusCode.Should().Be(HttpStatusCode.Created);
        h.Vouchers.Single().TotalValue.Should().Be(300);
        h.Vouchers.Single().AllowPartialDiscount.Should().BeTrue();
    }

    [Fact]
    public async Task EmployeeExportNeverIncludesContractorSnapshots()
    {
        var h = new PaymentHarness();
        h.Calculations.Add(new() { EmploymentType = EmploymentType.Employee });
        h.Calculations.Add(new() { EmploymentType = EmploymentType.Contractor });
        var pdf = new Mock<IPdfReportService>();
        pdf.Setup(x => x.BuildPaymentsReportPdf(It.Is<IEnumerable<PaymentCalculation>>(rows => rows.Count() == 1 && rows.All(r => r.EmploymentType == EmploymentType.Employee)), false, null, null, null, It.IsAny<string>())).Returns([1, 2, 3]);
        var service = new PaymentApplicationService(h.Repository.Object, pdf.Object);
        (await service.ExportEmployeePaymentsAsync(null, null, null, null, false, default)).Content.Should().Equal([1, 2, 3]);
        pdf.VerifyAll();
    }

    [Fact]
    public async Task EmployeeRulesExposeOnlyBonusSettingsAndCannotChangeContractorRules()
    {
        var h = new PaymentHarness(); h.Rules.ContractorDsrValue = 80;
        using var host = await PaymentApiTests.Host(h); using var client = host.GetTestClient();
        using var json = System.Text.Json.JsonDocument.Parse(await client.GetStringAsync("/api/employee-payments/rules"));
        var rule = json.RootElement[0];
        rule.GetProperty("fullAbsenceValue").GetDecimal().Should().Be(100);
        rule.TryGetProperty("contractorDsrValue", out _).Should().BeFalse();
        rule.TryGetProperty("contractorFirstFortnightPercent", out _).Should().BeFalse();
        (await client.PostAsJsonAsync("/api/employee-payments/rules", new { contractorDsrValue = 0 })).StatusCode.Should().Be(HttpStatusCode.MethodNotAllowed);
        h.Rules.ContractorDsrValue.Should().Be(80);
    }
    private static MultipartFormDataContent CalculationForm(Guid id)
    {
        var form = new MultipartFormDataContent();
        foreach (var pair in new Dictionary<string, string> { ["PaymentPersonId"] = id.ToString(), ["CompetenceYear"] = "2026", ["CompetenceMonth"] = "11", ["Fortnight"] = "1", ["AccountantAmount"] = "800" }) form.Add(new StringContent(pair.Value), pair.Key);
        return form;
    }
}
