using System.Net;
using System.Security.Claims;
using System.Text.Encodings.Web;
using System.Text.Json;
using CeramicaCanelas.WebApi.Controllers;
using CeramicaCanelas.WebApi.Monitoring;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Xunit;

namespace CeramicaCanelas.Tests.Monitoring;

public sealed class ServerStatusAuthorizationTests
{
    [Theory]
    [InlineData(null, HttpStatusCode.Unauthorized)]
    [InlineData("User", HttpStatusCode.Forbidden)]
    [InlineData("Admin", HttpStatusCode.OK)]
    public async Task Status_requires_an_admin_and_is_not_cacheable(string? role, HttpStatusCode expected)
    {
        using var server = CreateServer();
        using var client = server.CreateClient();
        if (role is not null) client.DefaultRequestHeaders.Add("X-Test-Role", role);

        using var response = await client.GetAsync("/api/admin/server-status");

        Assert.Equal(expected, response.StatusCode);
        if (expected != HttpStatusCode.OK) return;
        Assert.True(response.Headers.CacheControl?.NoStore);
        using var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal(JsonValueKind.False, body.RootElement.GetProperty("metrics").GetProperty("isSimulated").ValueKind);
        Assert.Equal("missing", body.RootElement.GetProperty("backup").GetProperty("fileStatus").GetString());
    }

    [Fact]
    public async Task Status_does_not_accept_mutations()
    {
        using var server = CreateServer();
        using var client = server.CreateClient();
        client.DefaultRequestHeaders.Add("X-Test-Role", "Admin");

        using var response = await client.PostAsync("/api/admin/server-status", null);

        Assert.Equal(HttpStatusCode.MethodNotAllowed, response.StatusCode);
    }

    private static TestServer CreateServer() => new(new WebHostBuilder()
        .ConfigureServices(services =>
        {
            services.AddControllers().AddApplicationPart(typeof(ServerStatusController).Assembly);
            services.AddAuthentication("Test").AddScheme<AuthenticationSchemeOptions, TestAuthentication>("Test", _ => { });
            services.AddAuthorization(options => options.AddPolicy("AdminOnly", policy => policy.RequireRole("Admin")));
            services.AddSingleton(TimeProvider.System);
            services.Configure<ServerStatusOptions>(options =>
                options.BackupStatusPath = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString("N"), "backup-status.json"));
            services.AddSingleton<IHostMetricsProvider, UnavailableHostMetrics>();
            services.AddSingleton<HostMetricsCollector>();
            services.AddSingleton<BackupStatusReader>();
        })
        .Configure(app =>
        {
            app.UseRouting();
            app.UseAuthentication();
            app.UseAuthorization();
            app.UseEndpoints(endpoints => endpoints.MapControllers());
        }));

    private sealed class TestAuthentication(IOptionsMonitor<AuthenticationSchemeOptions> options, ILoggerFactory logger,
        UrlEncoder encoder) : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
    {
        protected override Task<AuthenticateResult> HandleAuthenticateAsync()
        {
            if (!Request.Headers.TryGetValue("X-Test-Role", out var role))
                return Task.FromResult(AuthenticateResult.NoResult());

            var identity = new ClaimsIdentity([new Claim(ClaimTypes.Role, role.ToString())], Scheme.Name);
            return Task.FromResult(AuthenticateResult.Success(new AuthenticationTicket(new ClaimsPrincipal(identity), Scheme.Name)));
        }
    }
}
