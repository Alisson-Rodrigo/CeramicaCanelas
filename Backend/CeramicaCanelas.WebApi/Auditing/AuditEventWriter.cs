using CeramicaCanelas.Domain.Entities;
using CeramicaCanelas.Persistence;
using Microsoft.EntityFrameworkCore;

namespace CeramicaCanelas.WebApi.Auditing;

public sealed record AuditEventData(
    string Category, string Action, string Outcome, string Severity, string Module,
    string ResourceType, string? ResourceId, string? ActorUserId, string? ActorDisplayName,
    DateTime OccurredAtUtc, string? IpAddress, string? HttpMethod, string? Route,
    int? StatusCode, string? TraceId, string? TechnicalContext);

public interface IAuditEventWriter
{
    Task WriteAsync(AuditEventData data, CancellationToken cancellationToken = default);
}

public sealed class AuditEventWriter(IServiceScopeFactory scopeFactory, ILogger<AuditEventWriter> logger) : IAuditEventWriter
{
    public async Task WriteAsync(AuditEventData data, CancellationToken cancellationToken = default)
    {
        try
        {
            await using var scope = scopeFactory.CreateAsyncScope();
            var db = scope.ServiceProvider.GetRequiredService<DefaultContext>();
            var actorDisplayName = string.IsNullOrWhiteSpace(data.ActorUserId)
                ? null
                : await db.Users.AsNoTracking().Where(u => u.Id == data.ActorUserId).Select(u => u.Name).FirstOrDefaultAsync(cancellationToken);
            var audit = new SystemAuditEvent
            {
                Category = data.Category, Action = data.Action, Outcome = data.Outcome,
                Severity = data.Severity, Module = data.Module, ResourceType = data.ResourceType,
                ResourceId = Clip(data.ResourceId, 100), ActorUserId = Clip(data.ActorUserId, 450),
                ActorDisplayName = Clip(actorDisplayName, 160), OccurredAtUtc = DateTime.SpecifyKind(data.OccurredAtUtc, DateTimeKind.Utc),
                IpAddress = Clip(data.IpAddress, 45), HttpMethod = Clip(data.HttpMethod, 10),
                Route = Clip(data.Route, 300), StatusCode = data.StatusCode,
                TraceId = Clip(data.TraceId, 64), TechnicalContext = Clip(data.TechnicalContext, 300)
            };
            db.SystemAuditEvents.Add(audit);
            if (ShouldCreateNotification(data))
            {
                var isBusinessUpdate = BusinessUpdateCatalog.TryCreate(data, actorDisplayName, out var businessUpdate);
                var recipientRoles = NotificationRoles(data);
                var recipients = await db.Users.AsNoTracking()
                    .Where(u => db.UserRoles.Any(ur => ur.UserId == u.Id && db.Roles.Any(r => r.Id == ur.RoleId && recipientRoles.Contains(r.Name!))))
                    .Select(u => u.Id).Distinct().ToListAsync(cancellationToken);
                foreach (var recipient in recipients)
                    db.AdminNotifications.Add(new AdminNotification
                    {
                        AuditEventId = audit.Id, RecipientUserId = recipient,
                        Priority = data.Category == "SecurityAlert" || data.Outcome == "Failure" ? "High" : "Normal",
                        Title = isBusinessUpdate ? $"Atualização em {businessUpdate.Module}" : NotificationTitle(data),
                        Message = isBusinessUpdate ? businessUpdate.Message : $"{data.Action} · {data.Module}",
                        Origin = isBusinessUpdate ? businessUpdate.Module : data.Module,
                        ReadAtUtc = recipient == data.ActorUserId ? DateTime.SpecifyKind(data.OccurredAtUtc, DateTimeKind.Utc) : null
                    });
            }
            await db.SaveChangesAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            // Caminho técnico de contingência: somente tipo da exceção e trace id, nunca mensagem/corpo.
            logger.LogError("Falha ao persistir evento de auditoria. Category={Category} TraceId={TraceId} ExceptionType={ExceptionType}", data.Category, data.TraceId, ex.GetType().Name);
        }
    }

    public static bool ShouldCreateNotification(AuditEventData d) =>
        d.Category == "SecurityAlert" || d.Outcome == "Failure" && d.Severity == "Critical" ||
        BusinessUpdateCatalog.TryCreate(d, d.ActorDisplayName, out _);

    public static string[] NotificationRoles(AuditEventData d) => d.Category == "SecurityAlert" || d.Category == "TechnicalDiagnostic"
        ? ["Admin"]
        : d.Module switch
        {
            "Almoxarifado" => ["Admin", "Almoxarifado"],
            "Vendas" => ["Admin", "Sales", "Financial"],
            "Financeiro" or "Pagamentos" => ["Admin", "Financial"],
            "Usuários" or "Administração" => ["Admin"],
            _ => ["Admin"]
        };
    private static string NotificationTitle(AuditEventData d) => d.Category == "SecurityAlert" ? "Alerta de segurança" : d.Severity == "Critical" ? "Falha crítica" : "Alteração administrativa";
    private static string? Clip(string? value, int length) => string.IsNullOrWhiteSpace(value) ? null : value[..Math.Min(value.Length, length)];
}
