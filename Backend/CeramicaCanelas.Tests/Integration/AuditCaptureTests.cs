using System.Security.Claims;
using CeramicaCanelas.Persistence;
using CeramicaCanelas.WebApi.Controllers;
using CeramicaCanelas.WebApi.Middleware;
using CeramicaCanelas.WebApi.Auditing;
using FluentAssertions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Controllers;
using Microsoft.AspNetCore.Mvc.Routing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Configuration;

namespace CeramicaCanelas.Tests.Integration;

public sealed class AuditCaptureTests
{
    [Fact]
    public async Task MutationCapturesAuthenticatedActorTrustedConnectionTimeAndResultWithoutPayload()
    {
        AuditEventData? captured = null;
        var context = new DefaultHttpContext();
        context.Request.Path = "/api/products";
        context.Request.Method = "POST";
        context.Request.QueryString = new QueryString("?password=supersecret");
        context.Connection.RemoteIpAddress = System.Net.IPAddress.Parse("192.0.2.3");
        context.User = new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, "user-42"), new Claim(ClaimTypes.Name, "Operador")
        }, "test"));
        context.SetEndpoint(EndpointFor("Products", "Create", "products"));
        context.Response.StatusCode = StatusCodes.Status201Created;
        var before = DateTime.UtcNow;
        var middleware = new AuditCaptureMiddleware(_ => Task.CompletedTask, NullLogger<AuditCaptureMiddleware>.Instance);
        context.RequestServices = new ServiceCollection().AddSingleton<IAuditEventWriter>(new DelegateWriter(x => captured = x)).BuildServiceProvider();

        await middleware.InvokeAsync(context);

        captured.Should().NotBeNull();
        captured!.ActorUserId.Should().Be("user-42");
        captured.ActorDisplayName.Should().Be("Operador");
        captured.IpAddress.Should().Be("192.0.2.3");
        captured.Outcome.Should().Be("Success");
        captured.OccurredAtUtc.Kind.Should().Be(DateTimeKind.Utc);
        captured.OccurredAtUtc.Should().BeOnOrAfter(before);
        captured.Route.Should().Be("products");
        System.Text.Json.JsonSerializer.Serialize(captured).Should().NotContain("supersecret");
    }

    [Fact]
    public async Task UnauthorizedAndServerFailuresAreCapturedAsSeparateCategories()
    {
        foreach (var (status, category) in new[] { (401, "SecurityAlert"), (500, "TechnicalDiagnostic") })
        {
            AuditEventData? captured = null;
            var context = new DefaultHttpContext(); context.Request.Path = "/api/products";
            context.Response.StatusCode = status; context.SetEndpoint(EndpointFor("Products", "Get", "products"));
            var middleware = new AuditCaptureMiddleware(_ => Task.CompletedTask, NullLogger<AuditCaptureMiddleware>.Instance);
            context.RequestServices = new ServiceCollection().AddSingleton<IAuditEventWriter>(new DelegateWriter(x => captured = x)).BuildServiceProvider();
            await middleware.InvokeAsync(context);
            captured.Should().NotBeNull(); captured!.Category.Should().Be(category); captured.Outcome.Should().Be("Failure");
        }
    }

    [Fact]
    public async Task FailedAuthenticatedWriteIsRecordedAsBusinessFailure()
    {
        AuditEventData? captured = null;
        var context = new DefaultHttpContext(); context.Request.Path = "/api/products"; context.Request.Method = "POST";
        context.User = new ClaimsPrincipal(new ClaimsIdentity(new[] { new Claim(ClaimTypes.NameIdentifier, "user-42") }, "test"));
        context.Response.StatusCode = 400; context.SetEndpoint(EndpointFor("Products", "Create", "products"));
        context.RequestServices = new ServiceCollection().AddSingleton<IAuditEventWriter>(new DelegateWriter(x => captured = x)).BuildServiceProvider();
        await new AuditCaptureMiddleware(_ => Task.CompletedTask, NullLogger<AuditCaptureMiddleware>.Instance).InvokeAsync(context);
        captured!.Category.Should().Be("BusinessAudit"); captured.Outcome.Should().Be("Failure");
    }

    [Fact]
    public async Task OrdinaryReadsAreNotAudited()
    {
        var calls = 0;
        var context = new DefaultHttpContext(); context.Request.Path = "/api/products"; context.Request.Method = "GET";
        context.Response.StatusCode = 200; context.SetEndpoint(EndpointFor("Products", "Get", "products"));
        context.RequestServices = new ServiceCollection().AddSingleton<IAuditEventWriter>(new DelegateWriter(_ => calls++)).BuildServiceProvider();
        await new AuditCaptureMiddleware(_ => Task.CompletedTask, NullLogger<AuditCaptureMiddleware>.Instance).InvokeAsync(context);
        calls.Should().Be(0);
    }

    [Fact]
    public async Task RelevantDownloadRecordsFormatAndTraceWithoutQuerySecrets()
    {
        AuditEventData? captured = null;
        var context = new DefaultHttpContext();
        context.Request.Path = "/api/sales/items/pdf"; context.Request.Method = "GET";
        context.Request.QueryString = new QueryString("?token=must-not-be-saved");
        context.TraceIdentifier = "trace-download-test";
        context.Response.ContentType = "application/pdf"; context.Response.StatusCode = StatusCodes.Status200OK;
        context.User = new ClaimsPrincipal(new ClaimsIdentity(new[] { new Claim(ClaimTypes.NameIdentifier, "user-42") }, "test"));
        context.SetEndpoint(EndpointFor("Sales", "GetProductItemsPdf", "sales/items/pdf"));
        context.RequestServices = new ServiceCollection().AddSingleton<IAuditEventWriter>(new DelegateWriter(x => captured = x)).BuildServiceProvider();

        await new AuditCaptureMiddleware(_ => Task.CompletedTask, NullLogger<AuditCaptureMiddleware>.Instance).InvokeAsync(context);

        captured.Should().NotBeNull();
        captured!.TechnicalContext.Should().Be("ExportFormat=PDF");
        captured.TraceId.Should().Be("trace-download-test");
        captured.Route.Should().Be("sales/items/pdf");
        System.Text.Json.JsonSerializer.Serialize(captured).Should().NotContain("must-not-be-saved");
    }

    [Fact]
    public void AuditAndAdminApisAreProtectedAndAuditRowsRejectMutation()
    {
        typeof(AuditAdministrationController).GetCustomAttributes(typeof(AuthorizeAttribute), true)
            .Cast<AuthorizeAttribute>().Should().Contain(x => x.Roles == "Admin");
        typeof(NotificationsController).GetCustomAttributes(typeof(AuthorizeAttribute), true)
            .Cast<AuthorizeAttribute>().Should().ContainSingle(x => string.IsNullOrEmpty(x.Roles));
        using var db = new DefaultContext(new DbContextOptionsBuilder<DefaultContext>().UseNpgsql("Host=localhost;Database=model_only;Username=model;Password=model").Options);
        var entry = new CeramicaCanelas.Domain.Entities.SystemAuditEvent { Action = "Create" };
        db.SystemAuditEvents.Attach(entry); db.Entry(entry).Property(x => x.Action).IsModified = true;
        var act = () => db.SaveChanges();
        act.Should().Throw<InvalidOperationException>().WithMessage("*imutáveis*");
    }

    [Theory]
    [InlineData(1, 25, true)]
    [InlineData(0, 25, false)]
    [InlineData(1, 101, false)]
    public void AuditFiltersValidateServerPagination(int page, int pageSize, bool expected) =>
        AuditQueryRules.IsValid(null, null, null, null, null, page, pageSize).Should().Be(expected);

    [Fact]
    public void AuditFilterRejectsInvalidRangeAndOversizedSearch()
    {
        AuditQueryRules.IsValid(DateTime.UtcNow, DateTime.UtcNow.AddDays(-1), null, null, null, 1, 25).Should().BeFalse();
        AuditQueryRules.IsValid(null, null, new string('x', 101), null, null, 1, 25).Should().BeFalse();
    }

    [Fact]
    public void NotificationsAreLimitedToRelevantWritesAndCriticalSecurityEvents()
    {
        AuditEventData Event(string category, string module, string method, string outcome, string severity) =>
            new(category, "CreatedLaunch", outcome, severity, module, "Launch", null, null, null, DateTime.UtcNow, null, method, null, null, null, null);
        AuditEventWriter.ShouldCreateNotification(Event("SecurityAlert", "API", "GET", "Failure", "High")).Should().BeTrue();
        AuditEventWriter.ShouldCreateNotification(Event("TechnicalDiagnostic", "API", "POST", "Failure", "Critical")).Should().BeTrue();
        AuditEventWriter.ShouldCreateNotification(new AuditEventData("BusinessAudit", "CreateUser", "Success", "Information", "Usuários", "Users", null, null, null, DateTime.UtcNow, null, "POST", null, 201, null, null)).Should().BeTrue();
        AuditEventWriter.ShouldCreateNotification(new AuditEventData("BusinessAudit", "GetUsers", "Success", "Information", "Usuários", "Users", null, null, null, DateTime.UtcNow, null, "GET", null, 200, null, null)).Should().BeFalse();
        AuditEventWriter.ShouldCreateNotification(new AuditEventData("BusinessAudit", "CreateSale", "Success", "Information", "Vendas", "Sales", null, null, null, DateTime.UtcNow, null, "POST", null, 201, null, null)).Should().BeTrue();
        AuditEventWriter.ShouldCreateNotification(new AuditEventData("BusinessAudit", "GetProductItemsPdf", "Success", "Information", "Vendas", "Sales", null, null, null, DateTime.UtcNow, null, "GET", null, 200, null, null)).Should().BeFalse();
        AuditEventWriter.ShouldCreateNotification(new AuditEventData("BusinessAudit", "MarkRead", "Success", "Information", "Notificações", "Notifications", null, null, null, DateTime.UtcNow, null, "PATCH", null, 204, null, null)).Should().BeFalse();
        AuditEventWriter.NotificationRoles(Event("BusinessAudit", "Almoxarifado", "POST", "Success", "Information"))
            .Should().BeEquivalentTo("Admin", "Almoxarifado");
        AuditEventWriter.NotificationRoles(Event("BusinessAudit", "Financeiro", "POST", "Success", "Information"))
            .Should().BeEquivalentTo("Admin", "Financial");
        AuditEventWriter.NotificationRoles(Event("SecurityAlert", "API", "GET", "Failure", "High"))
            .Should().Equal("Admin");
    }

    [Fact]
    public void BusinessCatalogBuildsPortugueseMessagesAndRejectsTechnicalOrUnmappedEvents()
    {
        AuditEventData Event(string module, string controller, string action, string method, string? technicalContext = null) =>
            new("BusinessAudit", action, "Success", "Information", module, controller, null, "user-1", "Ignored claim name", DateTime.UtcNow, null, method, null, 200, "trace", technicalContext);

        BusinessUpdateCatalog.TryCreate(Event("Financeiro", "Launch", "CreatedLaunch", "POST"), "Alisson", out var launch).Should().BeTrue();
        launch.Module.Should().Be("Financeiro");
        launch.Message.Should().Be("Alisson cadastrou um novo lançamento");
        BusinessUpdateCatalog.TryCreate(Event("Almoxarifado", "SupplierRepository", "UpdateSupplier", "PUT"), "Marina", out var supplier).Should().BeTrue();
        supplier.Message.Should().Be("Marina editou o cadastro de fornecedor");
        BusinessUpdateCatalog.TryCreate(Event("Vendas", "Sales", "DeleteSale", "DELETE"), "Carlos", out var sale).Should().BeTrue();
        sale.Message.Should().Be("Carlos excluiu uma venda");
        BusinessUpdateCatalog.TryCreate(Event("Pagamentos", "Payments", "CreateRules", "POST"), "Marina", out var payment).Should().BeTrue();
        payment.Message.Should().Be("Marina cadastrou regras de pagamento");
        BusinessUpdateCatalog.TryCreate(Event("Usuários", "Users", "CreateUser", "POST"), "Alisson", out var admin).Should().BeTrue();
        admin.Module.Should().Be("Administração");
        admin.Message.Should().Be("Alisson cadastrou um novo usuário");
        BusinessUpdateCatalog.TryCreate(Event("Vendas", "Sales", "GetProductItemsPdf", "GET", "ExportFormat=PDF"), "Carlos", out var download).Should().BeTrue();
        download.Message.Should().Be("Carlos baixou um relatório de itens de vendas em PDF");

        BusinessUpdateCatalog.TryCreate(Event("Almoxarifado", "Dashboard", "GetDashboardIndicators", "GET"), "Sistema", out _).Should().BeFalse();
        BusinessUpdateCatalog.TryCreate(Event("Almoxarifado", "Categories", "GetCategories", "GET"), "Sistema", out _).Should().BeFalse();
        BusinessUpdateCatalog.TryCreate(Event("Notificações", "Notifications", "MarkRead", "PATCH"), "Alisson", out _).Should().BeFalse();
        BusinessUpdateCatalog.TryCreate(Event("Vendas", "Sales", "UnknownMutation", "POST"), "Sistema", out _).Should().BeFalse();
        BusinessUpdateCatalog.TryCreate(Event("Vendas", "Sales", "GetProductItemsPdf", "GET", "ExportFormat=CSV"), "Carlos", out _).Should().BeFalse();
        BusinessUpdateCatalog.TryCreate(Event("API", "Dashboard", "GetDashboardIndicators", "GET"), "Sistema", out _).Should().BeFalse();
        var technicalEvent = Event("Vendas", "Sales", "CreateSale", "POST") with { Category = "TechnicalDiagnostic" };
        BusinessUpdateCatalog.TryCreate(technicalEvent, "Sistema", out _).Should().BeFalse();
    }

    [Fact]
    public void ResourceIdExtractionReadsOnlySafeIdScalarAndRejectsOversizedStrings()
    {
        AuditResourceIdFilter.ReadId(new SafeResource { Id = Guid.Parse("6b62d08c-2595-4b26-8914-3280dc791d3d"), Password = "secret" })
            .Should().Be("6b62d08c-2595-4b26-8914-3280dc791d3d");
        AuditResourceIdFilter.ReadId(new StringResource { Id = new string('x', 101) }).Should().BeNull();
    }

    [Fact]
    public async Task ForwardedIpIsAcceptedOnlyFromConfiguredTrustedProxy()
    {
        var trustedIp = await ForwardedIp("192.0.2.10", "192.0.2.10", "198.51.100.77");
        var untrustedIp = await ForwardedIp("192.0.2.10", "203.0.113.10", "198.51.100.77");
        var noProxyIp = await ForwardedIp(null, "203.0.113.10", "198.51.100.77");
        trustedIp.Should().Be("198.51.100.77");
        untrustedIp.Should().Be("203.0.113.10");
        noProxyIp.Should().Be("203.0.113.10");

        var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["ForwardedHeaders:KnownProxies:0"] = "192.0.2.10"
        }).Build();
        var options = TrustedForwardedHeadersOptions.Create(config);
        options.ForwardLimit.Should().Be(1);
        options.KnownProxies.Should().Contain(System.Net.IPAddress.Parse("192.0.2.10"));
        options.KnownNetworks.Should().BeEmpty();
    }

    private static async Task<string> ForwardedIp(string? trustedProxy, string actualProxy, string forwardedIp)
    {
        var settings = new Dictionary<string, string?>
        {
        };
        if (trustedProxy is not null) settings["ForwardedHeaders:KnownProxies:0"] = trustedProxy;
        var config = new ConfigurationBuilder().AddInMemoryCollection(settings).Build();
        using var server = new TestServer(new WebHostBuilder().Configure(app =>
        {
            app.Use(async (context, next) => { context.Connection.RemoteIpAddress = System.Net.IPAddress.Parse(actualProxy); await next(); });
            app.UseForwardedHeaders(TrustedForwardedHeadersOptions.Create(config));
            app.Run(context => context.Response.WriteAsync(context.Connection.RemoteIpAddress!.ToString()));
        }));
        using var client = server.CreateClient();
        using var request = new HttpRequestMessage(HttpMethod.Get, "/");
        request.Headers.Add("X-Forwarded-For", forwardedIp);
        return await (await client.SendAsync(request)).Content.ReadAsStringAsync();
    }

    private static Endpoint EndpointFor(string controller, string action, string route)
    {
        var descriptor = new ControllerActionDescriptor { ControllerName = controller, ActionName = action, AttributeRouteInfo = new AttributeRouteInfo { Template = route } };
        return new Endpoint(_ => Task.CompletedTask, new EndpointMetadataCollection(descriptor), "audit-test");
    }

    private sealed class DelegateWriter(Action<AuditEventData> capture) : IAuditEventWriter
    {
        public Task WriteAsync(AuditEventData data, CancellationToken cancellationToken = default) { capture(data); return Task.CompletedTask; }
    }
    private sealed class SafeResource { public Guid Id { get; init; } public string Password { get; init; } = string.Empty; }
    private sealed class StringResource { public string Id { get; init; } = string.Empty; }
}
