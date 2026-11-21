using System.Net;
using System.Net.Http.Json;
using System.Security.Claims;
using CeramicaCanelas.Application.Features.Payments;
using CeramicaCanelas.WebApi.Controllers;
using CeramicaCanelas.WebApi.Middleware;
using FluentAssertions;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
namespace CeramicaCanelas.Tests.Integration;
public sealed class PaymentApiTests
{
    internal static async Task<IHost> Host(PaymentHarness h) => await new HostBuilder().ConfigureWebHost(web => web.UseTestServer().ConfigureServices(s =>
    {
        s.AddSingleton<CeramicaCanelas.Application.Contracts.Persistance.Repositories.IPaymentRepository>(h.Repository.Object);
        s.AddSingleton<IPaymentApplicationService>(h.Service); s.AddAuthorization();
        s.AddControllers().AddApplicationPart(typeof(PaymentsController).Assembly);
    }).Configure(app =>
    {
        app.UseMiddleware<CustomExceptionMiddleware>(); app.UseRouting();
        app.Use(async (context, next) => { context.User = new ClaimsPrincipal(new ClaimsIdentity(new[] { new Claim(ClaimTypes.NameIdentifier, "api-user"), new Claim(ClaimTypes.Role, "Financial") }, "Test")); await next(); });
        app.UseAuthorization(); app.UseEndpoints(e => e.MapControllers());
    })).StartAsync();
    [Fact]
    public async Task ApiRegistersAbsenceAndRejectsDuplicateAndAuditsActor()
    {
        var h = new PaymentHarness(); using var host = await Host(h); using var client = host.GetTestClient();
        var url = $"/api/payments/people/{h.Person.Id}/absences";
        (await client.PostAsJsonAsync(url, new AbsenceRequest(new(2026, 11, 2), false, "Teste"))).StatusCode.Should().Be(HttpStatusCode.OK);
        (await client.PostAsJsonAsync(url, new AbsenceRequest(new(2026, 11, 2), true, "Duplicada"))).StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var abs = await client.GetFromJsonAsync<List<AbsenceDto>>(url + "?year=2026&month=11"); abs.Should().ContainSingle(); abs![0].RecordedBy.Should().Be("api-user");
    }
    [Fact]
    public async Task ApiCalculatesContractorFromMultipartForm()
    {
        var h = new PaymentHarness(); using var host = await Host(h); using var client = host.GetTestClient();
        using var form = Form(h); var response = await client.PostAsync("/api/payments/calculations/preview", form);
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        (await response.Content.ReadFromJsonAsync<PaymentPreviewDto>())!.NetValue.Should().Be(1500);
    }
    [Theory]
    [InlineData("CompetenceMonth", "13")]
    [InlineData("Fortnight", "9")]
    [InlineData("FullAbsences", "1")]
    [InlineData("BonusValue", "100")]
    public async Task ApiRejectsInvalidForms(string key, string value)
    {
        var h = new PaymentHarness(); using var host = await Host(h); using var client = host.GetTestClient(); using var form = Form(h, key, value);
        (await client.PostAsync("/api/payments/calculations/preview", form)).StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }
    [Fact]
    public async Task ApiEmployeeFirstRequiresAccountantValue()
    {
        var h = new PaymentHarness(); h.Person.EmploymentType = CeramicaCanelas.Domain.Enums.Payments.EmploymentType.Employee;
        using var host = await Host(h); using var client = host.GetTestClient(); using var form = Form(h);
        (await client.PostAsync("/api/payments/calculations", form)).StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }
    [Fact]
    public async Task ApiRejectsNegativeRegisteredBonus()
    {
        var h = new PaymentHarness(); using var host = await Host(h); using var client = host.GetTestClient();
        using var form = new MultipartFormDataContent(); form.Add(new StringContent("Teste"), "Name"); form.Add(new StringContent("2"), "EmploymentType"); form.Add(new StringContent("3000"), "MonthlyValue"); form.Add(new StringContent("-1"), "MonthlyBonus");
        (await client.PostAsync("/api/payments/people", form)).StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }
    private static MultipartFormDataContent Form(PaymentHarness h, string? key = null, string? value = null)
    {
        var values = new Dictionary<string, string> { { "PaymentPersonId", h.Person.Id.ToString() }, { "CompetenceYear", "2026" }, { "CompetenceMonth", "11" }, { "Fortnight", "1" } };
        if (key != null) values[key] = value!; var form = new MultipartFormDataContent(); foreach (var pair in values) form.Add(new StringContent(pair.Value), pair.Key); return form;
    }
}
