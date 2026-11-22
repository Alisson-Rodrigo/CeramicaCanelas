using System.Security.Claims;
using CeramicaCanelas.Domain.Entities;
using CeramicaCanelas.Persistence;
using CeramicaCanelas.WebApi.Auditing;
using CeramicaCanelas.WebApi.Controllers;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using System.IdentityModel.Tokens.Jwt;
using System.Text;
using System.Collections;
using Microsoft.IdentityModel.Tokens;

namespace CeramicaCanelas.Tests.Integration;

public sealed class RequiresAuditPostgresFactAttribute : FactAttribute
{
    public RequiresAuditPostgresFactAttribute()
    {
        if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("AUDIT_TEST_POSTGRES")))
            Skip = "Defina AUDIT_TEST_POSTGRES para executar contra um PostgreSQL descartável.";
    }
}

[CollectionDefinition("Audit PostgreSQL", DisableParallelization = true)]
public sealed class AuditPostgresCollection { }

[Collection("Audit PostgreSQL")]
public sealed class AuditPostgresIntegrationTests
{
    private static string ConnectionString => Environment.GetEnvironmentVariable("AUDIT_TEST_POSTGRES")!;

    private static DefaultContext OpenDb() => new(new DbContextOptionsBuilder<DefaultContext>().UseNpgsql(ConnectionString).Options);

    private static async Task EnsureDatabaseAsync()
    {
        await using var db = OpenDb();
        await db.Database.EnsureCreatedAsync();
    }

    [RequiresAuditPostgresFact]
    public async Task PostgreSqlAppliesAuditFiltersSortsAndPaginatesOnTheServer()
    {
        await EnsureDatabaseAsync();
        var marker = Guid.NewGuid().ToString("N");
        var actorId = $"audit-user-{marker}";
        var at = DateTime.UtcNow;
        await using (var db = OpenDb())
        {
            for (var i = 0; i < 3; i++) db.SystemAuditEvents.Add(new SystemAuditEvent
            {
                Category = "BusinessAudit", Action = i == 1 ? $"Update {marker}" : $"Create {marker}",
                Outcome = i == 1 ? "Failure" : "Success", Severity = "Information", Module = $"AuditIT_{marker}",
                ResourceType = "Product", ActorUserId = actorId, ActorDisplayName = "Integration User",
                OccurredAtUtc = at.AddMinutes(i)
            });
            await db.SaveChangesAsync();
        }

        await using var queryDb = OpenDb();
        var controller = new AuditAdministrationController(queryDb);
        controller.ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() };
        var pageResult = (OkObjectResult)await controller.Events(at.AddMinutes(-1), at.AddMinutes(5), actorId,
            $"AuditIT_{marker}", null, null, null, 1, 2, default);
        var items = ReadItems<SystemAuditEvent>(pageResult.Value);
        items.Should().HaveCount(2);
        items[0].OccurredAtUtc.Should().BeAfter(items[1].OccurredAtUtc);
        ReadValue<int>(pageResult.Value, "total").Should().Be(3);

