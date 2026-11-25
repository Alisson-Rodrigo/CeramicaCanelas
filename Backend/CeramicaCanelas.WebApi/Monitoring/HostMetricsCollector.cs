using System.Runtime.InteropServices;
using Microsoft.Extensions.Options;

namespace CeramicaCanelas.WebApi.Monitoring;

public sealed class ServerStatusOptions
{
    public const string Section = "ServerStatus";
    public string? BackupStatusPath { get; set; }
    public int SampleIntervalSeconds { get; set; } = 10;
    public int BackupStaleAfterHours { get; set; } = 30;
    public int BackupRunningStaleAfterHours { get; set; } = 3;
}

public sealed record HostMetricsSnapshot(string Source, bool IsSimulated,
    DateTimeOffset? MeasuredAt, double? CpuUsagePercent, string CpuStatus, MemoryMeasurement? Memory);

public sealed class HostMetricsCollector(
    IHostMetricsProvider provider, IOptions<ServerStatusOptions> settings,
    TimeProvider clock, ILogger<HostMetricsCollector> logger) : BackgroundService
{
    private HostMetricsSnapshot _snapshot = new(provider.Source, false, null, null,
        provider.Source == "unavailable" ? "unavailable" : "warmingUp", null);
    private CpuCounters? _previousCpu;
    private readonly TimeSpan _interval = TimeSpan.FromSeconds(settings.Value.SampleIntervalSeconds);

    public HostMetricsSnapshot Latest
    {
        get
        {
            var current = Volatile.Read(ref _snapshot);
            return current.MeasuredAt is { } measured && clock.GetUtcNow() - measured > _interval * 3
                ? current with { CpuUsagePercent = null, CpuStatus = "unavailable", Memory = null }
                : current;
        }
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await Task.Yield();
        using var timer = new PeriodicTimer(_interval, clock);
        try
        {
            do
            {
                var counters = await TryRead(provider.ReadCpu, "CPU", stoppingToken);
                var cpu = counters.HasValue && _previousCpu.HasValue
                    ? CpuCounters.Usage(_previousCpu.Value, counters.Value) : null;
                var cpuStatus = !counters.HasValue ? "unavailable" : cpu.HasValue ? "available" : "warmingUp";
                _previousCpu = counters;
                var memory = await TryRead(provider.ReadMemory, "RAM", stoppingToken);
                var sampledAt = cpu.HasValue || memory is not null ? clock.GetUtcNow() : Latest.MeasuredAt;
                Volatile.Write(ref _snapshot, new(provider.Source, false, sampledAt, cpu, cpuStatus, memory));
            } while (await timer.WaitForNextTickAsync(stoppingToken));
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { }
    }

    private async ValueTask<T?> TryRead<T>(Func<CancellationToken, ValueTask<T?>> read, string metric, CancellationToken ct)
    {
        try { return await read(ct); }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException or ExternalException)
        {
            logger.LogDebug("Falha na coleta de {Metric}. Tipo={ErrorType}", metric, ex.GetType().Name);
            return default;
        }
    }
}
