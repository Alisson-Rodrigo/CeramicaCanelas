using CeramicaCanelas.Persistence;
using Microsoft.EntityFrameworkCore;

namespace CeramicaCanelas.WebApi.Auditing;

public sealed class AuditRetentionService(IServiceScopeFactory scopeFactory, IConfiguration configuration, ILogger<AuditRetentionService> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                var retentionDays = Math.Clamp(configuration.GetValue("AuditRetention:Days", 365), 30, 3650);
                await using var scope = scopeFactory.CreateAsyncScope();
                var db = scope.ServiceProvider.GetRequiredService<DefaultContext>();
                var cutoff = DateTime.UtcNow.AddDays(-retentionDays);
                await db.AdminNotifications.Where(n => n.CreatedOn < cutoff).ExecuteDeleteAsync(stoppingToken);
                await db.SystemAuditEvents.Where(e => e.OccurredAtUtc < cutoff).ExecuteDeleteAsync(stoppingToken);
                await Task.Delay(TimeSpan.FromHours(24), stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { break; }
            catch (Exception ex)
            {
                logger.LogError("Auditoria retention cleanup falhou. ExceptionType={ExceptionType}", ex.GetType().Name);
                await Task.Delay(TimeSpan.FromHours(1), stoppingToken);
            }
        }
    }
}