        var filtered = (OkObjectResult)await controller.Events(null, null, actorId, $"AuditIT_{marker}",
            null, "Failure", marker, 1, 25, default);
        ReadItems<SystemAuditEvent>(filtered.Value).Should().ContainSingle();
        ReadValue<int>(filtered.Value, "total").Should().Be(1);
    }

    [RequiresAuditPostgresFact]
    public async Task PostgreSqlPersistsSecurityEventAndPerAdminNotificationAndAllowsReadStateOnly()
    {
        await EnsureDatabaseAsync();
        var adminId = $"audit-admin-{Guid.NewGuid():N}";
        var securityActorId = $"audit-security-actor-{Guid.NewGuid():N}";
        await using (var seed = OpenDb())
        {
            await AddAdminAsync(seed, adminId);
            await AddUserToRoleAsync(seed, securityActorId, "Viewer", "Auditoria Viewer");
        }

        var services = new ServiceCollection();
        services.AddLogging();
        services.AddDbContext<DefaultContext>(options => options.UseNpgsql(ConnectionString));
        services.AddSingleton<IAuditEventWriter, AuditEventWriter>();
        using var provider = services.BuildServiceProvider();
        var writer = provider.GetRequiredService<IAuditEventWriter>();
        var traceId = Guid.NewGuid().ToString("N");
        await writer.WriteAsync(new AuditEventData("SecurityAlert", "Forbidden", "Failure", "High", "Administração",
            "AuditAdministration", null, securityActorId, "must-not-be-saved@example.invalid", DateTime.UtcNow,
            "192.0.2.55", "GET", "api/admin/audit/events", 403, traceId, "AuthorizationOrAuthenticationFailure"));

        await using var verify = OpenDb();
        var audit = await verify.SystemAuditEvents.SingleAsync(x => x.TraceId == traceId);
        audit.ActorDisplayName.Should().Be("Auditoria Viewer");
        audit.ActorDisplayName.Should().NotContain("example.invalid");
        audit.IpAddress.Should().Be("192.0.2.55");
        audit.OccurredAtUtc.Kind.Should().Be(DateTimeKind.Utc);
        audit.Outcome.Should().Be("Failure");
        var notification = await verify.AdminNotifications.SingleAsync(x => x.AuditEventId == audit.Id && x.RecipientUserId == adminId);
        notification.Priority.Should().Be("High");
        notification.ReadAtUtc.Should().BeNull();

        var claims = new ClaimsPrincipal(new ClaimsIdentity(new[] { new Claim(ClaimTypes.NameIdentifier, adminId) }, "test"));
        var readController = new AuditAdministrationController(verify)
        {
            ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext { User = claims } }
        };
        (await readController.MarkRead(notification.Id, default)).Should().BeOfType<NoContentResult>();
        notification.ReadAtUtc.Should().NotBeNull();
    }

    [RequiresAuditPostgresFact]
    public async Task PostgreSqlDeliversBusinessUpdatesByModuleRoleAndEnforcesRecipientOwnership()
    {
        await EnsureDatabaseAsync();
        var suffix = Guid.NewGuid().ToString("N");
        var adminId = $"updates-admin-{suffix}";
        var salesId = $"updates-sales-{suffix}";
        var financeId = $"updates-finance-{suffix}";
        var inventoryId = $"updates-inventory-{suffix}";
        await using (var seed = OpenDb())
        {
            await AddUserToRoleAsync(seed, adminId, "Admin");
            await AddUserToRoleAsync(seed, salesId, "Sales", "Operador de vendas");
            await AddUserToRoleAsync(seed, financeId, "Financial");
            await AddUserToRoleAsync(seed, inventoryId, "Almoxarifado");
        }

        var services = new ServiceCollection();
        services.AddLogging();
        services.AddDbContext<DefaultContext>(options => options.UseNpgsql(ConnectionString));
        services.AddSingleton<IAuditEventWriter, AuditEventWriter>();
        using var provider = services.BuildServiceProvider();
        var traceId = Guid.NewGuid().ToString("N");
        await provider.GetRequiredService<IAuditEventWriter>().WriteAsync(new AuditEventData(
            "BusinessAudit", "CreateSale", "Success", "Information", "Vendas", "Sales", "sale-42",
            salesId, "Operador de vendas", DateTime.UtcNow, "192.0.2.15", "POST", "api/sales", 201, traceId, null));

        await using var verify = OpenDb();
        var eventId = await verify.SystemAuditEvents.Where(x => x.TraceId == traceId).Select(x => x.Id).SingleAsync();
        var ownNotification = await verify.AdminNotifications.SingleAsync(n => n.AuditEventId == eventId && n.RecipientUserId == salesId);
        ownNotification.ReadAtUtc.Should().NotBeNull();
        // Simula uma notificação antiga que foi gravada como não lida pelo comportamento anterior.
        ownNotification.ReadAtUtc = null;
        foreach (var (category, controllerName, actionName, module) in new[]
        {
            ("BusinessAudit", "Dashboard", "GetDashboardIndicators", "Almoxarifado"),
            ("TechnicalDiagnostic", "Dashboard", "GetDashboardIndicators", "Almoxarifado")
        })
        {
            var noise = new SystemAuditEvent
            {
                Category = category, Action = actionName, Outcome = "Success", Severity = "Information",
                Module = module, ResourceType = controllerName, ActorDisplayName = null, HttpMethod = "GET",
                OccurredAtUtc = DateTime.UtcNow
            };
            verify.SystemAuditEvents.Add(noise);
            verify.AdminNotifications.Add(new AdminNotification
            {
                AuditEventId = noise.Id, RecipientUserId = adminId, Title = "Sistema",
                Message = "GetDashboardIndicators · Dashboard", Origin = module
            });
        }
        await verify.SaveChangesAsync();
        var recipients = await verify.AdminNotifications.Where(n => n.AuditEventId == eventId).Select(n => n.RecipientUserId).ToListAsync();
        recipients.Should().Contain(adminId).And.Contain(salesId).And.Contain(financeId);
        recipients.Should().NotContain(inventoryId);

        var salesClaims = new ClaimsPrincipal(new ClaimsIdentity(new[] { new Claim(ClaimTypes.NameIdentifier, salesId) }, "test"));
        var controller = new NotificationsController(verify)
        {
            ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext { User = salesClaims } }
        };
        var page = (OkObjectResult)await controller.Get(false, 1, 25, default);
        ReadValue<int>(page.Value, "total").Should().Be(1);
        ReadValue<int>(page.Value, "unread").Should().Be(0);
        var pageItems = (IEnumerable)page.Value!.GetType().GetProperty("items")!.GetValue(page.Value)!;
        var update = pageItems.Cast<object>().Single();
        ReadValue<string>(update, "Message").Should().Be("Operador de vendas cadastrou uma nova venda");
        ReadValue<string>(update, "Module").Should().Be("Vendas");
        update.GetType().GetProperty("action").Should().BeNull();
        ReadValue<DateTime?>(update, "ReadAtUtc").Should().NotBeNull();
        var notificationId = await verify.AdminNotifications.Where(n => n.AuditEventId == eventId && n.RecipientUserId == salesId).Select(n => n.Id).SingleAsync();
        (await verify.AdminNotifications.SingleAsync(n => n.Id == notificationId)).ReadAtUtc.Should().BeNull();
        (await controller.MarkRead(notificationId, default)).Should().BeOfType<NoContentResult>();
        (await verify.AdminNotifications.SingleAsync(n => n.Id == notificationId)).ReadAtUtc.Should().NotBeNull();
        var financeNotificationId = await verify.AdminNotifications.Where(n => n.AuditEventId == eventId && n.RecipientUserId == financeId).Select(n => n.Id).SingleAsync();
        (await controller.MarkRead(financeNotificationId, default)).Should().BeOfType<NotFoundResult>();
        var financeController = new NotificationsController(verify)
        {
            ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(new ClaimsIdentity(new[] { new Claim(ClaimTypes.NameIdentifier, financeId) }, "test")) } }
        };
        ReadValue<int>(((OkObjectResult)await financeController.Get(true, 1, 25, default)).Value, "unread").Should().Be(1);
        var adminController = new NotificationsController(verify)
        {
            ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(new ClaimsIdentity(new[] { new Claim(ClaimTypes.NameIdentifier, adminId) }, "test")) } }
        };
        var adminPage = (OkObjectResult)await adminController.Get(false, 1, 25, default);
        ReadValue<int>(adminPage.Value, "total").Should().Be(1);
        var adminItems = (IEnumerable)adminPage.Value!.GetType().GetProperty("items")!.GetValue(adminPage.Value)!;
        var adminUpdate = adminItems.Cast<object>().Single();
        ReadValue<string>(adminUpdate, "Message").Should().Be("Operador de vendas cadastrou uma nova venda");
    }

    [RequiresAuditPostgresFact]
    public async Task PostgreSqlRetentionRemovesExpiredAuditAndNotificationRowsOnly()
    {
        await EnsureDatabaseAsync();
        var old = new SystemAuditEvent
        {
            Category = "TechnicalDiagnostic", Action = "Expired", Outcome = "Failure", Severity = "Critical",
            Module = "AuditRetentionIT", ResourceType = "API", OccurredAtUtc = DateTime.UtcNow.AddDays(-400),
            CreatedOn = DateTime.UtcNow.AddDays(-400), ModifiedOn = DateTime.UtcNow.AddDays(-400)
        };
        var recent = new SystemAuditEvent
        {
            Category = "BusinessAudit", Action = "Retained", Outcome = "Success", Severity = "Information",
            Module = "AuditRetentionIT", ResourceType = "API", OccurredAtUtc = DateTime.UtcNow,
            CreatedOn = DateTime.UtcNow, ModifiedOn = DateTime.UtcNow
        };
        await using (var db = OpenDb())
        {
            db.SystemAuditEvents.AddRange(old, recent);
            db.AdminNotifications.Add(new AdminNotification
            {
                AuditEventId = old.Id, RecipientUserId = "expired-admin", Title = "Expired", Message = "Expired",
                Origin = "AuditRetentionIT", CreatedOn = DateTime.UtcNow.AddDays(-400), ModifiedOn = DateTime.UtcNow.AddDays(-400)
            });
            await db.SaveChangesAsync();
        }

        var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?> { ["AuditRetention:Days"] = "365" }).Build();
        var retention = new AuditRetentionService(providerFactory(ConnectionString), config, NullLogger<AuditRetentionService>.Instance);
        await retention.StartAsync(default);
        try
        {
            var deadline = DateTime.UtcNow.AddSeconds(10);
            while (DateTime.UtcNow < deadline)
            {
                await using var check = OpenDb();
                if (!await check.SystemAuditEvents.AnyAsync(e => e.Id == old.Id)) break;
                await Task.Delay(100);
            }
        }
        finally { await retention.StopAsync(new CancellationTokenSource(TimeSpan.FromSeconds(3)).Token); }

        await using var final = OpenDb();
        (await final.SystemAuditEvents.AnyAsync(e => e.Id == old.Id)).Should().BeFalse();
        (await final.AdminNotifications.AnyAsync(n => n.AuditEventId == old.Id)).Should().BeFalse();
        (await final.SystemAuditEvents.AnyAsync(e => e.Id == recent.Id)).Should().BeTrue();
    }

    [RequiresAuditPostgresFact]
    public async Task AdminHttpEndpointsEnforceRolesAndExposeAuditedWriteAndSafeCsv()
    {
        var oldConnection = Environment.GetEnvironmentVariable("POSTGRESQL_CONN");
        Environment.SetEnvironmentVariable("POSTGRESQL_CONN", ConnectionString);
        try
        {
            using var factory = new WebApplicationFactory<CeramicaCanelas.WebApi.Program>().WithWebHostBuilder(builder =>
                builder.ConfigureTestServices(services => services.AddSingleton<IStartupFilter, TestRemoteIpStartupFilter>()));
            using var client = factory.CreateClient();
            using var scope = factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<DefaultContext>();
            await db.Database.EnsureCreatedAsync();
            var adminId = $"http-admin-{Guid.NewGuid():N}";
            var viewerId = $"http-viewer-{Guid.NewGuid():N}";
            await AddAdminAsync(db, adminId);
            await AddUserToRoleAsync(db, viewerId, "Viewer");

            var writer = scope.ServiceProvider.GetRequiredService<IAuditEventWriter>();
            var seedTrace = Guid.NewGuid().ToString("N");
            await writer.WriteAsync(new AuditEventData("SecurityAlert", "SeedAlert", "Failure", "High", "API", "Test", null,
                viewerId, "ignored-username@example.invalid", DateTime.UtcNow, "192.0.2.20", "GET", "api/test", 403, seedTrace, "Forbidden"));
            var notificationId = await db.AdminNotifications.Where(n => n.RecipientUserId == adminId)
                .Where(n => db.SystemAuditEvents.Any(e => e.Id == n.AuditEventId && e.TraceId == seedTrace)).Select(n => n.Id).SingleAsync();

            (await client.GetAsync("/api/admin/audit/events")).StatusCode.Should().Be(System.Net.HttpStatusCode.Unauthorized);
            (await client.GetAsync("/api/notifications")).StatusCode.Should().Be(System.Net.HttpStatusCode.Unauthorized);
            using var viewerClient = factory.CreateClient();
            viewerClient.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", CreateToken(viewerId, "Viewer"));
            (await viewerClient.GetAsync("/api/admin/audit/events")).StatusCode.Should().Be(System.Net.HttpStatusCode.Forbidden);
            (await viewerClient.GetAsync("/api/notifications")).StatusCode.Should().Be(System.Net.HttpStatusCode.OK);

            client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", CreateToken(adminId, "Admin"));
            var eventsResponse = await client.GetAsync("/api/admin/audit/events?page=1&pageSize=10");
            eventsResponse.StatusCode.Should().Be(System.Net.HttpStatusCode.OK);
            var notificationsResponse = await client.GetAsync("/api/admin/audit/notifications?unreadOnly=false");
            notificationsResponse.StatusCode.Should().Be(System.Net.HttpStatusCode.OK);
            using var notificationsJson = System.Text.Json.JsonDocument.Parse(await notificationsResponse.Content.ReadAsStringAsync());
            notificationsJson.RootElement.GetProperty("items").EnumerateArray().Should().Contain(n => n.GetProperty("id").GetGuid() == notificationId);

            var sensitiveMarker = "audit-body-secret-marker";
            using var patch = new HttpRequestMessage(HttpMethod.Patch, $"/api/admin/audit/notifications/{notificationId}/read")
            {
                Content = System.Net.Http.Json.JsonContent.Create(new { password = sensitiveMarker, token = sensitiveMarker, note = sensitiveMarker })
            };
            var patchResponse = await client.SendAsync(patch);
            patchResponse.StatusCode.Should().Be(System.Net.HttpStatusCode.NoContent);

            var auditUri = $"/api/admin/audit/events?userId={Uri.EscapeDataString(adminId)}&module=Administra%C3%A7%C3%A3o&action=MarkRead";
            var auditResponse = await client.GetAsync(auditUri);
            auditResponse.StatusCode.Should().Be(System.Net.HttpStatusCode.OK);
            var auditJson = await auditResponse.Content.ReadAsStringAsync();
            auditJson.Contains(sensitiveMarker).Should().BeFalse();
            var token = client.DefaultRequestHeaders.Authorization!.Parameter!;
            auditJson.Contains(token).Should().BeFalse();
            using var auditDoc = System.Text.Json.JsonDocument.Parse(auditJson);
            var eventRow = auditDoc.RootElement.GetProperty("items").EnumerateArray().Single();
            eventRow.GetProperty("actorUserId").GetString().Should().Be(adminId);
            eventRow.GetProperty("actorDisplayName").GetString().Should().Be("Auditoria Admin");
            eventRow.GetProperty("outcome").GetString().Should().Be("Success");
            eventRow.GetProperty("ipAddress").ValueKind.Should().NotBe(System.Text.Json.JsonValueKind.Null);
            DateTimeOffset.Parse(eventRow.GetProperty("occurredAtUtc").GetString()!).Offset.Should().Be(TimeSpan.Zero);

            var csvResponse = await client.GetAsync("/api/admin/audit/export");
            csvResponse.StatusCode.Should().Be(System.Net.HttpStatusCode.OK);
            csvResponse.Content.Headers.ContentType!.MediaType.Should().Be("text/csv");
            var csv = await csvResponse.Content.ReadAsStringAsync();
            csv.Contains(token).Should().BeFalse(); csv.Contains(sensitiveMarker).Should().BeFalse();
            var readNotification = await db.AdminNotifications.SingleAsync(n => n.Id == notificationId);
            readNotification.ReadAtUtc.Should().NotBeNull();
        }
        finally { Environment.SetEnvironmentVariable("POSTGRESQL_CONN", oldConnection); }
    }

    private static IServiceScopeFactory providerFactory(string connectionString)
    {
        var services = new ServiceCollection();
        services.AddDbContext<DefaultContext>(options => options.UseNpgsql(connectionString));
        return services.BuildServiceProvider().GetRequiredService<IServiceScopeFactory>();
    }

    private static async Task AddAdminAsync(DefaultContext db, string userId)
    {
        await AddUserToRoleAsync(db, userId, "Admin", "Auditoria Admin");
    }

    private static async Task AddUserToRoleAsync(DefaultContext db, string userId, string roleName, string displayName = "Auditoria Viewer")
    {
        var role = await db.Roles.SingleOrDefaultAsync(r => r.Name == roleName);
        if (role is null)
        {
            role = new IdentityRole { Id = Guid.NewGuid().ToString(), Name = roleName, NormalizedName = roleName.ToUpperInvariant() };
            db.Roles.Add(role);
        }
        var unique = Guid.NewGuid().ToString("N");
        var user = new User
        {
            Id = userId, Name = displayName, UserName = $"audit-{unique}",
            NormalizedUserName = $"AUDIT-{unique}", Email = $"audit-{unique}@example.invalid",
            NormalizedEmail = $"AUDIT-{unique}@EXAMPLE.INVALID", SecurityStamp = Guid.NewGuid().ToString()
        };
        db.Users.Add(user);
        db.UserRoles.Add(new IdentityUserRole<string> { UserId = user.Id, RoleId = role.Id });
        await db.SaveChangesAsync();
    }

    private static string CreateToken(string userId, string role)
    {
        var key = Environment.GetEnvironmentVariable("JWT_SECRET")!;
        var token = new JwtSecurityToken(
            issuer: Environment.GetEnvironmentVariable("JWT_ISSUER"),
            audience: Environment.GetEnvironmentVariable("JWT_AUDIENCE"),
            claims: new[] { new Claim(ClaimTypes.NameIdentifier, userId), new Claim(ClaimTypes.Name, "integration-user"), new Claim(ClaimTypes.Role, role) },
            notBefore: DateTime.UtcNow.AddSeconds(-5), expires: DateTime.UtcNow.AddMinutes(5),
            signingCredentials: new SigningCredentials(new SymmetricSecurityKey(Encoding.ASCII.GetBytes(key)), SecurityAlgorithms.HmacSha256));
        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private sealed class TestRemoteIpStartupFilter : IStartupFilter
    {
        public Action<IApplicationBuilder> Configure(Action<IApplicationBuilder> next) => app =>
        {
            app.Use(async (context, proceed) =>
            {
                context.Connection.RemoteIpAddress = System.Net.IPAddress.Parse("203.0.113.50");
                await proceed();
            });
            next(app);
        };
    }

    private static List<T> ReadItems<T>(object? result) => (List<T>)result!.GetType().GetProperty("items")!.GetValue(result)!;
    private static T ReadValue<T>(object? result, string property) => (T)result!.GetType().GetProperty(property)!.GetValue(result)!;
}
